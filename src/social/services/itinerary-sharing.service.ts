import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ShareItineraryDto,
  UpdateSharedItineraryDto,
  AddCollaboratorDto,
  CommentDto,
  SharedItineraryResponseDto,
} from '../dto/index.js';

@Injectable()
export class ItinerarySharingService {
  private readonly logger = new Logger(ItinerarySharingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Share an itinerary
   */
  async shareItinerary(
    dto: ShareItineraryDto,
    userId: number,
  ): Promise<SharedItineraryResponseDto> {
    this.logger.log(`User ${userId} sharing itinerary ${dto.itineraryId}`);

    // Verify itinerary exists and belongs to user
    const itinerary = await this.prisma.tripItinerary.findUnique({
      where: { id: dto.itineraryId },
    });

    if (!itinerary) {
      throw new NotFoundException('Itinerary not found');
    }

    if (itinerary.userId !== userId) {
      throw new ForbiddenException('You can only share your own itineraries');
    }

    // Check if already shared
    const existing = await this.prisma.sharedItinerary.findFirst({
      where: {
        itineraryId: dto.itineraryId,
        sharedBy: userId,
        isActive: true,
      },
    });

    if (existing) {
      throw new BadRequestException('Itinerary already shared');
    }

    const shared = await this.prisma.sharedItinerary.create({
      data: {
        itineraryId: dto.itineraryId,
        sharedBy: userId,
        visibility: dto.visibility,
        title: dto.title || itinerary.name,
        description: dto.description || itinerary.description,
        coverPhoto: dto.coverPhoto,
        tags: dto.tags || [],
        allowCollaboration: dto.allowCollaboration || false,
      },
      include: {
        itinerary: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Log activity
    await this.logActivity(userId, 'shared_itinerary', {
      itineraryId: dto.itineraryId,
      sharedItineraryId: shared.id,
    });

    return this.mapToResponseDto(shared, userId);
  }

  /**
   * Get shared itineraries feed
   */
  async getSharedItineraries(
    userId?: number,
    visibility?: string,
  ): Promise<SharedItineraryResponseDto[]> {
    const where: any = { isActive: true };

    if (visibility) {
      where.visibility = visibility;
    } else {
      // Default: show public and friends' itineraries
      where.OR = [
        { visibility: 'PUBLIC' },
        userId ? { sharedBy: userId } : {},
      ];
    }

    const shared = await this.prisma.sharedItinerary.findMany({
      where,
      include: {
        itinerary: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return Promise.all(
      shared.map((s) => this.mapToResponseDto(s, userId)),
    );
  }

  /**
   * Get shared itinerary by ID
   */
  async getSharedItinerary(
    shareId: number,
    userId?: number,
  ): Promise<SharedItineraryResponseDto> {
    const shared = await this.prisma.sharedItinerary.findUnique({
      where: { id: shareId },
      include: {
        itinerary: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!shared) {
      throw new NotFoundException('Shared itinerary not found');
    }

    // Check visibility permissions
    if (shared.visibility === 'PRIVATE' && shared.sharedBy !== userId) {
      throw new ForbiddenException('This itinerary is private');
    }

    // Increment views
    await this.prisma.sharedItinerary.update({
      where: { id: shareId },
      data: { views: { increment: 1 } },
    });

    return this.mapToResponseDto(shared, userId);
  }

  /**
   * Update shared itinerary
   */
  async updateSharedItinerary(
    shareId: number,
    dto: UpdateSharedItineraryDto,
    userId: number,
  ): Promise<SharedItineraryResponseDto> {
    const shared = await this.prisma.sharedItinerary.findUnique({
      where: { id: shareId },
      include: {
        itinerary: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!shared) {
      throw new NotFoundException('Shared itinerary not found');
    }

    if (shared.sharedBy !== userId) {
      throw new ForbiddenException('You can only update your own shared itineraries');
    }

    const updated = await this.prisma.sharedItinerary.update({
      where: { id: shareId },
      data: {
        visibility: dto.visibility,
        title: dto.title,
        description: dto.description,
        coverPhoto: dto.coverPhoto,
        tags: dto.tags,
        allowCollaboration: dto.allowCollaboration,
        isActive: dto.isActive,
      },
      include: {
        itinerary: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updated, userId);
  }

  /**
   * Delete (unshare) itinerary
   */
  async deleteSharedItinerary(shareId: number, userId: number) {
    const shared = await this.prisma.sharedItinerary.findUnique({
      where: { id: shareId },
    });

    if (!shared) {
      throw new NotFoundException('Shared itinerary not found');
    }

    if (shared.sharedBy !== userId) {
      throw new ForbiddenException('You can only delete your own shared itineraries');
    }

    await this.prisma.sharedItinerary.delete({
      where: { id: shareId },
    });

    this.logger.log(`Shared itinerary ${shareId} deleted`);

    return { success: true };
  }

  /**
   * Fork (copy) shared itinerary
   */
  async forkItinerary(shareId: number, userId: number) {
    const shared = await this.prisma.sharedItinerary.findUnique({
      where: { id: shareId },
      include: { itinerary: true },
    });

    if (!shared) {
      throw new NotFoundException('Shared itinerary not found');
    }

    // Create copy of itinerary
    const forked = await this.prisma.tripItinerary.create({
      data: {
        userId,
        name: `${shared.itinerary.name} (Copy)`,
        description: shared.itinerary.description,
        startDate: shared.itinerary.startDate,
        endDate: shared.itinerary.endDate,
        totalBudget: shared.itinerary.totalBudget,
        currency: shared.itinerary.currency,
        data: shared.itinerary.data as any,
        isPublic: false,
      },
    });

    // Increment fork count
    await this.prisma.sharedItinerary.update({
      where: { id: shareId },
      data: { forks: { increment: 1 } },
    });

    this.logger.log(`Itinerary ${shareId} forked to user ${userId}`);

    return { success: true, itineraryId: forked.id };
  }

  /**
   * Like shared itinerary
   */
  async likeItinerary(shareId: number, userId: number) {
    const existing = await this.prisma.itineraryLike.findUnique({
      where: {
        sharedItineraryId_userId: {
          sharedItineraryId: shareId,
          userId,
        },
      },
    });

    if (existing) {
      // Unlike
      await this.prisma.itineraryLike.delete({
        where: { id: existing.id },
      });

      await this.prisma.sharedItinerary.update({
        where: { id: shareId },
        data: { likes: { decrement: 1 } },
      });

      return { liked: false };
    } else {
      // Like
      await this.prisma.itineraryLike.create({
        data: {
          sharedItineraryId: shareId,
          userId,
        },
      });

      await this.prisma.sharedItinerary.update({
        where: { id: shareId },
        data: { likes: { increment: 1 } },
      });

      return { liked: true };
    }
  }

  /**
   * Add comment
   */
  async addComment(shareId: number, dto: CommentDto, userId: number) {
    const shared = await this.prisma.sharedItinerary.findUnique({
      where: { id: shareId },
    });

    if (!shared) {
      throw new NotFoundException('Shared itinerary not found');
    }

    const comment = await this.prisma.itineraryComment.create({
      data: {
        sharedItineraryId: shareId,
        userId,
        comment: dto.comment,
        parentId: dto.parentId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return comment;
  }

  /**
   * Get comments
   */
  async getComments(shareId: number) {
    return this.prisma.itineraryComment.findMany({
      where: {
        sharedItineraryId: shareId,
        parentId: null, // Top-level comments only
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add collaborator
   */
  async addCollaborator(shareId: number, dto: AddCollaboratorDto, userId: number) {
    const shared = await this.prisma.sharedItinerary.findUnique({
      where: { id: shareId },
    });

    if (!shared) {
      throw new NotFoundException('Shared itinerary not found');
    }

    if (shared.sharedBy !== userId) {
      throw new ForbiddenException('Only the owner can add collaborators');
    }

    if (!shared.allowCollaboration) {
      throw new BadRequestException('Collaboration is not enabled for this itinerary');
    }

    if (shared.collaborators.includes(dto.userId)) {
      throw new BadRequestException('User is already a collaborator');
    }

    await this.prisma.sharedItinerary.update({
      where: { id: shareId },
      data: {
        collaborators: {
          push: dto.userId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Log user activity
   */
  private async logActivity(userId: number, activityType: string, metadata: any) {
    await this.prisma.userActivity.create({
      data: {
        userId,
        activityType,
        metadata,
        visibility: 'PUBLIC',
      },
    });
  }

  /**
   * Map to response DTO
   */
  private async mapToResponseDto(
    shared: any,
    userId?: number,
  ): Promise<SharedItineraryResponseDto> {
    let hasLiked = false;

    if (userId) {
      const like = await this.prisma.itineraryLike.findUnique({
        where: {
          sharedItineraryId_userId: {
            sharedItineraryId: shared.id,
            userId,
          },
        },
      });
      hasLiked = !!like;
    }

    return {
      id: shared.id,
      itineraryId: shared.itineraryId,
      itineraryName: shared.itinerary.name,
      sharedBy: shared.sharedBy,
      sharedByUsername: `${shared.owner.firstName || ''} ${shared.owner.lastName || ''}`.trim(),
      visibility: shared.visibility,
      title: shared.title,
      description: shared.description,
      coverPhoto: shared.coverPhoto,
      tags: shared.tags,
      views: shared.views,
      likes: shared.likes,
      forks: shared.forks,
      allowCollaboration: shared.allowCollaboration,
      collaborators: shared.collaborators,
      isActive: shared.isActive,
      createdAt: shared.createdAt,
      hasLiked,
    };
  }
}
