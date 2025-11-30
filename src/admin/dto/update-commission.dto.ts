import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommissionDto {
  @ApiProperty({
    description: 'New commission rate (0-1 scale, e.g., 0.15 = 15%)',
    example: 0.18,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate: number;
}
