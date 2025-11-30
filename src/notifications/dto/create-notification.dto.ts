import { IsEnum, IsString, IsNumber, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../../../generated/prisma/client/client.js';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'User ID to receive the notification',
    example: 1,
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.BOOKING_CONFIRMATION,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'Booking Confirmed',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Your booking #BK123456 has been confirmed!',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Action URL for notification click',
    example: '/bookings/123',
  })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the notification',
    example: { bookingId: 123, amount: 250 },
  })
  @IsObject()
  @IsOptional()
  metadata?: any;
}
