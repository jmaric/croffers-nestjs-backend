import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { JourneyStatus } from '../../../generated/prisma/client/client.js';

export class UpdateJourneyDto {
  @ApiPropertyOptional({
    description: 'Journey name',
    example: 'Updated Summer Vacation',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Journey status',
    enum: JourneyStatus,
    example: JourneyStatus.READY,
  })
  @IsOptional()
  @IsEnum(JourneyStatus)
  status?: JourneyStatus;

  @ApiPropertyOptional({
    description: 'Journey start date (ISO 8601)',
    example: '2025-07-15T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Journey end date (ISO 8601)',
    example: '2025-07-22T14:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Number of travelers',
    example: 3,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  travelers?: number;
}
