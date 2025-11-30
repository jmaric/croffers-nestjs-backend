import { IsEnum, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { LocationType } from '../../../generated/prisma/client/client.js';
import { Type } from 'class-transformer';

export class FilterLocationDto {
  @IsEnum(LocationType)
  @IsOptional()
  type?: LocationType;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  parentId?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}