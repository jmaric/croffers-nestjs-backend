import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsPeriod {
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_YEAR = 'this_year',
  CUSTOM = 'custom',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Time period for analytics',
    enum: AnalyticsPeriod,
    example: AnalyticsPeriod.LAST_30_DAYS,
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
