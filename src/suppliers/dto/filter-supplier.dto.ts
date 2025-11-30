import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { SupplierStatus } from '../../../generated/prisma/client/client.js';
import { Type } from 'class-transformer';

export class FilterSupplierDto {
  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus;

  @IsString()
  @IsOptional()
  subscriptionTier?: string;

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