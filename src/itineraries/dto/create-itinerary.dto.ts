import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItineraryDto {
  @ApiProperty({
    description: 'Trip name',
    example: 'Croatian Island Hopping Adventure',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Trip description',
    example: 'A 7-day journey exploring the beautiful Croatian islands',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Trip start date',
    example: '2024-06-15T00:00:00.000Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Trip end date',
    example: '2024-06-22T00:00:00.000Z',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Total budget for the trip',
    example: 2000,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  totalBudget?: number;

  @ApiPropertyOptional({
    description: 'Currency for budget',
    example: 'EUR',
    default: 'EUR',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Make itinerary publicly viewable',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Structured itinerary data (days, activities, etc.)',
    example: {
      days: [
        {
          day: 1,
          date: '2024-06-15',
          activities: [
            {
              time: '10:00',
              title: 'Arrive in Split',
              description: 'Check into hotel',
              location: 'Split',
            },
          ],
        },
      ],
    },
  })
  @IsObject()
  @IsOptional()
  data?: any;
}
