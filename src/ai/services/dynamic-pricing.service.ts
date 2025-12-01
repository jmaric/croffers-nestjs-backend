import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate dynamic pricing suggestions for a service
   */
  async generatePricingSuggestions(serviceId: number, supplierId: number) {
    this.logger.log(`Generating pricing suggestions for service ${serviceId}`);

    // Verify service belongs to supplier
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        supplierId,
      },
      include: {
        bookingItems: {
          where: {
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
          },
        },
      },
    });

    if (!service) {
      throw new ForbiddenException('Service not found or access denied');
    }

    const basePrice = parseFloat(service.price.toString());

    // Calculate demand multiplier based on bookings
    const demandMultiplier = this.calculateDemandMultiplier(
      service.bookingItems.length,
    );

    // Calculate seasonal multiplier
    const seasonalMultiplier = this.calculateSeasonalMultiplier();

    // Calculate crowd multiplier (if applicable)
    const crowdMultiplier = 1.0; // Placeholder

    // Calculate suggested price
    const suggestedPrice =
      basePrice * demandMultiplier * seasonalMultiplier * crowdMultiplier;

    const minPrice = basePrice * 0.8; // 20% discount minimum
    const maxPrice = basePrice * 1.5; // 50% markup maximum

    const finalPrice = Math.max(minPrice, Math.min(maxPrice, suggestedPrice));

    // Calculate confidence based on data availability
    const confidence = service.bookingItems.length > 10 ? 0.8 : 0.5;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // Next 30 days

    // Create pricing suggestion
    const pricingSuggestion = await this.prisma.dynamicPricing.create({
      data: {
        serviceId,
        startDate,
        endDate,
        basePrice,
        demandMultiplier,
        seasonalMultiplier,
        crowdMultiplier,
        suggestedPrice: finalPrice,
        minPrice,
        maxPrice,
        confidence,
        isActive: false, // Not applied by default
      },
    });

    return pricingSuggestion;
  }

  /**
   * Get pricing suggestions for a service
   */
  async getPricingSuggestions(serviceId: number, supplierId: number) {
    // Verify service belongs to supplier
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        supplierId,
      },
    });

    if (!service) {
      throw new ForbiddenException('Service not found or access denied');
    }

    const suggestions = await this.prisma.dynamicPricing.findMany({
      where: {
        serviceId,
        endDate: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return suggestions;
  }

  /**
   * Apply pricing suggestion
   */
  async applyPricingSuggestion(
    pricingId: number,
    serviceId: number,
    supplierId: number,
  ) {
    // Verify service belongs to supplier
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        supplierId,
      },
    });

    if (!service) {
      throw new ForbiddenException('Service not found or access denied');
    }

    const pricing = await this.prisma.dynamicPricing.findUnique({
      where: { id: pricingId },
    });

    if (!pricing || pricing.serviceId !== serviceId) {
      throw new ForbiddenException('Pricing suggestion not found');
    }

    // Apply pricing to service
    await this.prisma.service.update({
      where: { id: serviceId },
      data: { price: pricing.suggestedPrice },
    });

    // Mark pricing as applied
    await this.prisma.dynamicPricing.update({
      where: { id: pricingId },
      data: {
        isActive: true,
        appliedAt: new Date(),
      },
    });

    this.logger.log(`Applied dynamic pricing ${pricingId} to service ${serviceId}`);

    return { success: true };
  }

  /**
   * Calculate demand multiplier based on booking volume
   */
  private calculateDemandMultiplier(bookingCount: number): number {
    if (bookingCount > 50) return 1.3; // High demand
    if (bookingCount > 20) return 1.15; // Medium demand
    if (bookingCount > 5) return 1.0; // Normal demand
    return 0.9; // Low demand
  }

  /**
   * Calculate seasonal multiplier
   */
  private calculateSeasonalMultiplier(): number {
    const month = new Date().getMonth(); // 0-11

    // Peak season (June-August)
    if (month >= 5 && month <= 7) return 1.3;

    // Shoulder season (May, September)
    if (month === 4 || month === 8) return 1.1;

    // Low season
    return 0.9;
  }
}
