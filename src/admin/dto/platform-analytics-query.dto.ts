import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsPeriod {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class PlatformAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Time period for analytics',
    enum: AnalyticsPeriod,
    example: AnalyticsPeriod.MONTH,
  })
  @IsEnum(AnalyticsPeriod)
  @IsOptional()
  period?: AnalyticsPeriod;

  @ApiPropertyOptional({
    description: 'Custom start date (required if period is CUSTOM)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Custom end date (required if period is CUSTOM)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
