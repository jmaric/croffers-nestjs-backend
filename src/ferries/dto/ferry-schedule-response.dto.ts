import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FerryOperator,
  ScheduleStatus,
} from '../../../generated/prisma/client/client.js';

export class FerryScheduleResponseDto {
  @ApiProperty({
    description: 'Ferry schedule ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Ferry operator',
    enum: FerryOperator,
    example: FerryOperator.JADROLINIJA,
  })
  operator: FerryOperator;

  @ApiProperty({
    description: 'Vessel name',
    example: 'Hvar Express',
  })
  vesselName: string;

  @ApiProperty({
    description: 'Route name',
    example: 'Split - Hvar',
  })
  routeName: string;

  @ApiProperty({
    description: 'Departure port ID',
    example: 1,
  })
  departurePortId: number;

  @ApiProperty({
    description: 'Arrival port ID',
    example: 10,
  })
  arrivalPortId: number;

  @ApiProperty({
    description: 'Departure time (ISO 8601)',
    example: '2025-07-15T10:00:00Z',
  })
  departureTime: Date;

  @ApiProperty({
    description: 'Arrival time (ISO 8601)',
    example: '2025-07-15T11:30:00Z',
  })
  arrivalTime: Date;

  @ApiProperty({
    description: 'Duration in minutes',
    example: 90,
  })
  duration: number;

  @ApiProperty({
    description: 'Total passenger capacity',
    example: 300,
  })
  totalCapacity: number;

  @ApiPropertyOptional({
    description: 'Vehicle capacity',
    example: 40,
  })
  vehicleCapacity?: number;

  @ApiProperty({
    description: 'Available seats',
    example: 150,
  })
  availableSeats: number;

  @ApiPropertyOptional({
    description: 'Available vehicle spots',
    example: 20,
  })
  availableVehicles?: number;

  @ApiProperty({
    description: 'Adult ticket price',
    example: 45.0,
  })
  adultPrice: number;

  @ApiPropertyOptional({
    description: 'Child ticket price',
    example: 22.5,
  })
  childPrice?: number;

  @ApiPropertyOptional({
    description: 'Vehicle transport price',
    example: 120.0,
  })
  vehiclePrice?: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    description: 'Schedule status',
    enum: ScheduleStatus,
    example: ScheduleStatus.SCHEDULED,
  })
  status: ScheduleStatus;

  @ApiProperty({
    description: 'Operating days',
    example: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  })
  operatingDays: string[];

  @ApiPropertyOptional({
    description: 'Season start date',
    example: '2025-05-01T00:00:00Z',
  })
  seasonStart?: Date;

  @ApiPropertyOptional({
    description: 'Season end date',
    example: '2025-10-31T00:00:00Z',
  })
  seasonEnd?: Date;

  @ApiProperty({
    description: 'Amenities',
    example: ['wifi', 'restaurant', 'air-conditioning'],
  })
  amenities: string[];

  @ApiPropertyOptional({
    description: 'Special notes',
    example: 'Weather dependent service',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Departure port details',
  })
  departurePort?: {
    id: number;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
  };

  @ApiPropertyOptional({
    description: 'Arrival port details',
  })
  arrivalPort?: {
    id: number;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
  };
}

export class FerrySearchResultDto {
  @ApiProperty({
    description: 'Outbound ferry schedules',
    type: [FerryScheduleResponseDto],
  })
  outbound: FerryScheduleResponseDto[];

  @ApiPropertyOptional({
    description: 'Return ferry schedules (for round trips)',
    type: [FerryScheduleResponseDto],
  })
  return?: FerryScheduleResponseDto[];

  @ApiProperty({
    description: 'Total results count',
    example: 8,
  })
  total: number;
}
