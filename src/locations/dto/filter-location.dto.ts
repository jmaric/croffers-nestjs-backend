import { IsEnum, IsOptional, IsString, IsBoolean, IsNumber, ValidateIf } from 'class-validator';
import { LocationType } from '../../../generated/prisma/client/client.js';
import { Type, Transform } from 'class-transformer';

export class FilterLocationDto {
  @IsEnum(LocationType)
  @IsOptional()
  type?: LocationType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'null' || value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : num;
  })
  parentId?: number | null;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  serviceLocationsOnly?: boolean;

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