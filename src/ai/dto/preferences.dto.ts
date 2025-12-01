import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsInt,
  IsBoolean,
  IsDecimal,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { TravelStyle, InterestCategory } from '../../../generated/prisma/client/client.js';

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Travel styles',
    enum: TravelStyle,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TravelStyle, { each: true })
  travelStyles?: TravelStyle[];

  @ApiProperty({
    description: 'Interests',
    enum: InterestCategory,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(InterestCategory, { each: true })
  interests?: InterestCategory[];

  @ApiProperty({ description: 'Minimum budget', required: false })
  @IsOptional()
  @IsDecimal()
  minBudget?: number;

  @ApiProperty({ description: 'Maximum budget', required: false })
  @IsOptional()
  @IsDecimal()
  maxBudget?: number;

  @ApiProperty({
    description: 'Preferred star rating (1-5)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  preferredStarRating?: number;

  @ApiProperty({
    description: 'Preferred amenities',
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  preferredAmenities?: string[];

  @ApiProperty({
    description: 'Activity level minimum (1-5)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  activityLevelMin?: number;

  @ApiProperty({
    description: 'Activity level maximum (1-5)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  activityLevelMax?: number;

  @ApiProperty({
    description: 'Preferred duration',
    enum: ['half-day', 'full-day', 'multi-day'],
    required: false,
  })
  @IsOptional()
  preferredDuration?: string;

  @ApiProperty({
    description: 'Preferred regions',
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  preferredRegions?: string[];

  @ApiProperty({
    description: 'Avoid crowds',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  avoidCrowds?: boolean;
}

export class PreferencesResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty({ isArray: true })
  travelStyles: TravelStyle[];

  @ApiProperty({ isArray: true })
  interests: InterestCategory[];

  @ApiProperty()
  minBudget?: number;

  @ApiProperty()
  maxBudget?: number;

  @ApiProperty()
  preferredStarRating?: number;

  @ApiProperty({ isArray: true })
  preferredAmenities: string[];

  @ApiProperty()
  activityLevelMin?: number;

  @ApiProperty()
  activityLevelMax?: number;

  @ApiProperty()
  preferredDuration?: string;

  @ApiProperty({ isArray: true })
  preferredRegions: string[];

  @ApiProperty()
  avoidCrowds: boolean;
}
