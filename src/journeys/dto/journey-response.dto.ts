import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  JourneyStatus,
  SegmentType,
} from '../../../generated/prisma/client/client.js';

export class JourneySegmentResponseDto {
  @ApiProperty({
    description: 'Segment ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Journey ID this segment belongs to',
    example: 1,
  })
  journeyId: number;

  @ApiProperty({
    description: 'Type of segment',
    enum: SegmentType,
    example: SegmentType.FERRY,
  })
  segmentType: SegmentType;

  @ApiProperty({
    description: 'Order of segment in journey',
    example: 1,
  })
  segmentOrder: number;

  @ApiPropertyOptional({
    description: 'Service ID if available',
    example: 15,
  })
  serviceId?: number;

  @ApiPropertyOptional({
    description: 'Booking ID if booked',
    example: 42,
  })
  bookingId?: number;

  @ApiPropertyOptional({
    description: 'Departure location ID',
    example: 1,
  })
  departureLocationId?: number;

  @ApiPropertyOptional({
    description: 'Arrival location ID',
    example: 10,
  })
  arrivalLocationId?: number;

  @ApiPropertyOptional({
    description: 'Departure time (ISO 8601)',
    example: '2025-07-15T10:00:00Z',
  })
  departureTime?: Date;

  @ApiPropertyOptional({
    description: 'Arrival time (ISO 8601)',
    example: '2025-07-15T11:30:00Z',
  })
  arrivalTime?: Date;

  @ApiPropertyOptional({
    description: 'Duration in minutes',
    example: 90,
  })
  duration?: number;

  @ApiProperty({
    description: 'Segment price',
    example: 45.0,
  })
  price: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    description: 'Whether segment is booked',
    example: false,
  })
  isBooked: boolean;

  @ApiProperty({
    description: 'Whether segment is confirmed',
    example: false,
  })
  isConfirmed: boolean;

  @ApiPropertyOptional({
    description: 'Special notes or instructions',
    example: 'Meet at Terminal A, Gate 3',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { ferryCompany: 'Jadrolinija', vesselName: 'Hvar Express' },
  })
  metadata?: any;

  @ApiPropertyOptional({
    description: 'Departure location details',
  })
  departureLocation?: {
    id: number;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
  };

  @ApiPropertyOptional({
    description: 'Arrival location details',
  })
  arrivalLocation?: {
    id: number;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
  };

  @ApiPropertyOptional({
    description: 'Service details',
  })
  service?: {
    id: number;
    name: string;
    type: string;
    description: string;
  };
}

export class JourneyResponseDto {
  @ApiProperty({
    description: 'Journey ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'User ID who created this journey',
    example: 5,
  })
  userId: number;

  @ApiProperty({
    description: 'Journey status',
    enum: JourneyStatus,
    example: JourneyStatus.PLANNING,
  })
  status: JourneyStatus;

  @ApiPropertyOptional({
    description: 'Journey name',
    example: 'Summer Vacation to Hvar',
  })
  name?: string;

  @ApiProperty({
    description: 'Origin location ID',
    example: 1,
  })
  originLocationId: number;

  @ApiProperty({
    description: 'Destination location ID',
    example: 10,
  })
  destLocationId: number;

  @ApiProperty({
    description: 'Journey start date',
    example: '2025-07-15T10:00:00Z',
  })
  startDate: Date;

  @ApiProperty({
    description: 'Journey end date',
    example: '2025-07-22T14:00:00Z',
  })
  endDate: Date;

  @ApiProperty({
    description: 'Total journey price',
    example: 850.0,
  })
  totalPrice: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    description: 'Number of travelers',
    example: 2,
  })
  travelers: number;

  @ApiPropertyOptional({
    description: 'Travel preferences',
    example: { pace: 'MODERATE', budget: 'STANDARD' },
  })
  preferences?: any;

  @ApiPropertyOptional({
    description: 'Optimized route data',
  })
  optimizedRoute?: any;

  @ApiProperty({
    description: 'Journey segments',
    type: [JourneySegmentResponseDto],
  })
  segments: JourneySegmentResponseDto[];

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2025-06-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at timestamp',
    example: '2025-06-01T12:00:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Origin location details',
  })
  originLocation?: {
    id: number;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
  };

  @ApiPropertyOptional({
    description: 'Destination location details',
  })
  destLocation?: {
    id: number;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
  };
}

export class JourneyListResponseDto {
  @ApiProperty({
    description: 'List of journeys',
    type: [JourneyResponseDto],
  })
  journeys: JourneyResponseDto[];

  @ApiProperty({
    description: 'Total count of journeys',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit: number;
}
