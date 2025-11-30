import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { PaymentStatus } from '../../../generated/prisma/client/client.js';
import { Type } from 'class-transformer';

export class FilterPaymentDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  bookingId?: number;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}