import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  UpdatePreferencesDto,
  PreferencesResponseDto,
  SmartSuggestionResponseDto,
} from '../dto/index.js';

@Injectable()
export class PersonalizationService {
  private readonly logger = new Logger(PersonalizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user preferences
   */
  async getPreferences(userId: number): Promise<PreferencesResponseDto | null> {
    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      return null;
    }

    return {
      id: prefs.id,
      userId: prefs.userId,
      travelStyles: prefs.travelStyles as any[],
      interests: prefs.interests as any[],
      minBudget: prefs.minBudget ? parseFloat(prefs.minBudget.toString()) : undefined,
      maxBudget: prefs.maxBudget ? parseFloat(prefs.maxBudget.toString()) : undefined,
      preferredStarRating: prefs.preferredStarRating || undefined,
      preferredAmenities: prefs.preferredAmenities,
      activityLevelMin: prefs.activityLevelMin || undefined,
      activityLevelMax: prefs.activityLevelMax || undefined,
      preferredDuration: prefs.preferredDuration || undefined,
      preferredRegions: prefs.preferredRegions,
      avoidCrowds: prefs.avoidCrowds,
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    dto: UpdatePreferencesDto,
    userId: number,
  ): Promise<PreferencesResponseDto> {
    this.logger.log(`Updating preferences for user ${userId}`);

    const updated = await this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        travelStyles: dto.travelStyles || [],
        interests: dto.interests || [],
        minBudget: dto.minBudget,
        maxBudget: dto.maxBudget,
        preferredStarRating: dto.preferredStarRating,
        preferredAmenities: dto.preferredAmenities || [],
        activityLevelMin: dto.activityLevelMin,
        activityLevelMax: dto.activityLevelMax,
        preferredDuration: dto.preferredDuration,
        preferredRegions: dto.preferredRegions || [],
        avoidCrowds: dto.avoidCrowds || false,
      },
      update: {
        travelStyles: dto.travelStyles !== undefined ? dto.travelStyles : undefined,
        interests: dto.interests !== undefined ? dto.interests : undefined,
        minBudget: dto.minBudget !== undefined ? dto.minBudget : undefined,
        maxBudget: dto.maxBudget !== undefined ? dto.maxBudget : undefined,
        preferredStarRating: dto.preferredStarRating !== undefined ? dto.preferredStarRating : undefined,
        preferredAmenities: dto.preferredAmenities !== undefined ? dto.preferredAmenities : undefined,
        activityLevelMin: dto.activityLevelMin !== undefined ? dto.activityLevelMin : undefined,
        activityLevelMax: dto.activityLevelMax !== undefined ? dto.activityLevelMax : undefined,
        preferredDuration: dto.preferredDuration !== undefined ? dto.preferredDuration : undefined,
        preferredRegions: dto.preferredRegions !== undefined ? dto.preferredRegions : undefined,
        avoidCrowds: dto.avoidCrowds !== undefined ? dto.avoidCrowds : undefined,
      },
    });

    // Invalidate recommendation cache after preference update
    await this.invalidateRecommendations(userId);

    return {
      id: updated.id,
      userId: updated.userId,
      travelStyles: updated.travelStyles as any[],
      interests: updated.interests as any[],
      minBudget: updated.minBudget ? parseFloat(updated.minBudget.toString()) : undefined,
      maxBudget: updated.maxBudget ? parseFloat(updated.maxBudget.toString()) : undefined,
      preferredStarRating: updated.preferredStarRating || undefined,
      preferredAmenities: updated.preferredAmenities,
      activityLevelMin: updated.activityLevelMin || undefined,
      activityLevelMax: updated.activityLevelMax || undefined,
      preferredDuration: updated.preferredDuration || undefined,
      preferredRegions: updated.preferredRegions,
      avoidCrowds: updated.avoidCrowds,
    };
  }

  /**
   * Get smart suggestions for user
   */
  async getSmartSuggestions(
    userId: number,
  ): Promise<SmartSuggestionResponseDto[]> {
    const suggestions = await this.prisma.smartSuggestion.findMany({
      where: {
        userId,
        validUntil: { gt: new Date() },
        dismissed: false,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });

    // Fetch services for each suggestion
    const suggestionsWithServices = await Promise.all(
      suggestions.map(async (s) => {
        const services = await this.prisma.service.findMany({
          where: {
            id: { in: s.serviceIds },
            isActive: true,
          },
          include: {
            supplier: true,
            photos: { take: 1 },
          },
        });

        return {
          id: s.id,
          suggestionType: s.suggestionType,
          title: s.title,
          description: s.description,
          serviceIds: s.serviceIds,
          reasoning: s.reasoning || undefined,
          priority: s.priority,
          validUntil: s.validUntil,
          services,
        };
      }),
    );

    return suggestionsWithServices;
  }

  /**
   * Mark suggestion as viewed
   */
  async markSuggestionViewed(suggestionId: number, userId: number) {
    await this.prisma.smartSuggestion.updateMany({
      where: {
        id: suggestionId,
        userId,
      },
      data: { viewed: true },
    });
  }

  /**
   * Mark suggestion as clicked
   */
  async markSuggestionClicked(suggestionId: number, userId: number) {
    await this.prisma.smartSuggestion.updateMany({
      where: {
        id: suggestionId,
        userId,
      },
      data: { clicked: true },
    });
  }

  /**
   * Dismiss suggestion
   */
  async dismissSuggestion(suggestionId: number, userId: number) {
    await this.prisma.smartSuggestion.updateMany({
      where: {
        id: suggestionId,
        userId,
      },
      data: { dismissed: true },
    });
  }

  /**
   * Generate smart suggestions for user
   */
  async generateSuggestions(userId: number): Promise<void> {
    this.logger.log(`Generating smart suggestions for user ${userId}`);

    // Get user data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        bookings: {
          include: { bookingItems: { include: { service: true } } },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        favorites: {
          include: { service: true },
          take: 20,
        },
      },
    });

    if (!user) return;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7); // Valid for 1 week

    // Generate "Similar to Saved" suggestion
    if (user.favorites && user.favorites.length > 0) {
      const favoriteServiceIds = user.favorites.map((f) => f.serviceId);
      const favoriteTypes = [
        ...new Set(user.favorites.map((f) => f.service.type)),
      ];

      const similarServices = await this.prisma.service.findMany({
        where: {
          type: { in: favoriteTypes as any[] },
          id: { notIn: favoriteServiceIds },
          isActive: true,
          status: 'ACTIVE',
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      if (similarServices.length > 0) {
        await this.prisma.smartSuggestion.create({
          data: {
            userId,
            suggestionType: 'similar_to_saved',
            title: 'More places you might like',
            description: 'Based on your saved favorites, you might enjoy these similar options',
            serviceIds: similarServices.map((s) => s.id),
            reasoning: 'Similar to your favorites',
            priority: 8,
            validFrom: new Date(),
            validUntil,
          },
        });
      }
    }

    // Generate "Trending Nearby" suggestion (if user has location preferences)
    if (user.preferences?.preferredRegions && user.preferences.preferredRegions.length > 0) {
      const trendingServices = await this.prisma.service.findMany({
        where: {
          isActive: true,
          status: 'ACTIVE',
        },
        include: {
          bookingItems: {
            where: {
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
            },
          },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      const trending = (trendingServices as any[])
        .filter((s: any) => s.bookingItems && s.bookingItems.length > 0)
        .sort((a: any, b: any) => b.bookingItems.length - a.bookingItems.length)
        .slice(0, 5);

      if (trending.length > 0) {
        await this.prisma.smartSuggestion.create({
          data: {
            userId,
            suggestionType: 'trending_nearby',
            title: 'Trending in your area',
            description: 'Popular services that other travelers are booking',
            serviceIds: trending.map((s) => s.id),
            reasoning: 'Trending in your preferred regions',
            priority: 7,
            validFrom: new Date(),
            validUntil,
          },
        });
      }
    }

    // Generate "Weekend Getaway" suggestion (Fridays only)
    const today = new Date().getDay();
    if (today === 5) {
      // Friday
      const weekendServices = await this.prisma.service.findMany({
        where: {
          type: { in: ['ACCOMMODATION', 'TOUR'] },
          isActive: true,
          status: 'ACTIVE',
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      if (weekendServices.length > 0) {
        await this.prisma.smartSuggestion.create({
          data: {
            userId,
            suggestionType: 'weekend_getaway',
            title: 'Weekend getaway ideas',
            description: 'Make the most of your weekend with these experiences',
            serviceIds: weekendServices.map((s) => s.id),
            reasoning: 'Perfect for a weekend trip',
            priority: 9,
            validFrom: new Date(),
            validUntil,
          },
        });
      }
    }

    this.logger.log(`Generated suggestions for user ${userId}`);
  }

  /**
   * Invalidate recommendation cache
   */
  private async invalidateRecommendations(userId: number): Promise<void> {
    await this.prisma.recommendationScore.updateMany({
      where: { userId },
      data: { expiresAt: new Date() },
    });
  }
}
