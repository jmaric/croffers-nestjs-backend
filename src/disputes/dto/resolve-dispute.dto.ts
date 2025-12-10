import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class ResolveDisputeDto {
  @IsNotEmpty()
  @IsString()
  resolution: string;

  @IsOptional()
  @IsNumber()
  refundAmount?: number;
}
