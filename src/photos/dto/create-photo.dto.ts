import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreatePhotoDto {
  @IsNumber()
  @IsOptional()
  serviceId?: number;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsNumber()
  @IsOptional()
  eventId?: number;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  altText?: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isMain?: boolean;
}