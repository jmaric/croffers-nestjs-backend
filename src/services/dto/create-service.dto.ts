import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType } from '../../../generated/prisma/client/client.js';

export class CreateServiceDto {
  @IsEnum(ServiceType)
  @IsNotEmpty()
  type: ServiceType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  duration?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}