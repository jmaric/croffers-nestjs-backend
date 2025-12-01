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
  SubscribeToAddonDto,
  SupplierAddonResponseDto,
  AddonPricingDto,
} from '../dto/supplier-addon.dto.js';
import { SupplierAddonType, AddonStatus } from '../../../generated/prisma/client/client.js';

@Injectable()
export class SupplierAddonService {
  private readonly logger = new Logger(SupplierAddonService.name);
  private readonly stripe: Stripe;

  // Add-on pricing configuration
  private readonly ADDON_PRICING = {
    [SupplierAddonType.ANALYTICS_PRO]: {
      name: 'Analytics Pro',
      description: 'Advanced analytics dashboard with detailed metrics',
      monthlyPrice: 29.0,
      features: [
        'Real-time analytics dashboard',
        'Revenue forecasting',
        'Customer behavior insights',
        'Booking patterns analysis',
        'Competitor benchmarking',
        'Custom reports export',
      ],
    },
    [SupplierAddonType.API_ACCESS]: {
      name: 'API Access',
      description: 'REST API access for custom integrations',
      monthlyPrice: 49.0,
      features: [
        'Full REST API access',
        'Webhook notifications',
        'Up to 10,000 requests/hour',
        'API documentation',
        'Test environment',
        'Priority API support',
      ],
    },
    [SupplierAddonType.MARKETING_SUITE]: {
      name: 'Marketing Suite',
      description: 'Promoted listings and featured badges',
      monthlyPrice: 39.0,
      features: [
        'Featured badge on listings',
        'Top search placement',
        '50% boost to search ranking',
        'Performance analytics',
        'A/B testing tools',
        'Social media integration',
      ],
    },
    [SupplierAddonType.COMMISSION_REDUCTION]: {
      name: 'Commission Reduction',
      description: 'Reduce platform commission from 15% to 10%',
      monthlyPrice: 99.0,
      features: [
        'Reduced commission rate (15% → 10%)',
        'Savings on all bookings',
        'Priority payout processing',
        'Dedicated account manager',
        'Quarterly business reviews',
      ],
    },
    [SupplierAddonType.PRIORITY_SUPPORT]: {
      name: 'Priority Support',
      description: 'Dedicated support channel with faster response times',
      monthlyPrice: 19.0,
      features: [
        '2-hour response time guarantee',
        'Dedicated support agent',
        'Direct phone line',
        'Priority bug fixes',
        'Feature request priority',
        'Monthly check-in calls',
      ],
    },
  };

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
   * Get all available add-ons with pricing
   */
  async getAvailableAddons(): Promise<AddonPricingDto[]> {
    return Object.entries(this.ADDON_PRICING).map(([type, config]) => ({
      type: type as SupplierAddonType,
      name: config.name,
      description: config.description,
      monthlyPrice: config.monthlyPrice,
      currency: 'EUR',
      features: config.features,
      stripePriceId: this.configService.get<string>(`STRIPE_ADDON_${type}_PRICE_ID`),
    }));
  }

  /**
   * Get supplier's active add-ons
   */
  async getSupplierAddons(supplierId: number): Promise<SupplierAddonResponseDto[]> {
    const addons = await this.prisma.supplierAddon.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
    });

    return addons.map((addon) => this.mapToResponseDto(addon));
  }

  /**
   * Subscribe to an add-on
   */
  async subscribeToAddon(dto: SubscribeToAddonDto, supplierId: number) {
    this.logger.log(`Supplier ${supplierId} subscribing to ${dto.addonType}`);

    // Check if already subscribed
    const existingAddon = await this.prisma.supplierAddon.findFirst({
      where: {
        supplierId,
        addonType: dto.addonType,
        status: AddonStatus.ACTIVE,
      },
    });

    if (existingAddon) {
      throw new BadRequestException(
        `Already subscribed to ${dto.addonType}. Cancel existing subscription first.`,
      );
    }

    // Get supplier and ensure Stripe customer exists
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { user: true },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    let stripeCustomerId = supplier.user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: supplier.user.email,
        name: supplier.businessName,
        metadata: {
          userId: supplier.userId.toString(),
          supplierId: supplierId.toString(),
        },
      });
      stripeCustomerId = customer.id;

      await this.prisma.user.update({
        where: { id: supplier.userId },
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

    // Get price ID from config
    const priceId = this.configService.get<string>(
      `STRIPE_ADDON_${dto.addonType}_PRICE_ID`,
    );

    if (!priceId) {
      throw new BadRequestException(
        `Stripe price ID not configured for ${dto.addonType}`,
      );
    }

    // Create Stripe subscription
    const subscription = await this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    // Create add-on record
    const addon = await this.prisma.supplierAddon.create({
      data: {
        supplierId,
        addonType: dto.addonType,
        status: AddonStatus.ACTIVE,
        monthlyPrice: this.ADDON_PRICING[dto.addonType].monthlyPrice,
        currency: 'EUR',
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        startDate: new Date(),
      },
    });

    this.logger.log(`Add-on ${dto.addonType} activated for supplier ${supplierId}`);

    return {
      ...this.mapToResponseDto(addon),
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      subscriptionId: subscription.id,
    };
  }

  /**
   * Cancel add-on subscription
   */
  async cancelAddon(addonId: number, supplierId: number, immediate: boolean = false) {
    const addon = await this.prisma.supplierAddon.findUnique({
      where: { id: addonId },
    });

    if (!addon) {
      throw new NotFoundException('Add-on not found');
    }

    if (addon.supplierId !== supplierId) {
      throw new BadRequestException('You can only cancel your own add-ons');
    }

    if (addon.status !== AddonStatus.ACTIVE) {
      throw new BadRequestException('Add-on is not active');
    }

    if (!addon.stripeSubscriptionId) {
      throw new BadRequestException('No Stripe subscription found');
    }

    if (immediate) {
      // Cancel immediately
      await this.stripe.subscriptions.cancel(addon.stripeSubscriptionId);

      await this.prisma.supplierAddon.update({
        where: { id: addonId },
        data: {
          status: AddonStatus.CANCELED,
          endDate: new Date(),
          cancelAtPeriodEnd: false,
        },
      });
    } else {
      // Cancel at period end
      await this.stripe.subscriptions.update(addon.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await this.prisma.supplierAddon.update({
        where: { id: addonId },
        data: {
          cancelAtPeriodEnd: true,
        },
      });
    }

    this.logger.log(`Add-on ${addonId} canceled for supplier ${supplierId}`);

    return { success: true, immediate };
  }

  /**
   * Check if supplier has specific add-on active
   */
  async hasAddon(supplierId: number, addonType: SupplierAddonType): Promise<boolean> {
    const addon = await this.prisma.supplierAddon.findFirst({
      where: {
        supplierId,
        addonType,
        status: AddonStatus.ACTIVE,
      },
    });

    return !!addon;
  }

  /**
   * Get effective commission rate for supplier
   */
  async getEffectiveCommissionRate(supplierId: number): Promise<number> {
    const hasCommissionReduction = await this.hasAddon(
      supplierId,
      SupplierAddonType.COMMISSION_REDUCTION,
    );

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (hasCommissionReduction) {
      return 0.1; // 10%
    }

    return supplier?.commissionRate || 0.15; // Default 15%
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(addon: any): SupplierAddonResponseDto {
    return {
      id: addon.id,
      supplierId: addon.supplierId,
      addonType: addon.addonType,
      status: addon.status,
      monthlyPrice: parseFloat(addon.monthlyPrice.toString()),
      currency: addon.currency,
      startDate: addon.startDate,
      endDate: addon.endDate,
      trialEndsAt: addon.trialEndsAt,
      cancelAtPeriodEnd: addon.cancelAtPeriodEnd,
      createdAt: addon.createdAt,
    };
  }
}
