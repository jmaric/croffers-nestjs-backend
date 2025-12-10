import { IsNotEmpty, IsString, IsEnum, IsNumber } from 'class-validator';
import { DisputeType } from '../../../generated/prisma/client/enums.js';

export class CreateDisputeDto {
  @IsNotEmpty()
  @IsNumber()
  bookingId: number;

  @IsNotEmpty()
  @IsEnum(DisputeType)
  type: DisputeType;

  @IsNotEmpty()
  @IsString()
  description: string;
}
