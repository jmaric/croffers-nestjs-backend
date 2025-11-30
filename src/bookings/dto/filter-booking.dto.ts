import { IsEnum, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../../../generated/prisma/client/client.js';
import { Type } from 'class-transformer';

export class FilterBookingDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  userId?: number;

  @ApiPropertyOptional({
    description: 'Filter by supplier ID',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  supplierId?: number;

  @ApiPropertyOptional({
    description: 'Filter by booking status',
    enum: BookingStatus,
    example: 'CONFIRMED',
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Filter bookings from this date (ISO 8601)',
    example: '2024-12-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter bookings until this date (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
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
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}