import { IsEnum, IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DisputeResolution {
  FULL_REFUND = 'full_refund',
  PARTIAL_REFUND = 'partial_refund',
  NO_REFUND = 'no_refund',
  FAVOR_SUPPLIER = 'favor_supplier',
  FAVOR_GUEST = 'favor_guest',
}

export class ResolveDisputeDto {
  @ApiProperty({
    description: 'Resolution decision',
    enum: DisputeResolution,
    example: DisputeResolution.PARTIAL_REFUND,
  })
  @IsEnum(DisputeResolution)
  resolution: DisputeResolution;

  @ApiPropertyOptional({
    description: 'Refund percentage (0-100) if partial refund',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  refundPercentage?: number;

  @ApiProperty({
    description: 'Admin notes explaining the decision',
    example: 'Service was cancelled by supplier 24h before booking date. Guest entitled to 50% refund per policy.',
  })
  @IsString()
  adminNotes: string;
}
