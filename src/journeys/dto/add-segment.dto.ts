import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsDateString, IsOptional, Min, IsEnum } from 'class-validator';
import { SegmentType } from '../../../generated/prisma/client/client.js';

export class AddSegmentDto {
  @ApiProperty({
    description: 'Type of segment',
    enum: SegmentType,
    example: SegmentType.TOUR,
  })
  @IsEnum(SegmentType)
  segmentType: SegmentType;

  @ApiProperty({
    description: 'Service ID to add to journey (optional for transport segments)',
    example: 42,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  serviceId?: number;

  @ApiProperty({
    description: 'Day number in the journey (1-based)',
    example: 2,
  })
  @IsInt()
  @Min(1)
  dayNumber: number;

  @ApiProperty({
    description: 'Time of day for this segment',
    enum: ['morning', 'afternoon', 'evening', 'all-day'],
    example: 'morning',
  })
  @IsEnum(['morning', 'afternoon', 'evening', 'all-day'])
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'all-day';

  @ApiProperty({
    description: 'Departure time (ISO 8601)',
    example: '2025-07-16T09:00:00Z',
  })
  @IsDateString()
  departureTime: string;

  @ApiProperty({
    description: 'Arrival time (ISO 8601)',
    example: '2025-07-16T12:00:00Z',
  })
  @IsDateString()
  arrivalTime: string;

  @ApiProperty({
    description: 'Departure location ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  departureLocationId: number;

  @ApiProperty({
    description: 'Arrival location ID',
    example: 2,
  })
  @IsInt()
  @Min(1)
  arrivalLocationId: number;

  @ApiProperty({
    description: 'Insert after this segment order (optional, defaults to end)',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  insertAfterOrder?: number;

  @ApiProperty({
    description: 'Price for the segment (required for transport segments without serviceId)',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiProperty({
    description: 'Currency for the segment (required for transport segments without serviceId)',
    example: 'EUR',
    required: false,
  })
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'Duration in minutes (optional)',
    example: 120,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiProperty({
    description: 'Additional metadata for the segment (optional)',
    example: { operator: 'JADROLINIJA', passengers: 2 },
    required: false,
  })
  @IsOptional()
  metadata?: any;
}
