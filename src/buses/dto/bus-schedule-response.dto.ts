import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusOperator,
  ScheduleStatus,
} from '../../../generated/prisma/client/client.js';

export class BusScheduleResponseDto {
  @ApiProperty({
    description: 'Bus schedule ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Bus operator',
    enum: BusOperator,
    example: BusOperator.FLIXBUS,
  })
  operator: BusOperator;

  @ApiPropertyOptional({
    description: 'Bus line number',
    example: '37',
  })
  busNumber?: string;

  @ApiProperty({
    description: 'Route name',
    example: 'Split Airport - Split Bus Station',
  })
  routeName: string;

  @ApiProperty({
    description: 'Departure stop ID',
    example: 1,
  })
  departureStopId: number;

  @ApiProperty({
    description: 'Arrival stop ID',
    example: 10,
  })
  arrivalStopId: number;

  @ApiProperty({
    description: 'Departure time (ISO 8601)',
    example: '2025-07-15T10:00:00Z',
  })
  departureTime: Date;

  @ApiProperty({
    description: 'Arrival time (ISO 8601)',
    example: '2025-07-15T10:30:00Z',
  })
  arrivalTime: Date;

  @ApiProperty({
    description: 'Duration in minutes',
    example: 30,
  })
  duration: number;

  @ApiProperty({
    description: 'Total passenger capacity',
    example: 50,
  })
  totalCapacity: number;

  @ApiProperty({
    description: 'Available seats',
    example: 25,
  })
  availableSeats: number;

  @ApiProperty({
    description: 'Adult ticket price',
    example: 5.0,
  })
  adultPrice: number;

  @ApiPropertyOptional({
    description: 'Child ticket price',
    example: 2.5,
  })
  childPrice?: number;

  @ApiPropertyOptional({
    description: 'Senior ticket price',
    example: 4.0,
  })
  seniorPrice?: number;

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
    example: ['wifi', 'ac', 'toilet', 'usb-charging'],
  })
  amenities: string[];

  @ApiPropertyOptional({
    description: 'Bus type',
    example: 'Premium',
  })
  busType?: string;

  @ApiPropertyOptional({
    description: 'Special notes',
    example: 'Express service with limited stops',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Departure stop details',
  })
  departureStop?: {
    id: number;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
  };

  @ApiPropertyOptional({
    description: 'Arrival stop details',
  })
  arrivalStop?: {
    id: number;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
  };
}

export class BusSearchResultDto {
  @ApiProperty({
    description: 'Outbound bus schedules',
    type: [BusScheduleResponseDto],
  })
  outbound: BusScheduleResponseDto[];

  @ApiPropertyOptional({
    description: 'Return bus schedules (for round trips)',
    type: [BusScheduleResponseDto],
  })
  return?: BusScheduleResponseDto[];

  @ApiProperty({
    description: 'Total results count',
    example: 12,
  })
  total: number;
}
