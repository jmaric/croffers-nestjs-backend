import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsDateString, IsOptional, Min } from 'class-validator';

export class UpdateSegmentDto {
  @ApiProperty({
    description: 'New service ID (optional)',
    example: 42,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  serviceId?: number;

  @ApiProperty({
    description: 'New departure time (ISO 8601, optional)',
    example: '2025-07-16T09:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  departureTime?: string;

  @ApiProperty({
    description: 'New arrival time (ISO 8601, optional)',
    example: '2025-07-16T12:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  arrivalTime?: string;

  @ApiProperty({
    description: 'New departure location ID (optional)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  departureLocationId?: number;

  @ApiProperty({
    description: 'New arrival location ID (optional)',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  arrivalLocationId?: number;

  @ApiProperty({
    description: 'Notes for this segment (optional)',
    example: 'Bring sunscreen',
    required: false,
  })
  @IsOptional()
  notes?: string;
}
