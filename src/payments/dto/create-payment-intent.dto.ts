import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;
}