import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionService } from './services/subscription.service.js';
import { StripeWebhookService } from './services/stripe-webhook.service.js';
import { PremiumGuard } from './guards/premium.guard.js';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionService, StripeWebhookService, PremiumGuard],
  exports: [SubscriptionService, PremiumGuard],
})
export class SubscriptionsModule {}
