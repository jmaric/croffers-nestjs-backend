import { IsInt, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchFerrySchedulesDto {
  @ApiProperty({
    description: 'Departure port location ID',
    example: 2,
  })
  @IsInt()
  @Type(() => Number)
  departurePortId: number;

  @ApiProperty({
    description: 'Arrival port location ID',
    example: 8,
  })
  @IsInt()
  @Type(() => Number)
  arrivalPortId: number;

  @ApiProperty({
    description: 'Travel date (YYYY-MM-DD)',
    example: '2025-06-15',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Number of passengers',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  passengers?: number;
}

export class SearchBusSchedulesDto {
  @ApiProperty({
    description: 'Departure stop location ID',
    example: 3,
  })
  @IsInt()
  @Type(() => Number)
  departureStopId: number;

  @ApiProperty({
    description: 'Arrival stop location ID',
    example: 2,
  })
  @IsInt()
  @Type(() => Number)
  arrivalStopId: number;

  @ApiProperty({
    description: 'Travel date (YYYY-MM-DD)',
    example: '2025-06-15',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Number of passengers',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  passengers?: number;
}
