import {
  IsInt,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ModificationType } from '../../../generated/prisma/client/client.js';

export class ModifyBookingDateDto {
  @ApiProperty({ description: 'Booking ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  bookingId: number;

  @ApiProperty({ description: 'New service date', example: '2025-12-20' })
  @IsDateString()
  newServiceDate: string;

  @ApiPropertyOptional({
    description: 'Reason for change',
    example: 'Flight schedule changed',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ModifyBookingGuestsDto {
  @ApiProperty({ description: 'Booking ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  bookingId: number;

  @ApiProperty({ description: 'New guest count', example: 4 })
  @IsInt()
  @Type(() => Number)
  newGuestCount: number;

  @ApiPropertyOptional({
    description: 'Reason for change',
    example: 'Additional family members joining',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpgradeServiceDto {
  @ApiProperty({ description: 'Booking ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  bookingId: number;

  @ApiProperty({ description: 'Current service ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  currentServiceId: number;

  @ApiProperty({ description: 'Upgraded service ID', example: 2 })
  @IsInt()
  @Type(() => Number)
  upgradedServiceId: number;

  @ApiPropertyOptional({
    description: 'Reason for upgrade',
    example: 'Want larger villa',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddServiceToBookingDto {
  @ApiProperty({ description: 'Booking ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  bookingId: number;

  @ApiProperty({ description: 'Service IDs to add', example: [3, 5] })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  serviceIds: number[];

  @ApiPropertyOptional({
    description: 'Reason for addition',
    example: 'Added boat tour and wine tasting',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RemoveServiceFromBookingDto {
  @ApiProperty({ description: 'Booking ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  bookingId: number;

  @ApiProperty({ description: 'Booking item ID to remove', example: 3 })
  @IsInt()
  @Type(() => Number)
  bookingItemId: number;

  @ApiPropertyOptional({
    description: 'Reason for removal',
    example: 'Changed plans',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BookingModificationResponseDto {
  @ApiProperty({ description: 'Modification ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Booking ID', example: 1 })
  bookingId: number;

  @ApiProperty({
    description: 'Modification type',
    enum: ModificationType,
    example: 'DATE_CHANGE',
  })
  modificationType: ModificationType;

  @ApiProperty({ description: 'Previous data' })
  previousData: any;

  @ApiProperty({ description: 'New data' })
  newData: any;

  @ApiProperty({ description: 'Price difference', example: 25 })
  priceDifference: number;

  @ApiProperty({ description: 'Currency', example: 'EUR' })
  currency: string;

  @ApiProperty({ description: 'Status', example: 'pending' })
  status: string;

  @ApiProperty({ description: 'Reason' })
  reason?: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Approved at' })
  approvedAt?: Date;
}

export class ApproveModificationDto {
  @ApiProperty({ description: 'Modification ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  modificationId: number;
}
