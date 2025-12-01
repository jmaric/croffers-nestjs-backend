import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SupplierAddonType } from '../../../generated/prisma/client/client.js';

export class SubscribeToAddonDto {
  @ApiProperty({
    description: 'Add-on type',
    enum: SupplierAddonType,
    example: SupplierAddonType.ANALYTICS_PRO,
  })
  @IsEnum(SupplierAddonType)
  addonType: SupplierAddonType;

  @ApiPropertyOptional({
    description: 'Stripe payment method ID',
    example: 'pm_1234567890',
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}

export class SupplierAddonResponseDto {
  @ApiProperty({ description: 'Add-on ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Supplier ID', example: 1 })
  supplierId: number;

  @ApiProperty({
    description: 'Add-on type',
    enum: SupplierAddonType,
    example: SupplierAddonType.ANALYTICS_PRO,
  })
  addonType: string;

  @ApiProperty({ description: 'Status', example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: 'Monthly price', example: 29.0 })
  monthlyPrice: number;

  @ApiProperty({ description: 'Currency', example: 'EUR' })
  currency: string;

  @ApiProperty({ description: 'Start date' })
  startDate: Date;

  @ApiProperty({ description: 'End date' })
  endDate?: Date;

  @ApiProperty({ description: 'Trial ends at' })
  trialEndsAt?: Date;

  @ApiProperty({ description: 'Cancel at period end', example: false })
  cancelAtPeriodEnd: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

export class AddonPricingDto {
  @ApiProperty({
    description: 'Add-on type',
    enum: SupplierAddonType,
  })
  type: SupplierAddonType;

  @ApiProperty({ description: 'Add-on name', example: 'Analytics Pro' })
  name: string;

  @ApiProperty({
    description: 'Description',
    example: 'Advanced analytics dashboard with detailed metrics',
  })
  description: string;

  @ApiProperty({ description: 'Monthly price', example: 29.0 })
  monthlyPrice: number;

  @ApiProperty({ description: 'Currency', example: 'EUR' })
  currency: string;

  @ApiProperty({
    description: 'Features included',
    type: [String],
    example: [
      'Real-time analytics dashboard',
      'Revenue forecasting',
      'Customer behavior insights',
    ],
  })
  features: string[];

  @ApiProperty({ description: 'Stripe price ID' })
  stripePriceId?: string;
}
