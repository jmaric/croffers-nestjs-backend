import { IsEnum, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NotificationType } from '../../../generated/prisma/client/client.js';

export class QueryNotificationsDto {
  @ApiPropertyOptional({
    description: 'Filter by notification type',
    enum: NotificationType,
    example: NotificationType.BOOKING_CONFIRMATION,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'Filter by read status',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isRead?: boolean;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
