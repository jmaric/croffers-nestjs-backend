import { IsNumber, IsOptional, IsString, IsNotEmpty, Min } from 'class-validator';

export class RefundPaymentDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}