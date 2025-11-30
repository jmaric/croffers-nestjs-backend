import {
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateBookingItemDto } from './create-booking-item.dto.js';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Service delivery date (ISO 8601 format). Must be in the future.',
    example: '2024-12-15T00:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  @IsNotEmpty()
  serviceDate: string;

  @ApiPropertyOptional({
    description: 'Special requests or notes for the booking',
    example: 'Please arrange early check-in',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Array of booking items (services with quantities). All items must be from the same supplier.',
    type: [CreateBookingItemDto],
    minItems: 1,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBookingItemDto)
  @ArrayMinSize(1)
  items: CreateBookingItemDto[];
}