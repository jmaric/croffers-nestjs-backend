import { IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterPhotoDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  serviceId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  locationId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  eventId?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isMain?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}