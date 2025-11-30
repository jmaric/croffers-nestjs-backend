import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBookingDto {
  @ApiPropertyOptional({
    description: 'New service date (ISO 8601 format). Must be in the future.',
    example: '2024-12-20T00:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  serviceDate?: string;

  @ApiPropertyOptional({
    description: 'Updated special requests or notes',
    example: 'Changed: Need late checkout instead',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}