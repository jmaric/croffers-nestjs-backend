import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccommodationType } from '../../../generated/prisma/client/client.js';
import { CreateServiceDto } from './create-service.dto.js';

export class CreateAccommodationServiceDto {
  @ValidateNested()
  @Type(() => CreateServiceDto)
  service: CreateServiceDto;

  @IsNumber()
  @IsNotEmpty()
  locationId: number;

  @IsEnum(AccommodationType)
  @IsNotEmpty()
  accommodationType: AccommodationType;

  @IsNumber()
  @IsOptional()
  @Min(1)
  bedrooms?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  bathrooms?: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  maxGuests: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsString()
  @IsOptional()
  checkInTime?: string;

  @IsString()
  @IsOptional()
  checkOutTime?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  minimumStay?: number;

  @IsBoolean()
  @IsOptional()
  instantBook?: boolean;
}