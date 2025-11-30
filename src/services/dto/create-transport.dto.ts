import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransportType } from '../../../generated/prisma/client/client.js';
import { CreateServiceDto } from './create-service.dto.js';

export class CreateTransportServiceDto {
  @ValidateNested()
  @Type(() => CreateServiceDto)
  service: CreateServiceDto;

  @IsEnum(TransportType)
  @IsNotEmpty()
  transportType: TransportType;

  @IsNumber()
  @IsNotEmpty()
  departureLocationId: number;

  @IsNumber()
  @IsNotEmpty()
  arrivalLocationId: number;

  @IsDateString()
  @IsOptional()
  departureTime?: string;

  @IsDateString()
  @IsOptional()
  arrivalTime?: string;

  @IsBoolean()
  @IsOptional()
  isScheduled?: boolean;

  @IsNumber()
  @IsOptional()
  vehicleCapacity?: number;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];
}