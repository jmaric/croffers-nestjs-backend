import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateServiceDto } from './create-service.dto.js';

export class CreateTourServiceDto {
  @ValidateNested()
  @Type(() => CreateServiceDto)
  service: CreateServiceDto;

  @IsNumber()
  @IsNotEmpty()
  locationId: number;

  @IsString()
  @IsNotEmpty()
  tourType: string;

  @IsString()
  @IsOptional()
  meetingPoint?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  includes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludes?: string[];

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @IsNumber()
  @IsOptional()
  @Min(1)
  groupSizeMax?: number;

  @IsString()
  @IsOptional()
  cancellationPolicy?: string;
}