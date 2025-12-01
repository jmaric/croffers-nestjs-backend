import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CreatePriceAlertDto,
  FlexibleDateSearchDto,
  FlexibleDateSearchResponseDto,
  FlexibleDateResult,
  PriceAlertResponseDto,
} from '../dto/price-alert.dto.js';
import { CrowdLevel } from '../../../generated/prisma/client/client.js';
import { SubscriptionService } from '../../subscriptions/services/subscription.service.js';

@Injectable()
export class PriceAlertService {
  private readonly logger = new Logger(PriceAlertService.name);
  private readonly FREE_ALERT_LIMIT = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Create a price alert
   */
  async createPriceAlert(dto: CreatePriceAlertDto, userId: number) {
    this.logger.log(`Creating price alert for user ${userId}, service ${dto.serviceId}`);

    // Check subscription limits
    const isPremium = await this.subscriptionService.isPremium(userId);

    if (!isPremium) {
      // Count active alerts for free user
      const activeAlertCount = await this.prisma.priceAlert.count({
        where: {
          userId,
          isActive: true,
        },
      });

      if (activeAlertCount >= this.FREE_ALERT_LIMIT) {
        throw new ForbiddenException(
          `Free users can create up to ${this.FREE_ALERT_LIMIT} price alerts. Upgrade to Premium for unlimited price alerts, 7-day crowd predictions, and more!`,
        );
      }
    }

    // Verify service exists
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException(`Service ${dto.serviceId} not found`);
    }

    // Validate alert configuration
    if (!dto.targetPrice && !dto.percentage) {
      throw new BadRequestException(
        'Either target price or percentage must be provided',
      );
    }

    const alert = await this.prisma.priceAlert.create({
      data: {
        userId,
        serviceId: dto.serviceId,
        alertType: dto.alertType,
        targetPrice: dto.targetPrice,
        percentage: dto.percentage,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        guests: dto.guests,
        isActive: true,
      },
    });

    this.logger.log(`Price alert created: ${alert.id}`);

    return this.mapToResponseDto(alert, service);
  }

  /**
   * Get user's price alerts
   */
  async getUserAlerts(userId: number) {
    const alerts = await this.prisma.priceAlert.findMany({
      where: { userId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((alert) => this.mapToResponseDto(alert, alert.service));
  }

  /**
   * Delete price alert
   */
  async deleteAlert(alertId: number, userId: number) {
    const alert = await this.prisma.priceAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    if (alert.userId !== userId) {
      throw new BadRequestException('You can only delete your own alerts');
    }

    await this.prisma.priceAlert.delete({
      where: { id: alertId },
    });

    this.logger.log(`Price alert ${alertId} deleted`);
  }

  /**
   * Flexible date search - find best prices across a date range
   */
  async flexibleDateSearch(
    dto: FlexibleDateSearchDto,
  ): Promise<FlexibleDateSearchResponseDto> {
    this.logger.log(
      `Flexible date search for service ${dto.serviceId} from ${dto.startDate} to ${dto.endDate}`,
    );

    // Get service details
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      include: {
        accommodationService: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service ${dto.serviceId} not found`);
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const results: FlexibleDateResult[] = [];

    // Iterate through each date in range
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dateStr = date.toISOString().split('T')[0];

      // Calculate price (can vary by season, demand, etc.)
      const basePrice = parseFloat(service.price.toString());
      const seasonalMultiplier = this.getSeasonalMultiplier(date);
      const price = Math.round(basePrice * seasonalMultiplier * 100) / 100;

      // Check availability (simplified - in reality check actual bookings)
      const available = await this.checkAvailability(dto.serviceId, date);

      // Get crowd level if location-based
      let crowdLevel: CrowdLevel | undefined;
      if (service.accommodationService?.locationId) {
        crowdLevel = await this.getCrowdLevelForDate(
          service.accommodationService.locationId,
          date,
        );
      }

      results.push({
        date: dateStr,
        price,
        available,
        isCheapest: false, // Will calculate after
        priceDifference: 0, // Will calculate after
        crowdLevel: crowdLevel ? crowdLevel.toString() : undefined,
      });
    }

    // Find cheapest price
    const prices = results.filter((r) => r.available).map((r) => r.price);
    const cheapestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const averagePrice =
      prices.length > 0
        ? prices.reduce((a, b) => a + b, 0) / prices.length
        : 0;

    // Mark cheapest and calculate differences
    results.forEach((result) => {
      if (result.available && result.price === cheapestPrice) {
        result.isCheapest = true;
      }
      result.priceDifference = Math.round((result.price - cheapestPrice) * 100) / 100;
    });

    // Find best value dates (cheap + low crowd)
    const bestValueDates = results
      .filter(
        (r) =>
          r.available &&
          r.price <= cheapestPrice * 1.1 && // Within 10% of cheapest
          (!r.crowdLevel ||
            r.crowdLevel === CrowdLevel.EMPTY ||
            r.crowdLevel === CrowdLevel.QUIET),
      )
      .map((r) => r.date)
      .slice(0, 3);

    return {
      serviceId: service.id,
      serviceName: service.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      guests: dto.guests,
      results,
      cheapestPrice,
      highestPrice,
      averagePrice: Math.round(averagePrice * 100) / 100,
      bestValueDates,
    };
  }

  /**
   * Cron job: Check price alerts every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkPriceAlerts() {
    this.logger.log('Checking price alerts');

    const activeAlerts = await this.prisma.priceAlert.findMany({
      where: {
        isActive: true,
        isTriggered: false,
      },
      include: {
        service: true,
        user: {
          select: { id: true, email: true, firstName: true },
        },
      },
    });

    for (const alert of activeAlerts) {
      try {
        if (!alert.service) continue;

        const currentPrice = parseFloat(alert.service.price.toString());
        let shouldTrigger = false;

        // Check target price
        if (alert.targetPrice && currentPrice <= parseFloat(alert.targetPrice.toString())) {
          shouldTrigger = true;
        }

        // Check percentage drop (need to store historical prices)
        if (alert.percentage) {
          // TODO: Implement historical price tracking
          // For now, skip percentage-based alerts
        }

        if (shouldTrigger) {
          await this.triggerAlert(alert);
        }
      } catch (error) {
        this.logger.error(
          `Error checking alert ${alert.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log('Price alert check completed');
  }

  /**
   * Trigger alert and send notification
   */
  private async triggerAlert(alert: any) {
    this.logger.log(`Triggering price alert ${alert.id}`);

    await this.prisma.priceAlert.update({
      where: { id: alert.id },
      data: {
        isTriggered: true,
        triggeredAt: new Date(),
      },
    });

    // Create notification
    await this.prisma.notification.create({
      data: {
        userId: alert.userId,
        type: 'PROMOTIONAL',
        title: 'Price Alert: Price Drop!',
        message: `${alert.service.name} is now ${alert.service.currency} ${alert.service.price}!`,
        actionUrl: `/services/${alert.serviceId}`,
        metadata: {
          alertId: alert.id,
          serviceId: alert.serviceId,
          price: alert.service.price.toString(),
        },
      },
    });

    // TODO: Send email notification
    this.logger.log(`Price alert ${alert.id} triggered for user ${alert.user.email}`);
  }

  /**
   * Helper: Get seasonal multiplier
   */
  private getSeasonalMultiplier(date: Date): number {
    const month = date.getMonth();

    // High season: June-August
    if (month >= 5 && month <= 7) return 1.3;

    // Shoulder season: May, September
    if (month === 4 || month === 8) return 1.1;

    // Low season: October-April
    return 0.9;
  }

  /**
   * Helper: Check availability for date
   */
  private async checkAvailability(serviceId: number, date: Date): Promise<boolean> {
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        bookingItems: {
          some: { serviceId },
        },
        serviceDate: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    // Simplified - in reality check capacity
    return existingBookings.length < 10;
  }

  /**
   * Helper: Get crowd level for date
   */
  private async getCrowdLevelForDate(
    locationId: number,
    date: Date,
  ): Promise<CrowdLevel | undefined> {
    const prediction = await this.prisma.crowdPrediction.findFirst({
      where: {
        locationId,
        predictionFor: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
      },
      orderBy: { predictionFor: 'asc' },
    });

    return prediction?.predictedLevel;
  }

  /**
   * Helper: Map to response DTO
   */
  private mapToResponseDto(alert: any, service: any): PriceAlertResponseDto {
    return {
      id: alert.id,
      serviceId: alert.serviceId,
      serviceName: service.name,
      alertType: alert.alertType,
      targetPrice: alert.targetPrice ? parseFloat(alert.targetPrice.toString()) : undefined,
      percentage: alert.percentage,
      currentPrice: parseFloat(service.price.toString()),
      isActive: alert.isActive,
      isTriggered: alert.isTriggered,
      triggeredAt: alert.triggeredAt,
      createdAt: alert.createdAt,
    };
  }
}
