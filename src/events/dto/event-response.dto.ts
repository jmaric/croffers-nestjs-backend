import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventResponseDto {
  @ApiProperty({
    description: 'Event ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Location ID',
    example: 10,
  })
  locationId: number;

  @ApiProperty({
    description: 'Event name',
    example: 'Ultra Europe Festival',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example:
      'The biggest electronic music festival in Croatia featuring world-renowned DJs',
  })
  description?: string;

  @ApiProperty({
    description: 'Event start date and time (ISO 8601)',
    example: '2025-07-15T20:00:00Z',
  })
  startDate: Date;

  @ApiPropertyOptional({
    description: 'Event end date and time (ISO 8601)',
    example: '2025-07-18T06:00:00Z',
  })
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Ticket price',
    example: 75.0,
  })
  price?: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'EUR',
  })
  currency: string;

  @ApiPropertyOptional({
    description: 'Maximum attendees',
    example: 5000,
  })
  maxAttendees?: number;

  @ApiProperty({
    description: 'Event category',
    example: 'FESTIVAL',
  })
  category: string;

  @ApiPropertyOptional({
    description: 'Organizer name',
    example: 'Ultra Europe',
  })
  organizer?: string;

  @ApiPropertyOptional({
    description: 'Event website URL',
    example: 'https://ultraeurope.com',
  })
  website?: string;

  @ApiPropertyOptional({
    description: 'Ticket purchase URL',
    example: 'https://tickets.ultraeurope.com',
  })
  ticketUrl?: string;

  @ApiProperty({
    description: 'Whether the event is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2025-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at timestamp',
    example: '2025-01-15T10:00:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Location details',
  })
  location?: {
    id: number;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
  };

  @ApiPropertyOptional({
    description: 'Event photos',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        url: {
          type: 'string',
          example: 'https://example.com/photo.jpg',
        },
        altText: { type: 'string', example: 'Event photo' },
        isMain: { type: 'boolean', example: true },
      },
    },
  })
  photos?: Array<{
    id: number;
    url: string;
    altText?: string;
    isMain: boolean;
  }>;
}

export class EventListResponseDto {
  @ApiProperty({
    description: 'List of events',
    type: [EventResponseDto],
  })
  events: EventResponseDto[];

  @ApiProperty({
    description: 'Total count of events',
    example: 45,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total pages',
    example: 3,
  })
  totalPages: number;
}
