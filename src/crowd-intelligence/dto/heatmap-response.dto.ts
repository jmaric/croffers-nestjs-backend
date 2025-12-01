import { ApiProperty } from '@nestjs/swagger';
import { CrowdLevel } from '../../../generated/prisma/client/client.js';

export class HeatmapPoint {
  @ApiProperty({ description: 'Location ID', example: 1 })
  locationId: number;

  @ApiProperty({ description: 'Location name', example: 'Zlatni Rat Beach' })
  name: string;

  @ApiProperty({ description: 'Location type', example: 'BEACH' })
  type: string;

  @ApiProperty({ description: 'Latitude', example: 43.2569 })
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 16.6356 })
  longitude: number;

  @ApiProperty({ description: 'Crowd Index (0-100)', example: 75 })
  crowdIndex: number;

  @ApiProperty({
    description: 'Crowd level',
    enum: CrowdLevel,
    example: CrowdLevel.BUSY,
  })
  crowdLevel: CrowdLevel;

  @ApiProperty({ description: 'Color code for heatmap', example: '#FFA500' })
  color: string;
}

export class HeatmapResponseDto {
  @ApiProperty({
    description: 'Array of heatmap points',
    type: [HeatmapPoint],
  })
  points: HeatmapPoint[];

  @ApiProperty({ description: 'Timestamp of the heatmap', example: '2025-12-01T14:30:00Z' })
  timestamp: Date;

  @ApiProperty({ description: 'Total locations', example: 45 })
  totalLocations: number;
}
