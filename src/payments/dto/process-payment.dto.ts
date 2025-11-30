import { IsNumber, IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/client/client.js';

export class ProcessPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method: PaymentMethod;
}