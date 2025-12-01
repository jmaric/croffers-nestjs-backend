import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsDateString,
  IsOptional,
  IsString,
  IsObject,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TravelPace {
  RELAXED = 'RELAXED', // More time at each location
  MODERATE = 'MODERATE', // Balanced pace
  FAST = 'FAST', // Quick transitions
}

export enum BudgetLevel {
  ECONOMY = 'ECONOMY',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  LUXURY = 'LUXURY',
}

export class TravelPreferencesDto {
  @ApiPropertyOptional({
    description: 'Travel pace preference',
    enum: TravelPace,
    example: TravelPace.MODERATE,
  })
  @IsOptional()
  @IsEnum(TravelPace)
  pace?: TravelPace;

  @ApiPropertyOptional({
    description: 'Budget level preference',
    enum: BudgetLevel,
    example: BudgetLevel.STANDARD,
  })
  @IsOptional()
  @IsEnum(BudgetLevel)
  budget?: BudgetLevel;

  @ApiPropertyOptional({
    description: 'Travel interests/activities',
    example: ['beach', 'nightlife', 'culture', 'adventure'],
  })
  @IsOptional()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({
    description: 'Accessibility requirements',
    example: ['wheelchair-accessible', 'elevator-required'],
  })
  @IsOptional()
  @IsString({ each: true })
  accessibility?: string[];

  @ApiPropertyOptional({
    description: 'Preferred transport types',
    example: ['FERRY', 'SPEEDBOAT'],
  })
  @IsOptional()
  @IsString({ each: true })
  preferredTransport?: string[];
}

export class PlanJourneyDto {
  @ApiProperty({
    description: 'Origin location ID (e.g., Split Airport)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  originLocationId: number;

  @ApiProperty({
    description: 'Destination location ID (e.g., Hvar)',
    example: 10,
  })
  @IsInt()
  @Min(1)
  destLocationId: number;

  @ApiProperty({
    description: 'Journey start date (ISO 8601)',
    example: '2025-07-15T10:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Journey end date (ISO 8601)',
    example: '2025-07-22T14:00:00Z',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Number of travelers',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  travelers: number;

  @ApiPropertyOptional({
    description: 'Optional name for the journey',
    example: 'Summer Vacation to Hvar',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Travel preferences',
    type: TravelPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  @Type(() => TravelPreferencesDto)
  preferences?: TravelPreferencesDto;

  @ApiPropertyOptional({
    description: 'Intermediate locations to visit',
    example: [5, 8],
  })
  @IsOptional()
  @IsInt({ each: true })
  intermediateLocations?: number[];
}
