import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  SendFriendRequestDto,
  FriendshipResponseDto,
  UserActivityResponseDto,
} from '../dto/index.js';

@Injectable()
export class FriendshipService {
  private readonly logger = new Logger(FriendshipService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send friend request
   */
  async sendFriendRequest(dto: SendFriendRequestDto, userId: number) {
    if (dto.friendId === userId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if friendship already exists
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId: dto.friendId },
          { userId: dto.friendId, friendId: userId },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('Friendship already exists');
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        userId,
        friendId: dto.friendId,
        status: 'pending',
        requestedBy: userId,
      },
      include: {
        friend: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.log(`Friend request sent from ${userId} to ${dto.friendId}`);

    return this.mapToResponseDto(friendship);
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(friendshipId: number, userId: number) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.friendId !== userId) {
      throw new BadRequestException('You can only accept requests sent to you');
    }

    const updated = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'accepted' },
      include: {
        friend: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.log(`Friend request ${friendshipId} accepted`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Reject/Remove friendship
   */
  async removeFriendship(friendshipId: number, userId: number) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    if (friendship.userId !== userId && friendship.friendId !== userId) {
      throw new BadRequestException('You are not part of this friendship');
    }

    await this.prisma.friendship.delete({
      where: { id: friendshipId },
    });

    return { success: true };
  }

  /**
   * Get friends
   */
  async getFriends(userId: number): Promise<FriendshipResponseDto[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
        status: 'accepted',
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
        friend: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return friendships.map((f) => {
      const isFriend = f.friendId === userId;
      const friend = isFriend ? f.user : f.friend;
      return {
        id: f.id,
        userId: f.userId,
        friendId: f.friendId,
        friendUsername: `${friend.firstName || ''} ${friend.lastName || ''}`.trim(),
        friendAvatar: friend.avatar || undefined,
        status: f.status,
        requestedBy: f.requestedBy,
        createdAt: f.createdAt,
      };
    });
  }

  /**
   * Get pending friend requests
   */
  async getPendingRequests(userId: number): Promise<FriendshipResponseDto[]> {
    const requests = await this.prisma.friendship.findMany({
      where: {
        friendId: userId,
        status: 'pending',
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

    return requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      friendId: r.friendId,
      friendUsername: `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim(),
      friendAvatar: r.user.avatar || undefined,
      status: r.status,
      requestedBy: r.requestedBy,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Get activity feed (user + friends)
   */
  async getActivityFeed(userId: number): Promise<UserActivityResponseDto[]> {
    // Get friend IDs
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
        status: 'accepted',
      },
    });

    const friendIds = friendships.map((f) =>
      f.userId === userId ? f.friendId : f.userId,
    );

    // Get activities
    const activities = await this.prisma.userActivity.findMany({
      where: {
        userId: { in: [userId, ...friendIds] },
        visibility: { in: ['PUBLIC', 'FRIENDS_ONLY'] },
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
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return activities.map((a) => ({
      id: a.id,
      userId: a.userId,
      username: `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim(),
      userAvatar: a.user.avatar || undefined,
      activityType: a.activityType,
      metadata: a.metadata,
      visibility: a.visibility,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(friendship: any): FriendshipResponseDto {
    return {
      id: friendship.id,
      userId: friendship.userId,
      friendId: friendship.friendId,
      friendUsername: `${friendship.friend.firstName || ''} ${friendship.friend.lastName || ''}`.trim(),
      friendAvatar: friendship.friend.avatar,
      status: friendship.status,
      requestedBy: friendship.requestedBy,
      createdAt: friendship.createdAt,
    };
  }
}
