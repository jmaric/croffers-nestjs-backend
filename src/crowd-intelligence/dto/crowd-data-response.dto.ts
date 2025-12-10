import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CrowdLevel } from '../../../generated/prisma/client/client.js';

export class DataSourceScores {
  @ApiPropertyOptional({ description: 'Google Live score (0-100)', example: 75 })
  googleLive?: number;

  @ApiPropertyOptional({
    description: 'Google Historic score (0-100)',
    example: 65,
  })
  googleHistoric?: number;

  @ApiPropertyOptional({ description: 'Weather score (0-100)', example: 90 })
  weather?: number;

  @ApiPropertyOptional({ description: 'Event impact score (0-100)', example: 85 })
  event?: number;

  @ApiPropertyOptional({ description: 'Sensor score (0-100)', example: 72 })
  sensor?: number;
}

export class CrowdDataResponseDto {
  @ApiProperty({ description: 'Location ID', example: 1 })
  locationId: number;

  @ApiProperty({ description: 'Location name', example: 'Zlatni Rat Beach' })
  locationName: string;

  @ApiProperty({ description: 'Crowd Index (0-100)', example: 75 })
  crowdIndex: number;

  @ApiProperty({
    description: 'Human-readable crowd level',
    enum: CrowdLevel,
    example: CrowdLevel.BUSY,
  })
  crowdLevel: CrowdLevel;

  @ApiProperty({ description: 'Timestamp of the data', example: '2025-12-01T14:30:00Z' })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Individual data source scores',
    type: DataSourceScores,
  })
  dataSourceScores?: DataSourceScores;

  @ApiPropertyOptional({ description: 'Temperature in Celsius', example: 28 })
  temperature?: number;

  @ApiPropertyOptional({ description: 'Weather condition', example: 'sunny' })
  weatherCondition?: string;

  @ApiPropertyOptional({
    description: 'Active events at location',
    example: ['Beach Party', 'DJ Set'],
  })
  activeEvents?: string[];

  @ApiPropertyOptional({ description: 'Is this a prediction?', example: false })
  isPrediction?: boolean;

  @ApiPropertyOptional({
    description: 'Prediction confidence (0-1)',
    example: 0.85,
  })
  confidence?: number;

  @ApiPropertyOptional({
    description: 'Best time to visit recommendation',
    example: '10:00 AM - 12:00 PM',
  })
  bestTimeToVisit?: string;
}
