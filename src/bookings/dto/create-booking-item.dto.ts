import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingItemDto {
  @ApiProperty({
    description: 'Service ID to book',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  serviceId: number;

  @ApiProperty({
    description: 'Quantity (number of units/guests). Minimum 1.',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Additional metadata (guest details, special requests, etc.)',
    example: { guestNames: ['John Doe', 'Jane Doe'], dietaryRestrictions: 'Vegetarian' },
  })
  @IsObject()
  @IsOptional()
  metadata?: any;
}