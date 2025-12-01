import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CrowdLevel } from '../../../generated/prisma/client/client.js';

export class HourlyPrediction {
  @ApiProperty({ description: 'Hour of day (0-23)', example: 14 })
  hour: number;

  @ApiProperty({ description: 'Predicted crowd index (0-100)', example: 75 })
  predictedIndex: number;

  @ApiProperty({
    description: 'Predicted crowd level',
    enum: CrowdLevel,
    example: CrowdLevel.BUSY,
  })
  predictedLevel: CrowdLevel;

  @ApiProperty({ description: 'Prediction confidence (0-1)', example: 0.85 })
  confidence: number;

  @ApiProperty({ description: 'Is this the best time?', example: false })
  isBestTime: boolean;
}

export class PredictionResponseDto {
  @ApiProperty({ description: 'Location ID', example: 1 })
  locationId: number;

  @ApiProperty({ description: 'Location name', example: 'Zlatni Rat Beach' })
  locationName: string;

  @ApiProperty({ description: 'Prediction date', example: '2025-12-01' })
  date: string;

  @ApiProperty({
    description: 'Hourly predictions for the day',
    type: [HourlyPrediction],
  })
  hourlyPredictions: HourlyPrediction[];

  @ApiPropertyOptional({
    description: 'Best time to visit (hour)',
    example: 10,
  })
  bestTimeHour?: number;

  @ApiPropertyOptional({
    description: 'Weather forecast',
    example: { temperature: 28, condition: 'sunny' },
  })
  weatherForecast?: {
    temperature: number;
    condition: string;
  };

  @ApiPropertyOptional({
    description: 'Upcoming events',
    example: ['Beach Party at 8 PM'],
  })
  upcomingEvents?: string[];
}
