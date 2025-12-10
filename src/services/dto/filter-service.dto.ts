import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType, ServiceStatus } from '../../../generated/prisma/client/client.js';
import { Type } from 'class-transformer';

export enum SortBy {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  TRUST_SCORE = 'trust_score',
  POPULARITY = 'popularity',
  NEWEST = 'newest',
  RELEVANCE = 'relevance',
}

export class FilterServiceDto {
  // Basic filters
  @ApiPropertyOptional({
    description: 'Filter by service type',
    enum: ServiceType,
    example: 'ACCOMMODATION',
  })
  @IsEnum(ServiceType)
  @IsOptional()
  type?: ServiceType;

  @ApiPropertyOptional({
    description: 'Filter by service status',
    enum: ServiceStatus,
    example: 'APPROVED',
  })
  @IsEnum(ServiceStatus)
  @IsOptional()
  status?: ServiceStatus;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by supplier ID',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  supplierId?: number;

  // Search
  @ApiPropertyOptional({
    description: 'Full-text search across name, description, and tags',
    example: 'beachfront villa',
  })
  @IsString()
  @IsOptional()
  search?: string;

  // Price range
  @ApiPropertyOptional({
    description: 'Minimum price filter',
    example: 50,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    example: 500,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  // Location-based search
  @ApiPropertyOptional({
    description: 'Latitude for location-based search',
    example: 45.8150,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude for location-based search',
    example: 15.9819,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers',
    example: 50,
    minimum: 1,
    maximum: 500,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  radius?: number;

  // Location filters
  @ApiPropertyOptional({
    description: 'Filter by location ID',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  locationId?: number;

  @ApiPropertyOptional({
    description: 'Filter by location name or slug (case-insensitive)',
    example: 'dubrovnik',
  })
  @IsString()
  @IsOptional()
  locationName?: string;

  // Capacity filter
  @ApiPropertyOptional({
    description: 'Minimum capacity (guests)',
    example: 2,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minCapacity?: number;

  // Date availability (for checking if service is available on specific dates)
  @ApiPropertyOptional({
    description: 'Check availability from this date',
    example: '2024-12-15T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Check availability until this date',
    example: '2024-12-20T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  // Amenities filter (tags)
  @ApiPropertyOptional({
    description: 'Filter by amenities/tags (e.g., wifi, parking, pool)',
    example: ['wifi', 'parking', 'pool'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  // Trust score filter
  @ApiPropertyOptional({
    description: 'Minimum trust score (0-100)',
    example: 80,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  minTrustScore?: number;

  // Sorting
  @ApiPropertyOptional({
    description: 'Sort results by',
    enum: SortBy,
    example: SortBy.TRUST_SCORE,
  })
  @IsEnum(SortBy)
  @IsOptional()
  sortBy?: SortBy;

  // Pagination
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}