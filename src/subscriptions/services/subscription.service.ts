import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  CreateSubscriptionDto,
  SubscriptionResponseDto,
  SubscriptionPlansDto,
  SubscriptionPlan,
} from '../dto/subscription.dto.js';
import { SubscriptionEventType } from '../../../generated/prisma/client/client.js';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly stripe: Stripe;

  // Subscription Plans Configuration
  private readonly PLANS = {
    FREE: {
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        'Basic crowd data (current levels)',
        'Limited predictions (today only)',
        '3 price alerts',
        'Standard booking',
      ],
    },
    PREMIUM: {
      name: 'Premium',
      monthlyPrice: 4.99,
      yearlyPrice: 49.0, // Save ~17%
      features: [
        'Ad-free experience',
        '7-day crowd predictions',
        'Unlimited price alerts',
        'Best time to visit recommendations',
        'Priority booking',
        'Offline maps & itineraries',
        'Crowd history & trends',
        'Weather-adjusted predictions',
        'Exclusive deals (early access)',
      ],
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured');
    }
    this.stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
      apiVersion: '2025-11-17.clover',
    });
  }

  /**
   * Get available subscription plans
   */
  async getPlans(): Promise<SubscriptionPlansDto[]> {
    return [
      {
        name: this.PLANS.FREE.name,
        monthlyPrice: this.PLANS.FREE.monthlyPrice,
        yearlyPrice: this.PLANS.FREE.yearlyPrice,
        currency: 'EUR',
        features: this.PLANS.FREE.features,
      },
      {
        name: this.PLANS.PREMIUM.name,
        monthlyPrice: this.PLANS.PREMIUM.monthlyPrice,
        yearlyPrice: this.PLANS.PREMIUM.yearlyPrice,
        currency: 'EUR',
        features: this.PLANS.PREMIUM.features,
        stripePriceIdMonthly: this.configService.get<string>(
          'STRIPE_PREMIUM_MONTHLY_PRICE_ID',
        ),
        stripePriceIdYearly: this.configService.get<string>(
          'STRIPE_PREMIUM_YEARLY_PRICE_ID',
        ),
      },
    ];
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: number): Promise<SubscriptionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        trialEndsAt: true,
        cancelAtPeriodEnd: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tier = user.subscriptionTier || 'FREE';
    const plan = this.PLANS[tier as keyof typeof this.PLANS];

    // Determine actual plan (monthly/yearly) from Stripe if premium
    let planType = 'free';
    let price = 0;

    if (tier === 'PREMIUM' && user.stripeSubscriptionId) {
      try {
        const subscription = await this.stripe.subscriptions.retrieve(
          user.stripeSubscriptionId,
        );
        const interval = subscription.items.data[0]?.price.recurring?.interval;
        planType = interval === 'year' ? 'yearly' : 'monthly';
        price = interval === 'year' ? plan.yearlyPrice : plan.monthlyPrice;
      } catch (error) {
        this.logger.error(`Error fetching Stripe subscription: ${error.message}`);
        // Fallback to monthly
        planType = 'monthly';
        price = plan.monthlyPrice;
      }
    }

    return {
      tier,
      status: user.subscriptionStatus || 'none',
      plan: planType,
      price,
      currency: 'EUR',
      currentPeriodStart: user.subscriptionStartDate || undefined,
      currentPeriodEnd: user.subscriptionEndDate || undefined,
      trialEndsAt: user.trialEndsAt || undefined,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      features: plan.features,
    };
  }

  /**
   * Create premium subscription
   */
  async createSubscription(dto: CreateSubscriptionDto, userId: number) {
    this.logger.log(`Creating ${dto.plan} subscription for user ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.subscriptionTier === 'PREMIUM') {
      throw new BadRequestException('User already has an active subscription');
    }

    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        metadata: {
          userId: userId.toString(),
        },
      });
      stripeCustomerId = customer.id;

      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    // Attach payment method if provided
    if (dto.paymentMethodId) {
      await this.stripe.paymentMethods.attach(dto.paymentMethodId, {
        customer: stripeCustomerId,
      });

      await this.stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: dto.paymentMethodId,
        },
      });
    }

    // Get price ID
    const priceId =
      dto.plan === SubscriptionPlan.YEARLY
        ? this.configService.get<string>('STRIPE_PREMIUM_YEARLY_PRICE_ID')
        : this.configService.get<string>('STRIPE_PREMIUM_MONTHLY_PRICE_ID');

    if (!priceId) {
      throw new BadRequestException('Stripe price ID not configured');
    }

    // Create subscription with 7-day trial
    const subscription = await this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      trial_period_days: 7,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    // Update user in database
    const trialEnd = new Date(subscription.trial_end! * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: 'PREMIUM',
        subscriptionStatus: 'trialing',
        stripeSubscriptionId: subscription.id,
        subscriptionStartDate: new Date(subscription.created * 1000),
        subscriptionEndDate: (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000)
          : null,
        trialEndsAt: trialEnd,
      },
    });

    // Log event
    await this.logSubscriptionEvent({
      userId,
      eventType: SubscriptionEventType.SUBSCRIPTION_CREATED,
      subscriptionId: subscription.id,
      newTier: 'PREMIUM',
      amount: dto.plan === SubscriptionPlan.YEARLY ? 49.0 : 4.99,
    });

    await this.logSubscriptionEvent({
      userId,
      eventType: SubscriptionEventType.TRIAL_STARTED,
      subscriptionId: subscription.id,
      metadata: { trialEndsAt: trialEnd },
    });

    this.logger.log(`Subscription created for user ${userId}`);

    return {
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      status: subscription.status,
      trialEndsAt: trialEnd,
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: number, immediate: boolean = false) {
    this.logger.log(`Canceling subscription for user ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found');
    }

    if (immediate) {
      // Cancel immediately
      await this.stripe.subscriptions.cancel(user.stripeSubscriptionId);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: 'FREE',
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
          subscriptionEndDate: new Date(),
          cancelAtPeriodEnd: false,
        },
      });

      await this.logSubscriptionEvent({
        userId,
        eventType: SubscriptionEventType.SUBSCRIPTION_CANCELED,
        subscriptionId: user.stripeSubscriptionId,
        previousTier: 'PREMIUM',
        newTier: 'FREE',
      });
    } else {
      // Cancel at period end
      await this.stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          cancelAtPeriodEnd: true,
        },
      });
    }

    this.logger.log(`Subscription canceled for user ${userId}`);

    return { success: true, immediate };
  }

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.stripeSubscriptionId) {
      throw new BadRequestException('No subscription to resume');
    }

    if (!user.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not scheduled for cancellation');
    }

    // Resume subscription
    await this.stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        cancelAtPeriodEnd: false,
      },
    });

    this.logger.log(`Subscription resumed for user ${userId}`);

    return { success: true };
  }

  /**
   * Change subscription plan (upgrade/downgrade)
   */
  async changeSubscriptionPlan(userId: number, newPlan: SubscriptionPlan) {
    this.logger.log(`Changing subscription plan to ${newPlan} for user ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found');
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      user.stripeSubscriptionId,
    );

    const newPriceId =
      newPlan === SubscriptionPlan.YEARLY
        ? this.configService.get<string>('STRIPE_PREMIUM_YEARLY_PRICE_ID')
        : this.configService.get<string>('STRIPE_PREMIUM_MONTHLY_PRICE_ID');

    if (!newPriceId) {
      throw new BadRequestException('Stripe price ID not configured');
    }

    // Update subscription
    await this.stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    await this.logSubscriptionEvent({
      userId,
      eventType: SubscriptionEventType.SUBSCRIPTION_UPDATED,
      subscriptionId: user.stripeSubscriptionId,
      metadata: { newPlan },
    });

    this.logger.log(`Subscription plan changed for user ${userId}`);

    return { success: true, newPlan };
  }

  /**
   * Check if user has premium subscription
   */
  async isPremium(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });

    if (!user) return false;

    // Premium if tier is PREMIUM and either active or in trial
    if (user.subscriptionTier === 'PREMIUM') {
      if (user.subscriptionStatus === 'active') return true;
      if (user.subscriptionStatus === 'trialing') {
        // Check if trial hasn't expired
        if (user.trialEndsAt && user.trialEndsAt > new Date()) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Log subscription event
   */
  private async logSubscriptionEvent(data: {
    userId: number;
    eventType: SubscriptionEventType;
    subscriptionId?: string;
    previousTier?: string;
    newTier?: string;
    amount?: number;
    metadata?: any;
    stripeEventId?: string;
  }) {
    await this.prisma.subscriptionEvent.create({
      data: {
        userId: data.userId,
        eventType: data.eventType,
        subscriptionId: data.subscriptionId,
        previousTier: data.previousTier,
        newTier: data.newTier,
        amount: data.amount,
        metadata: data.metadata,
        stripeEventId: data.stripeEventId,
      },
    });
  }

  /**
   * Get subscription history
   */
  async getSubscriptionHistory(userId: number) {
    return this.prisma.subscriptionEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
