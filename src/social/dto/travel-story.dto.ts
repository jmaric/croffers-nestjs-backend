import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ShareVisibility } from '../../../generated/prisma/client/client.js';

export class CreateTravelStoryDto {
  @ApiProperty({ description: 'Story title', example: 'Sunset at Hvar Island' })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Story content',
    example: 'The most beautiful sunset I have ever seen...',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Location ID' })
  @IsOptional()
  @IsInt()
  locationId?: number;

  @ApiPropertyOptional({ description: 'Related itinerary ID' })
  @IsOptional()
  @IsInt()
  itineraryId?: number;

  @ApiPropertyOptional({ description: 'Related booking ID' })
  @IsOptional()
  @IsInt()
  bookingId?: number;

  @ApiPropertyOptional({ description: 'Photo URLs', type: [String] })
  @IsOptional()
  @IsArray()
  photos?: string[];

  @ApiPropertyOptional({ description: 'Cover photo URL' })
  @IsOptional()
  @IsString()
  coverPhoto?: string;

  @ApiProperty({
    description: 'Visibility',
    enum: ShareVisibility,
    example: ShareVisibility.PUBLIC,
  })
  @IsEnum(ShareVisibility)
  visibility: ShareVisibility;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class UpdateTravelStoryDto {
  @ApiPropertyOptional({ description: 'Update title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Update content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Update photos' })
  @IsOptional()
  @IsArray()
  photos?: string[];

  @ApiPropertyOptional({ description: 'Update cover photo' })
  @IsOptional()
  @IsString()
  coverPhoto?: string;

  @ApiPropertyOptional({ description: 'Update visibility' })
  @IsOptional()
  @IsEnum(ShareVisibility)
  visibility?: ShareVisibility;

  @ApiPropertyOptional({ description: 'Update tags' })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Publish status' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class TravelStoryResponseDto {
  @ApiProperty({ description: 'Story ID' })
  id: number;

  @ApiProperty({ description: 'User ID' })
  userId: number;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'User avatar' })
  userAvatar?: string;

  @ApiProperty({ description: 'Title' })
  title: string;

  @ApiProperty({ description: 'Content' })
  content: string;

  @ApiProperty({ description: 'Location ID' })
  locationId?: number;

  @ApiProperty({ description: 'Location name' })
  locationName?: string;

  @ApiProperty({ description: 'Photos', type: [String] })
  photos: string[];

  @ApiProperty({ description: 'Cover photo' })
  coverPhoto?: string;

  @ApiProperty({ description: 'Visibility' })
  visibility: string;

  @ApiProperty({ description: 'Tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Views count' })
  views: number;

  @ApiProperty({ description: 'Likes count' })
  likes: number;

  @ApiProperty({ description: 'Is published' })
  isPublished: boolean;

  @ApiProperty({ description: 'Published at' })
  publishedAt: Date;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Has user liked' })
  hasLiked?: boolean;
}
