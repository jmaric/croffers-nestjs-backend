import {
  IsInt,
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsNumber,
  Min,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PackageServiceItem {
  @ApiProperty({ description: 'Service ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  serviceId: number;

  @ApiProperty({ description: 'Quantity', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'Is this service optional?', example: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

export class CreatePackageDto {
  @ApiProperty({ description: 'Package name', example: 'Hvar Weekend Getaway' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Package description',
    example: 'Villa accommodation + ferry tickets + island tour',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Services included in package',
    type: [PackageServiceItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageServiceItem)
  services: PackageServiceItem[];

  @ApiProperty({ description: 'Package price', example: 450 })
  @IsNumber()
  @Min(0)
  packagePrice: number;

  @ApiPropertyOptional({
    description: 'Valid from date',
    example: '2025-06-01',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'Valid until date',
    example: '2025-09-30',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Maximum guests', example: 6 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  maxGuests?: number;

  @ApiPropertyOptional({ description: 'Minimum guests', example: 2 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  minGuests?: number;

  @ApiPropertyOptional({
    description: 'Tags for filtering',
    example: ['summer', 'adventure', 'family'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Image URL',
    example: 'https://example.com/package.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class BookPackageDto {
  @ApiProperty({ description: 'Package ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  packageId: number;

  @ApiProperty({ description: 'Service date', example: '2025-12-15' })
  @IsDateString()
  serviceDate: string;

  @ApiProperty({ description: 'Number of guests', example: 4 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guests: number;

  @ApiPropertyOptional({
    description: 'Optional service IDs to include',
    example: [3, 5],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  optionalServices?: number[];

  @ApiPropertyOptional({
    description: 'Special requirements',
    example: 'Early check-in requested',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PackageResponseDto {
  @ApiProperty({ description: 'Package ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Package name', example: 'Hvar Weekend Getaway' })
  name: string;

  @ApiProperty({ description: 'Description' })
  description?: string;

  @ApiProperty({ description: 'Package price', example: 450 })
  packagePrice: number;

  @ApiProperty({ description: 'Regular price', example: 550 })
  regularPrice: number;

  @ApiProperty({ description: 'Savings', example: 100 })
  savings: number;

  @ApiProperty({ description: 'Currency', example: 'EUR' })
  currency: string;

  @ApiProperty({ description: 'Status', example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: 'Services included' })
  services: {
    id: number;
    name: string;
    type: string;
    quantity: number;
    isOptional: boolean;
  }[];

  @ApiProperty({ description: 'Valid from' })
  validFrom?: Date;

  @ApiProperty({ description: 'Valid until' })
  validUntil?: Date;

  @ApiProperty({ description: 'Guest capacity' })
  minGuests: number;
  maxGuests?: number;

  @ApiProperty({ description: 'Tags' })
  tags: string[];

  @ApiProperty({ description: 'Image URL' })
  imageUrl?: string;
}
