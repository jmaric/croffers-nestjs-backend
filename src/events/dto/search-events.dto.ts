import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export enum EventCategory {
  CONCERT = 'CONCERT',
  FESTIVAL = 'FESTIVAL',
  BEACH_PARTY = 'BEACH_PARTY',
  BOAT_PARTY = 'BOAT_PARTY',
  CULTURAL = 'CULTURAL',
  SPORTS = 'SPORTS',
  NIGHTLIFE = 'NIGHTLIFE',
  EXHIBITION = 'EXHIBITION',
  OTHER = 'OTHER',
}

export enum SortBy {
  DATE_ASC = 'DATE_ASC',
  DATE_DESC = 'DATE_DESC',
  PRICE_ASC = 'PRICE_ASC',
  PRICE_DESC = 'PRICE_DESC',
  POPULARITY = 'POPULARITY',
}

export class SearchEventsDto {
  @ApiPropertyOptional({
    description: 'Location ID to search events',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  locationId?: number;

  @ApiPropertyOptional({
    description: 'Event category',
    enum: EventCategory,
    example: EventCategory.BEACH_PARTY,
  })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiPropertyOptional({
    description: 'Search by event name or description',
    example: 'Ultra',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Start date for event search (ISO 8601)',
    example: '2025-07-15',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for event search (ISO 8601)',
    example: '2025-07-22',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Minimum price',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Only show events with available tickets',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  availableOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortBy,
    example: SortBy.DATE_ASC,
    default: SortBy.DATE_ASC,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
