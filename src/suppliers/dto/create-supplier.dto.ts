import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsOptional()
  registrationNum?: string;

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  commissionRate?: number;

  @IsString()
  @IsOptional()
  @IsEnum(['Basic', 'Premium', 'Enterprise'])
  subscriptionTier?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  payoutSchedule?: string;
}