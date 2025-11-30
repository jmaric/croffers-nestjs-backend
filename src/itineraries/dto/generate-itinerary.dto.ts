import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateItineraryDto {
  @ApiProperty({
    description: 'Destination or starting location',
    example: 'Split, Croatia',
  })
  @IsString()
  @IsNotEmpty()
  destination: string;

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
    description: 'Number of travelers',
    example: 2,
    minimum: 1,
    maximum: 20,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  travelers?: number;

  @ApiPropertyOptional({
    description: 'Trip preferences (e.g., adventure, relaxation, culture, food)',
    example: ['beach', 'culture', 'food'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferences?: string[];

  @ApiPropertyOptional({
    description: 'Special requirements or notes',
    example: 'Vegetarian food options, accessible accommodations',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
