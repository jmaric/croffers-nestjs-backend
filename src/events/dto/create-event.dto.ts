import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsDateString,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsEnum,
  Min,
  MinLength,
} from 'class-validator';
import { EventCategory } from './search-events.dto.js';

export class CreateEventDto {
  @ApiProperty({
    description: 'Location ID where event takes place',
    example: 10,
  })
  @IsInt()
  @Min(1)
  locationId: number;

  @ApiProperty({
    description: 'Event name',
    example: 'Carpe Diem Beach Party',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example:
      'Join us for an unforgettable beach party at the famous Carpe Diem Beach Club',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Event start date and time (ISO 8601)',
    example: '2025-07-20T22:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: 'Event end date and time (ISO 8601)',
    example: '2025-07-21T06:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Ticket price',
    example: 30.0,
    minimum: 0,
  })
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'EUR',
    default: 'EUR',
  })
  @IsString()
  currency: string;

  @ApiPropertyOptional({
    description: 'Maximum number of attendees',
    example: 500,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttendees?: number;

  @ApiProperty({
    description: 'Event category',
    enum: EventCategory,
    example: EventCategory.BEACH_PARTY,
  })
  @IsEnum(EventCategory)
  category: EventCategory;

  @ApiPropertyOptional({
    description: 'Organizer name',
    example: 'Carpe Diem Beach Club',
  })
  @IsOptional()
  @IsString()
  organizer?: string;

  @ApiPropertyOptional({
    description: 'Event website URL',
    example: 'https://carpe-diem-beach.com',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Ticket purchase URL',
    example: 'https://tickets.carpe-diem-beach.com',
  })
  @IsOptional()
  @IsUrl()
  ticketUrl?: string;

  @ApiProperty({
    description: 'Whether the event is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  isActive: boolean;
}
