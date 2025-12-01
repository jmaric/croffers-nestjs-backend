import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum SubscriptionPlan {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Subscription plan',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.MONTHLY,
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Payment method ID from Stripe',
    example: 'pm_1234567890',
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}

export class SubscriptionResponseDto {
  @ApiProperty({ description: 'Subscription tier', example: 'PREMIUM' })
  tier: string;

  @ApiProperty({ description: 'Subscription status', example: 'active' })
  status: string;

  @ApiProperty({ description: 'Plan type', example: 'monthly' })
  plan: string;

  @ApiProperty({ description: 'Price', example: 4.99 })
  price: number;

  @ApiProperty({ description: 'Currency', example: 'EUR' })
  currency: string;

  @ApiProperty({ description: 'Current period start' })
  currentPeriodStart?: Date;

  @ApiProperty({ description: 'Current period end' })
  currentPeriodEnd?: Date;

  @ApiProperty({ description: 'Trial ends at' })
  trialEndsAt?: Date;

  @ApiProperty({ description: 'Cancel at period end', example: false })
  cancelAtPeriodEnd: boolean;

  @ApiProperty({ description: 'Features included', type: [String] })
  features: string[];
}

export class SubscriptionPlansDto {
  @ApiProperty({ description: 'Plan name', example: 'Free' })
  name: string;

  @ApiProperty({ description: 'Price', example: 0 })
  monthlyPrice: number;

  @ApiProperty({ description: 'Yearly price', example: 0 })
  yearlyPrice: number;

  @ApiProperty({ description: 'Currency', example: 'EUR' })
  currency: string;

  @ApiProperty({ description: 'Features', type: [String] })
  features: string[];

  @ApiProperty({ description: 'Stripe price ID (monthly)' })
  stripePriceIdMonthly?: string;

  @ApiProperty({ description: 'Stripe price ID (yearly)' })
  stripePriceIdYearly?: string;
}
