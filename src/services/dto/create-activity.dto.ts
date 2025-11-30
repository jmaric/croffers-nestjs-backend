import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateServiceDto } from './create-service.dto.js';

export class CreateActivityServiceDto {
  @ValidateNested()
  @Type(() => CreateServiceDto)
  service: CreateServiceDto;

  @IsNumber()
  @IsNotEmpty()
  locationId: number;

  @IsString()
  @IsNotEmpty()
  activityType: string;

  @IsString()
  @IsOptional()
  ageRestriction?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  equipment?: string[];

  @IsString()
  @IsOptional()
  skillLevel?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  seasonality?: string[];
}