import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsEnum, IsArray, Min, Max } from 'class-validator';

export enum RecommendationContext {
  HOME_PAGE = 'HOME_PAGE',
  SEARCH_RESULTS = 'SEARCH_RESULTS',
  SERVICE_DETAIL = 'SERVICE_DETAIL',
  CHECKOUT = 'CHECKOUT',
}

export class GetRecommendationsDto {
  @ApiProperty({
    description: 'Context for recommendations',
    enum: RecommendationContext,
    example: RecommendationContext.HOME_PAGE,
  })
  @IsEnum(RecommendationContext)
  context: RecommendationContext;

  @ApiProperty({ description: 'Limit results', example: 10, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiProperty({
    description: 'Current service ID (for similar items)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  serviceId?: number;

  @ApiProperty({
    description: 'Location ID for location-based recommendations',
    required: false,
  })
  @IsOptional()
  @IsInt()
  locationId?: number;
}

export class TrackInteractionDto {
  @ApiProperty({ description: 'Service ID', example: 123 })
  @IsInt()
  serviceId: number;

  @ApiProperty({
    description: 'Interaction type',
    enum: ['view', 'click', 'like', 'save', 'book', 'review'],
    example: 'view',
  })
  interactionType: string;

  @ApiProperty({
    description: 'Search query if from search',
    required: false,
  })
  @IsOptional()
  searchQuery?: string;

  @ApiProperty({
    description: 'Time spent viewing in seconds',
    required: false,
  })
  @IsOptional()
  @IsInt()
  duration?: number;
}

export class RecommendationResponseDto {
  @ApiProperty({ description: 'Recommended service ID' })
  serviceId: number;

  @ApiProperty({ description: 'Service name' })
  serviceName: string;

  @ApiProperty({ description: 'Service type' })
  serviceType: string;

  @ApiProperty({ description: 'Total recommendation score (0-1)' })
  score: number;

  @ApiProperty({ description: 'Why this was recommended' })
  reasoning: string;

  @ApiProperty({ description: 'Service details' })
  service: any;
}
