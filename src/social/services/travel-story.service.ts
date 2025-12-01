import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateTravelStoryDto,
  UpdateTravelStoryDto,
  TravelStoryResponseDto,
  CommentDto,
} from '../dto/index.js';

@Injectable()
export class TravelStoryService {
  private readonly logger = new Logger(TravelStoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create travel story
   */
  async createStory(
    dto: CreateTravelStoryDto,
    userId: number,
  ): Promise<TravelStoryResponseDto> {
    this.logger.log(`User ${userId} creating travel story`);

    const story = await this.prisma.travelStory.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        locationId: dto.locationId,
        itineraryId: dto.itineraryId,
        bookingId: dto.bookingId,
        photos: dto.photos || [],
        coverPhoto: dto.coverPhoto,
        visibility: dto.visibility,
        tags: dto.tags || [],
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
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await this.logActivity(userId, 'posted_story', { storyId: story.id });

    return this.mapToResponseDto(story, userId);
  }

  /**
   * Get stories feed
   */
  async getStories(
    userId?: number,
    locationId?: number,
  ): Promise<TravelStoryResponseDto[]> {
    const where: any = { isPublished: true };

    if (locationId) {
      where.locationId = locationId;
    }

    if (!userId) {
      where.visibility = 'PUBLIC';
    }

    const stories = await this.prisma.travelStory.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });

    return Promise.all(stories.map((s) => this.mapToResponseDto(s, userId)));
  }

  /**
   * Get single story
   */
  async getStory(storyId: number, userId?: number): Promise<TravelStoryResponseDto> {
    const story = await this.prisma.travelStory.findUnique({
      where: { id: storyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Increment views
    await this.prisma.travelStory.update({
      where: { id: storyId },
      data: { views: { increment: 1 } },
    });

    return this.mapToResponseDto(story, userId);
  }

  /**
   * Update story
   */
  async updateStory(
    storyId: number,
    dto: UpdateTravelStoryDto,
    userId: number,
  ): Promise<TravelStoryResponseDto> {
    const story = await this.prisma.travelStory.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.userId !== userId) {
      throw new ForbiddenException('You can only update your own stories');
    }

    const updated = await this.prisma.travelStory.update({
      where: { id: storyId },
      data: {
        title: dto.title,
        content: dto.content,
        photos: dto.photos,
        coverPhoto: dto.coverPhoto,
        visibility: dto.visibility,
        tags: dto.tags,
        isPublished: dto.isPublished,
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
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updated, userId);
  }

  /**
   * Delete story
   */
  async deleteStory(storyId: number, userId: number) {
    const story = await this.prisma.travelStory.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.userId !== userId) {
      throw new ForbiddenException('You can only delete your own stories');
    }

    await this.prisma.travelStory.delete({
      where: { id: storyId },
    });

    return { success: true };
  }

  /**
   * Like story
   */
  async likeStory(storyId: number, userId: number) {
    const existing = await this.prisma.storyLike.findUnique({
      where: {
        storyId_userId: {
          storyId,
          userId,
        },
      },
    });

    if (existing) {
      await this.prisma.storyLike.delete({ where: { id: existing.id } });
      await this.prisma.travelStory.update({
        where: { id: storyId },
        data: { likes: { decrement: 1 } },
      });
      return { liked: false };
    } else {
      await this.prisma.storyLike.create({
        data: { storyId, userId },
      });
      await this.prisma.travelStory.update({
        where: { id: storyId },
        data: { likes: { increment: 1 } },
      });
      return { liked: true };
    }
  }

  /**
   * Add comment
   */
  async addComment(storyId: number, dto: CommentDto, userId: number) {
    return this.prisma.storyComment.create({
      data: {
        storyId,
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
  }

  /**
   * Get comments
   */
  async getComments(storyId: number) {
    return this.prisma.storyComment.findMany({
      where: { storyId, parentId: null },
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
    story: any,
    userId?: number,
  ): Promise<TravelStoryResponseDto> {
    let hasLiked = false;

    if (userId) {
      const like = await this.prisma.storyLike.findUnique({
        where: {
          storyId_userId: {
            storyId: story.id,
            userId,
          },
        },
      });
      hasLiked = !!like;
    }

    return {
      id: story.id,
      userId: story.userId,
      username: `${story.user.firstName || ''} ${story.user.lastName || ''}`.trim(),
      userAvatar: story.user.avatar,
      title: story.title,
      content: story.content,
      locationId: story.locationId,
      locationName: story.location?.name,
      photos: story.photos,
      coverPhoto: story.coverPhoto,
      visibility: story.visibility,
      tags: story.tags,
      views: story.views,
      likes: story.likes,
      isPublished: story.isPublished,
      publishedAt: story.publishedAt,
      createdAt: story.createdAt,
      hasLiked,
    };
  }
}
