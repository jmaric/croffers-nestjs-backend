import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionEventType } from '../../../generated/prisma/client/client.js';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
      apiVersion: '2025-11-17.clover',
    });
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET not configured');
      throw new Error('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new Error(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    // Check for duplicate events
    const existingEvent = await this.prisma.subscriptionEvent.findFirst({
      where: { stripeEventId: event.id },
    });

    if (existingEvent) {
      this.logger.warn(`Duplicate webhook event ignored: ${event.id}`);
      return { received: true, duplicate: true };
    }

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const user = await this.findUserByStripeCustomer(subscription.customer as string);
    if (!user) return;

    this.logger.log(`Subscription created for user ${user.id}`);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: 'PREMIUM',
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
        subscriptionStartDate: new Date(subscription.created * 1000),
        subscriptionEndDate: (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000)
          : null,
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
      },
    });

    await this.logEvent(user.id, SubscriptionEventType.SUBSCRIPTION_CREATED, subscription);
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const user = await this.findUserByStripeCustomer(subscription.customer as string);
    if (!user) return;

    this.logger.log(`Subscription updated for user ${user.id}`);

    const status = subscription.status;
    const tier = status === 'active' || status === 'trialing' ? 'PREMIUM' : 'FREE';

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: status,
        subscriptionEndDate: (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000)
          : null,
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    await this.logEvent(user.id, SubscriptionEventType.SUBSCRIPTION_UPDATED, subscription);
  }

  /**
   * Handle subscription deleted (canceled)
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const user = await this.findUserByStripeCustomer(subscription.customer as string);
    if (!user) return;

    this.logger.log(`Subscription deleted for user ${user.id}`);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: 'FREE',
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
        subscriptionEndDate: new Date(),
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
      },
    });

    await this.logEvent(user.id, SubscriptionEventType.SUBSCRIPTION_CANCELED, subscription);

    // Send notification
    await this.prisma.notification.create({
      data: {
        userId: user.id,
        type: 'PROMOTIONAL',
        title: 'Subscription Canceled',
        message:
          'Your premium subscription has been canceled. You can resubscribe anytime to regain access to premium features.',
      },
    });
  }

  /**
   * Handle trial will end (3 days before)
   */
  private async handleTrialWillEnd(subscription: Stripe.Subscription) {
    const user = await this.findUserByStripeCustomer(subscription.customer as string);
    if (!user) return;

    this.logger.log(`Trial ending soon for user ${user.id}`);

    await this.logEvent(user.id, SubscriptionEventType.TRIAL_ENDED, subscription);

    // Send notification
    const trialEndDate = new Date(subscription.trial_end! * 1000);
    await this.prisma.notification.create({
      data: {
        userId: user.id,
        type: 'PROMOTIONAL',
        title: 'Trial Ending Soon',
        message: `Your 7-day trial ends on ${trialEndDate.toLocaleDateString()}. You'll be charged automatically to continue enjoying premium features.`,
      },
    });
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    if (!(invoice as any).subscription || typeof (invoice as any).subscription !== 'string') return;

    const user = await this.findUserByStripeCustomer(invoice.customer as string);
    if (!user) return;

    this.logger.log(`Payment succeeded for user ${user.id}`);

    // Ensure subscription is active
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'active',
      },
    });

    await this.logEvent(
      user.id,
      SubscriptionEventType.PAYMENT_SUCCESS,
      invoice,
      invoice.amount_paid / 100,
    );

    // Send receipt notification
    await this.prisma.notification.create({
      data: {
        userId: user.id,
        type: 'PROMOTIONAL',
        title: 'Payment Received',
        message: `Thank you! Your payment of €${(invoice.amount_paid / 100).toFixed(2)} has been processed successfully.`,
        metadata: {
          invoiceId: invoice.id,
          amount: invoice.amount_paid / 100,
        },
      },
    });
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    if (!(invoice as any).subscription || typeof (invoice as any).subscription !== 'string') return;

    const user = await this.findUserByStripeCustomer(invoice.customer as string);
    if (!user) return;

    this.logger.log(`Payment failed for user ${user.id}`);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'past_due',
      },
    });

    await this.logEvent(
      user.id,
      SubscriptionEventType.PAYMENT_FAILED,
      invoice,
      invoice.amount_due / 100,
    );

    // Send payment failed notification
    await this.prisma.notification.create({
      data: {
        userId: user.id,
        type: 'PROMOTIONAL',
        title: 'Payment Failed',
        message:
          'We couldn\'t process your payment. Please update your payment method to avoid service interruption.',
        actionUrl: '/settings/subscription',
      },
    });
  }

  /**
   * Find user by Stripe customer ID
   */
  private async findUserByStripeCustomer(customerId: string) {
    return this.prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });
  }

  /**
   * Log subscription event
   */
  private async logEvent(
    userId: number,
    eventType: SubscriptionEventType,
    stripeObject: any,
    amount?: number,
  ) {
    await this.prisma.subscriptionEvent.create({
      data: {
        userId,
        eventType,
        subscriptionId: stripeObject.id,
        amount: amount,
        metadata: {
          status: stripeObject.status,
          object: stripeObject.object,
        },
        stripeEventId: stripeObject.id,
      },
    });
  }
}
