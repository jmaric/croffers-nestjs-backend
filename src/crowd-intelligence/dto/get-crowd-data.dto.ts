import { IsInt, IsOptional, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetCrowdDataDto {
  @ApiPropertyOptional({
    description: 'Specific location ID',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  locationId?: number;

  @ApiPropertyOptional({
    description: 'Array of location IDs for batch query',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  locationIds?: number[];

  @ApiPropertyOptional({
    description: 'Start timestamp for historical data',
    example: '2025-12-01T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End timestamp for historical data',
    example: '2025-12-01T18:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Include predictions in response',
    example: true,
  })
  @IsOptional()
  includePredictions?: boolean;
}
