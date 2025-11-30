import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SupplierStatus } from '../../../generated/prisma/client/client.js';

export class ApproveSupplierDto {
  @IsEnum(SupplierStatus)
  @IsNotEmpty()
  status: SupplierStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}