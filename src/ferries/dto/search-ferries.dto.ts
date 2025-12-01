import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsDateString,
  IsOptional,
  IsEnum,
  Min,
  IsBoolean,
} from 'class-validator';
import { FerryOperator } from '../../../generated/prisma/client/client.js';

export class SearchFerriesDto {
  @ApiProperty({
    description: 'Departure port location ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  departurePortId: number;

  @ApiProperty({
    description: 'Arrival port location ID',
    example: 10,
  })
  @IsInt()
  @Min(1)
  arrivalPortId: number;

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
    description: 'Number of vehicles',
    example: 1,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  vehicles?: number;

  @ApiPropertyOptional({
    description: 'Filter by ferry operator',
    enum: FerryOperator,
    example: FerryOperator.JADROLINIJA,
  })
  @IsOptional()
  @IsEnum(FerryOperator)
  operator?: FerryOperator;

  @ApiPropertyOptional({
    description: 'Include only schedules with available seats',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  availableOnly?: boolean;
}
