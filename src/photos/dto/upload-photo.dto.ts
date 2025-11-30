import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UploadPhotoDto {
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

  @IsString()
  @IsOptional()
  altText?: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isMain?: boolean;
}