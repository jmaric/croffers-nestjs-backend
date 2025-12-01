import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class SendFriendRequestDto {
  @ApiProperty({ description: 'User ID to send friend request to', example: 5 })
  @IsInt()
  friendId: number;
}

export class FriendshipResponseDto {
  @ApiProperty({ description: 'Friendship ID' })
  id: number;

  @ApiProperty({ description: 'User ID' })
  userId: number;

  @ApiProperty({ description: 'Friend ID' })
  friendId: number;

  @ApiProperty({ description: 'Friend username' })
  friendUsername: string;

  @ApiProperty({ description: 'Friend avatar' })
  friendAvatar?: string;

  @ApiProperty({ description: 'Status (pending, accepted, blocked)' })
  status: string;

  @ApiProperty({ description: 'Requested by user ID' })
  requestedBy: number;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

export class UserActivityResponseDto {
  @ApiProperty({ description: 'Activity ID' })
  id: number;

  @ApiProperty({ description: 'User ID' })
  userId: number;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'User avatar' })
  userAvatar?: string;

  @ApiProperty({ description: 'Activity type' })
  activityType: string;

  @ApiProperty({ description: 'Activity metadata' })
  metadata?: any;

  @ApiProperty({ description: 'Visibility' })
  visibility: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}
