import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsDateString,
  IsOptional,
  IsEnum,
  Min,
  IsBoolean,
} from 'class-validator';
import { BusOperator } from '../../../generated/prisma/client/client.js';

export class SearchBusesDto {
  @ApiProperty({
    description: 'Departure stop location ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  departureStopId: number;

  @ApiProperty({
    description: 'Arrival stop location ID',
    example: 10,
  })
  @IsInt()
  @Min(1)
  arrivalStopId: number;

  @ApiProperty({
    description: 'Departure date (ISO 8601)',
    example: '2025-07-15',
  })
  @IsDateString()
  departureDate: string;

  @ApiPropertyOptional({
    description: 'Return date for round trip (ISO 8601)',
    example: '2025-07-22',
  })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiPropertyOptional({
    description: 'Number of adult passengers',
    example: 2,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number;

  @ApiPropertyOptional({
    description: 'Number of children',
    example: 1,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @ApiPropertyOptional({
    description: 'Number of seniors',
    example: 1,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  seniors?: number;

  @ApiPropertyOptional({
    description: 'Filter by bus operator',
    enum: BusOperator,
    example: BusOperator.FLIXBUS,
  })
  @IsOptional()
  @IsEnum(BusOperator)
  operator?: BusOperator;

  @ApiPropertyOptional({
    description: 'Include only schedules with available seats',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  availableOnly?: boolean;
}
