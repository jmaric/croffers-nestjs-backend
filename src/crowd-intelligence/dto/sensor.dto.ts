import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RegisterSensorDto {
  @ApiProperty({
    description: 'Location ID where sensor is installed',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  locationId: number;

  @ApiProperty({
    description: 'Sensor type',
    enum: ['wifi', 'ble', 'camera'],
    example: 'wifi',
  })
  @IsString()
  sensorType: string;

  @ApiProperty({ description: 'Sensor name', example: 'Beach Entrance WiFi Counter' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'MAC Address', example: '00:1B:44:11:3A:B7' })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiPropertyOptional({ description: 'IP Address', example: '192.168.1.100' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Maximum capacity this sensor can detect',
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Threshold for busy signal', example: 0.8 })
  @IsOptional()
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional({
    description: 'Physical location description',
    example: 'Main beach entrance, mounted on lifeguard tower',
  })
  @IsOptional()
  @IsString()
  location?: string;
}

export class SubmitSensorReadingDto {
  @ApiProperty({ description: 'Sensor ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  sensorId: number;

  @ApiProperty({
    description: 'Number of devices/people detected',
    example: 250,
  })
  @IsInt()
  @Type(() => Number)
  count: number;

  @ApiPropertyOptional({ description: 'Raw sensor value', example: 4.2 })
  @IsOptional()
  @IsNumber()
  rawValue?: number;

  @ApiPropertyOptional({ description: 'Reading confidence (0-1)', example: 0.95 })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiPropertyOptional({
    description: 'Timestamp of reading (ISO 8601)',
    example: '2025-12-01T14:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class UpdateSensorDto {
  @ApiPropertyOptional({ description: 'Sensor name', example: 'Beach Entrance WiFi Counter' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Is sensor active?', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum capacity',
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Threshold for busy signal', example: 0.8 })
  @IsOptional()
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional({
    description: 'Calibration factor',
    example: 1.2,
  })
  @IsOptional()
  @IsNumber()
  calibrationFactor?: number;
}
