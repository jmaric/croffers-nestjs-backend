import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreatePromotedListingDto,
  UpdatePromotedListingDto,
  PromotedListingResponseDto,
} from '../dto/promoted-listing.dto.js';
import { SupplierAddonType } from '../../../generated/prisma/client/client.js';
import { SupplierAddonService } from './supplier-addon.service.js';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly addonService: SupplierAddonService,
  ) {}

  /**
   * Create promoted listing
   */
  async createPromotedListing(
    dto: CreatePromotedListingDto,
    supplierId: number,
  ): Promise<PromotedListingResponseDto> {
    this.logger.log(
      `Creating promoted listing for service ${dto.serviceId}, supplier ${supplierId}`,
    );

    // Check if supplier has Marketing Suite add-on
    const hasMarketingSuite = await this.addonService.hasAddon(
      supplierId,
      SupplierAddonType.MARKETING_SUITE,
    );

    if (!hasMarketingSuite) {
      throw new ForbiddenException(
        'Marketing Suite add-on required. Subscribe to Marketing Suite (€39/month) to promote listings.',
      );
    }

    // Verify service exists and belongs to supplier
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.supplierId !== supplierId) {
      throw new BadRequestException('You can only promote your own services');
    }

    // Check if service is already promoted
    const existingPromotion = await this.prisma.promotedListing.findFirst({
      where: {
        serviceId: dto.serviceId,
        isActive: true,
        endDate: {
          gte: new Date(),
        },
      },
    });

    if (existingPromotion) {
      throw new BadRequestException('Service is already promoted');
    }

    // Create promoted listing
    const promotion = await this.prisma.promotedListing.create({
      data: {
        serviceId: dto.serviceId,
        supplierId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        position: dto.position,
        isFeatured: dto.isFeatured || false,
        boostedScore: dto.boostedScore || 1.5, // Default 50% boost
        dailyBudget: dto.dailyBudget,
        isActive: true,
      },
      include: {
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Promoted listing ${promotion.id} created for service ${dto.serviceId}`,
    );

    return this.mapToResponseDto(promotion);
  }

  /**
   * Get supplier's promoted listings
   */
  async getSupplierPromotions(
    supplierId: number,
  ): Promise<PromotedListingResponseDto[]> {
    const promotions = await this.prisma.promotedListing.findMany({
      where: { supplierId },
      include: {
        service: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return promotions.map((p) => this.mapToResponseDto(p));
  }

  /**
   * Get active promoted listings (for search ranking)
   */
  async getActivePromotions() {
    const now = new Date();

    return this.prisma.promotedListing.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: [{ position: 'asc' }, { boostedScore: 'desc' }],
    });
  }

  /**
   * Update promoted listing
   */
  async updatePromotedListing(
    promotionId: number,
    dto: UpdatePromotedListingDto,
    supplierId: number,
  ): Promise<PromotedListingResponseDto> {
    const promotion = await this.prisma.promotedListing.findUnique({
      where: { id: promotionId },
      include: {
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!promotion) {
      throw new NotFoundException('Promoted listing not found');
    }

    if (promotion.supplierId !== supplierId) {
      throw new ForbiddenException('You can only update your own promotions');
    }

    const updated = await this.prisma.promotedListing.update({
      where: { id: promotionId },
      data: {
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        position: dto.position,
        isFeatured: dto.isFeatured,
        boostedScore: dto.boostedScore,
        dailyBudget: dto.dailyBudget,
        isActive: dto.isActive,
      },
      include: {
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    this.logger.log(`Promoted listing ${promotionId} updated`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete promoted listing
   */
  async deletePromotedListing(promotionId: number, supplierId: number) {
    const promotion = await this.prisma.promotedListing.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw new NotFoundException('Promoted listing not found');
    }

    if (promotion.supplierId !== supplierId) {
      throw new ForbiddenException('You can only delete your own promotions');
    }

    await this.prisma.promotedListing.delete({
      where: { id: promotionId },
    });

    this.logger.log(`Promoted listing ${promotionId} deleted`);

    return { success: true };
  }

  /**
   * Track impression for promoted listing
   */
  async trackImpression(serviceId: number) {
    const promotion = await this.prisma.promotedListing.findFirst({
      where: {
        serviceId,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    if (promotion) {
      await this.prisma.promotedListing.update({
        where: { id: promotion.id },
        data: {
          impressions: { increment: 1 },
        },
      });
    }
  }

  /**
   * Track click for promoted listing
   */
  async trackClick(serviceId: number) {
    const promotion = await this.prisma.promotedListing.findFirst({
      where: {
        serviceId,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    if (promotion) {
      await this.prisma.promotedListing.update({
        where: { id: promotion.id },
        data: {
          clicks: { increment: 1 },
        },
      });
    }
  }

  /**
   * Track booking for promoted listing
   */
  async trackBooking(serviceId: number) {
    const promotion = await this.prisma.promotedListing.findFirst({
      where: {
        serviceId,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    if (promotion) {
      await this.prisma.promotedListing.update({
        where: { id: promotion.id },
        data: {
          bookings: { increment: 1 },
        },
      });
    }
  }

  /**
   * Check if service is promoted
   */
  async isPromoted(serviceId: number): Promise<boolean> {
    const now = new Date();

    const promotion = await this.prisma.promotedListing.findFirst({
      where: {
        serviceId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    return !!promotion;
  }

  /**
   * Get boost score for service (for search ranking)
   */
  async getBoostScore(serviceId: number): Promise<number> {
    const now = new Date();

    const promotion = await this.prisma.promotedListing.findFirst({
      where: {
        serviceId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    return promotion?.boostedScore || 1.0;
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(promotion: any): PromotedListingResponseDto {
    const ctr =
      promotion.impressions > 0
        ? (promotion.clicks / promotion.impressions) * 100
        : 0;
    const conversionRate =
      promotion.clicks > 0 ? (promotion.bookings / promotion.clicks) * 100 : 0;

    return {
      id: promotion.id,
      serviceId: promotion.serviceId,
      serviceName: promotion.service.name,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      position: promotion.position,
      isFeatured: promotion.isFeatured,
      boostedScore: promotion.boostedScore,
      dailyBudget: promotion.dailyBudget
        ? parseFloat(promotion.dailyBudget.toString())
        : undefined,
      totalSpent: parseFloat(promotion.totalSpent.toString()),
      impressions: promotion.impressions,
      clicks: promotion.clicks,
      bookings: promotion.bookings,
      ctr: Math.round(ctr * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      isActive: promotion.isActive,
      createdAt: promotion.createdAt,
    };
  }
}
