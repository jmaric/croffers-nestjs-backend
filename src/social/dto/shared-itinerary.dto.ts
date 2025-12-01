import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsInt,
} from 'class-validator';
import { ShareVisibility } from '../../../generated/prisma/client/client.js';

export class ShareItineraryDto {
  @ApiProperty({ description: 'Itinerary ID to share', example: 1 })
  @IsInt()
  itineraryId: number;

  @ApiProperty({
    description: 'Visibility setting',
    enum: ShareVisibility,
    example: ShareVisibility.PUBLIC,
  })
  @IsEnum(ShareVisibility)
  visibility: ShareVisibility;

  @ApiPropertyOptional({ description: 'Share title', example: 'My Croatia Trip 2025' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Share description',
    example: 'Amazing 2-week island hopping adventure',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cover photo URL' })
  @IsOptional()
  @IsString()
  coverPhoto?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Allow others to collaborate',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  allowCollaboration?: boolean;
}

export class UpdateSharedItineraryDto {
  @ApiPropertyOptional({ description: 'Update visibility' })
  @IsOptional()
  @IsEnum(ShareVisibility)
  visibility?: ShareVisibility;

  @ApiPropertyOptional({ description: 'Update title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Update description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Update cover photo' })
  @IsOptional()
  @IsString()
  coverPhoto?: string;

  @ApiPropertyOptional({ description: 'Update tags' })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Allow collaboration' })
  @IsOptional()
  @IsBoolean()
  allowCollaboration?: boolean;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddCollaboratorDto {
  @ApiProperty({ description: 'User ID to add as collaborator', example: 5 })
  @IsInt()
  userId: number;
}

export class CommentDto {
  @ApiProperty({ description: 'Comment text', example: 'This looks amazing!' })
  @IsString()
  comment: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsInt()
  parentId?: number;
}

export class SharedItineraryResponseDto {
  @ApiProperty({ description: 'Share ID' })
  id: number;

  @ApiProperty({ description: 'Itinerary ID' })
  itineraryId: number;

  @ApiProperty({ description: 'Itinerary name' })
  itineraryName: string;

  @ApiProperty({ description: 'Shared by user ID' })
  sharedBy: number;

  @ApiProperty({ description: 'Shared by username' })
  sharedByUsername: string;

  @ApiProperty({ description: 'Visibility' })
  visibility: string;

  @ApiProperty({ description: 'Title' })
  title?: string;

  @ApiProperty({ description: 'Description' })
  description?: string;

  @ApiProperty({ description: 'Cover photo URL' })
  coverPhoto?: string;

  @ApiProperty({ description: 'Tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Views count' })
  views: number;

  @ApiProperty({ description: 'Likes count' })
  likes: number;

  @ApiProperty({ description: 'Forks count' })
  forks: number;

  @ApiProperty({ description: 'Allow collaboration' })
  allowCollaboration: boolean;

  @ApiProperty({ description: 'Collaborator user IDs', type: [Number] })
  collaborators: number[];

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Has user liked' })
  hasLiked?: boolean;
}
