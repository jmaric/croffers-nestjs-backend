import {
  IsInt,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AlertType } from '../../../generated/prisma/client/client.js';

export class CreatePriceAlertDto {
  @ApiProperty({ description: 'Service ID to monitor', example: 1 })
  @IsInt()
  @Type(() => Number)
  serviceId: number;

  @ApiPropertyOptional({
    description: 'Alert type',
    enum: AlertType,
    example: AlertType.PRICE_DROP,
  })
  @IsOptional()
  @IsEnum(AlertType)
  alertType?: AlertType;

  @ApiPropertyOptional({
    description: 'Target price - alert when price drops below this',
    example: 80,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetPrice?: number;

  @ApiPropertyOptional({
    description: 'Alert when price drops by this percentage',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  percentage?: number;

  @ApiPropertyOptional({
    description: 'Start date for flexible search',
    example: '2025-12-10',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for flexible search',
    example: '2025-12-20',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Number of guests',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guests?: number;
}

export class FlexibleDateSearchDto {
  @ApiProperty({ description: 'Service ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  serviceId: number;

  @ApiProperty({
    description: 'Start date for search range',
    example: '2025-12-10',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for search range',
    example: '2025-12-20',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Number of guests', example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guests: number;

  @ApiPropertyOptional({
    description: 'Include adjacent dates',
    example: true,
  })
  @IsOptional()
  includeAdjacent?: boolean;
}

export class FlexibleDateResult {
  @ApiProperty({ description: 'Date', example: '2025-12-15' })
  date: string;

  @ApiProperty({ description: 'Price', example: 95 })
  price: number;

  @ApiProperty({ description: 'Availability', example: true })
  available: boolean;

  @ApiProperty({ description: 'Is cheapest option', example: false })
  isCheapest: boolean;

  @ApiProperty({ description: 'Price difference from cheapest', example: 15 })
  priceDifference: number;

  @ApiProperty({ description: 'Crowd level', example: 'MODERATE' })
  crowdLevel?: string;
}

export class FlexibleDateSearchResponseDto {
  @ApiProperty({ description: 'Service ID', example: 1 })
  serviceId: number;

  @ApiProperty({ description: 'Service name', example: 'Hvar Island Villa' })
  serviceName: string;

  @ApiProperty({ description: 'Search start date', example: '2025-12-10' })
  startDate: string;

  @ApiProperty({ description: 'Search end date', example: '2025-12-20' })
  endDate: string;

  @ApiProperty({ description: 'Number of guests', example: 2 })
  guests: number;

  @ApiProperty({
    description: 'Available dates with prices',
    type: [FlexibleDateResult],
  })
  results: FlexibleDateResult[];

  @ApiProperty({ description: 'Cheapest price found', example: 80 })
  cheapestPrice: number;

  @ApiProperty({ description: 'Most expensive price', example: 120 })
  highestPrice: number;

  @ApiProperty({ description: 'Average price', example: 95 })
  averagePrice: number;

  @ApiProperty({
    description: 'Best value dates (cheap + low crowd)',
    example: ['2025-12-12', '2025-12-13'],
  })
  bestValueDates: string[];
}

export class PriceAlertResponseDto {
  @ApiProperty({ description: 'Alert ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Service ID', example: 1 })
  serviceId: number;

  @ApiProperty({ description: 'Service name', example: 'Hvar Island Villa' })
  serviceName: string;

  @ApiProperty({ description: 'Alert type', example: 'PRICE_DROP' })
  alertType: string;

  @ApiProperty({ description: 'Target price', example: 80 })
  targetPrice?: number;

  @ApiProperty({ description: 'Percentage threshold', example: 20 })
  percentage?: number;

  @ApiProperty({ description: 'Current price', example: 95 })
  currentPrice: number;

  @ApiProperty({ description: 'Is active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Is triggered', example: false })
  isTriggered: boolean;

  @ApiProperty({ description: 'Triggered at' })
  triggeredAt?: Date;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}
