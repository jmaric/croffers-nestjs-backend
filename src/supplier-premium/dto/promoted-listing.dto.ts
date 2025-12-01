import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class CreatePromotedListingDto {
  @ApiProperty({ description: 'Service ID to promote', example: 1 })
  @IsInt()
  serviceId: number;

  @ApiProperty({
    description: 'Promotion start date',
    example: '2025-12-01T00:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Promotion end date',
    example: '2025-12-31T23:59:59Z',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Priority position (lower = higher priority)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  position?: number;

  @ApiPropertyOptional({
    description: 'Show featured badge',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Search ranking boost factor',
    example: 1.5,
  })
  @IsOptional()
  @IsNumber()
  boostedScore?: number;

  @ApiPropertyOptional({
    description: 'Daily budget (optional)',
    example: 50.0,
  })
  @IsOptional()
  @IsNumber()
  dailyBudget?: number;
}

export class UpdatePromotedListingDto {
  @ApiPropertyOptional({
    description: 'Update end date',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Update position',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  position?: number;

  @ApiPropertyOptional({
    description: 'Update featured badge',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Update boost factor',
    example: 2.0,
  })
  @IsOptional()
  @IsNumber()
  boostedScore?: number;

  @ApiPropertyOptional({
    description: 'Update daily budget',
    example: 100.0,
  })
  @IsOptional()
  @IsNumber()
  dailyBudget?: number;

  @ApiPropertyOptional({
    description: 'Activate or pause promotion',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PromotedListingResponseDto {
  @ApiProperty({ description: 'Promotion ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Service ID', example: 1 })
  serviceId: number;

  @ApiProperty({ description: 'Service name', example: 'Luxury Villa' })
  serviceName: string;

  @ApiProperty({ description: 'Start date' })
  startDate: Date;

  @ApiProperty({ description: 'End date' })
  endDate: Date;

  @ApiProperty({ description: 'Position', example: 1 })
  position?: number;

  @ApiProperty({ description: 'Is featured', example: true })
  isFeatured: boolean;

  @ApiProperty({ description: 'Boost score', example: 1.5 })
  boostedScore: number;

  @ApiProperty({ description: 'Daily budget', example: 50.0 })
  dailyBudget?: number;

  @ApiProperty({ description: 'Total spent', example: 350.0 })
  totalSpent: number;

  @ApiProperty({ description: 'Impressions', example: 1250 })
  impressions: number;

  @ApiProperty({ description: 'Clicks', example: 75 })
  clicks: number;

  @ApiProperty({ description: 'Bookings', example: 5 })
  bookings: number;

  @ApiProperty({ description: 'Click-through rate', example: 6.0 })
  ctr: number;

  @ApiProperty({ description: 'Conversion rate', example: 6.67 })
  conversionRate: number;

  @ApiProperty({ description: 'Is active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}
