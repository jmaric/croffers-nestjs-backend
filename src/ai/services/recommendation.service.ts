import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  GetRecommendationsDto,
  TrackInteractionDto,
  RecommendationResponseDto,
  RecommendationContext,
} from '../dto/index.js';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  // Scoring weights
  private readonly WEIGHTS = {
    preference: 0.35, // User preferences match
    behavior: 0.30, // User behavior patterns
    popularity: 0.20, // Overall popularity
    seasonal: 0.10, // Seasonal relevance
    proximity: 0.05, // Location proximity
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(
    dto: GetRecommendationsDto,
    userId: number,
  ): Promise<RecommendationResponseDto[]> {
    this.logger.log(`Getting recommendations for user ${userId}, context: ${dto.context}`);

    const limit = dto.limit || 10;

    // Check for cached recommendations
    const cached = await this.getCachedRecommendations(userId, limit);
    if (cached.length > 0) {
      return cached;
    }

    // Compute fresh recommendations
    await this.computeRecommendations(userId);

    // Fetch computed recommendations
    const recommendations = await this.prisma.recommendationScore.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      include: {
        service: {
          include: {
            supplier: true,
            photos: { take: 1 },
          },
        },
      },
      orderBy: { totalScore: 'desc' },
      take: limit,
    });

    return recommendations.map((r) => ({
      serviceId: r.serviceId,
      serviceName: r.service.name,
      serviceType: r.service.type,
      score: parseFloat(r.totalScore.toString()),
      reasoning: r.reasoning || 'Recommended for you',
      service: r.service,
    }));
  }

  /**
   * Track user interaction with a service
   */
  async trackInteraction(
    dto: TrackInteractionDto,
    userId: number,
  ): Promise<void> {
    await this.prisma.userInteraction.create({
      data: {
        userId,
        serviceId: dto.serviceId,
        interactionType: dto.interactionType,
        searchQuery: dto.searchQuery,
        duration: dto.duration,
        metadata: {},
      },
    });

    this.logger.log(`Tracked ${dto.interactionType} for service ${dto.serviceId} by user ${userId}`);

    // Invalidate recommendations cache
    await this.invalidateCache(userId);
  }

  /**
   * Compute recommendation scores for a user
   */
  private async computeRecommendations(userId: number): Promise<void> {
    // Get user preferences
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Get user interactions
    const interactions = await this.prisma.userInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Get available services
    const services = await this.prisma.service.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
      },
      include: {
        reviews: true,
        bookingItems: true,
      },
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours

    // Compute score for each service
    for (const service of services) {
      const preferenceScore = await this.computePreferenceScore(
        service,
        preferences,
      );
      const behaviorScore = this.computeBehaviorScore(service, interactions);
      const popularityScore = this.computePopularityScore(service);
      const seasonalScore = this.computeSeasonalScore(service);
      const proximityScore = 0.5; // Placeholder for now

      const totalScore =
        preferenceScore * this.WEIGHTS.preference +
        behaviorScore * this.WEIGHTS.behavior +
        popularityScore * this.WEIGHTS.popularity +
        seasonalScore * this.WEIGHTS.seasonal +
        proximityScore * this.WEIGHTS.proximity;

      const reasoning = this.generateReasoning(
        preferenceScore,
        behaviorScore,
        popularityScore,
      );

      // Upsert recommendation score
      await this.prisma.recommendationScore.upsert({
        where: {
          userId_serviceId: {
            userId,
            serviceId: service.id,
          },
        },
        create: {
          userId,
          serviceId: service.id,
          preferenceScore,
          behaviorScore,
          popularityScore,
          seasonalScore,
          proximityScore,
          totalScore,
          reasoning,
          computedAt: new Date(),
          expiresAt,
        },
        update: {
          preferenceScore,
          behaviorScore,
          popularityScore,
          seasonalScore,
          proximityScore,
          totalScore,
          reasoning,
          computedAt: new Date(),
          expiresAt,
        },
      });
    }

    this.logger.log(`Computed recommendations for ${services.length} services for user ${userId}`);
  }

  /**
   * Compute preference score based on user preferences
   */
  private async computePreferenceScore(
    service: any,
    preferences: any | null,
  ): Promise<number> {
    if (!preferences) return 0.5; // Default score if no preferences

    let score = 0;
    let factors = 0;

    // Check travel styles match (if applicable)
    if (preferences.travelStyles && preferences.travelStyles.length > 0) {
      // Map service type to travel styles
      const styleMatch = this.matchTravelStyle(service, preferences.travelStyles);
      score += styleMatch;
      factors++;
    }

    // Check interests match
    if (preferences.interests && preferences.interests.length > 0) {
      const interestMatch = this.matchInterests(service, preferences.interests);
      score += interestMatch;
      factors++;
    }

    // Check budget match
    if (preferences.minBudget || preferences.maxBudget) {
      const price = parseFloat(service.price.toString());
      const minBudget = preferences.minBudget
        ? parseFloat(preferences.minBudget.toString())
        : 0;
      const maxBudget = preferences.maxBudget
        ? parseFloat(preferences.maxBudget.toString())
        : Infinity;

      if (price >= minBudget && price <= maxBudget) {
        score += 1.0;
      } else {
        score += 0.3; // Partial score if outside range
      }
      factors++;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Compute behavior score based on user interactions
   */
  private computeBehaviorScore(service: any, interactions: any[]): number {
    // Check if user has interacted with this service
    const serviceInteractions = interactions.filter(
      (i) => i.serviceId === service.id,
    );

    if (serviceInteractions.length > 0) {
      // User has interacted with this service
      const hasBooked = serviceInteractions.some((i) => i.interactionType === 'book');
      const hasLiked = serviceInteractions.some((i) => i.interactionType === 'like');
      const hasSaved = serviceInteractions.some((i) => i.interactionType === 'save');

      if (hasBooked) return 0.3; // Lower score, already booked
      if (hasLiked || hasSaved) return 0.9; // High score, user showed interest
      return 0.6; // Viewed/clicked
    }

    // Check interactions with similar services
    const similarInteractions = interactions.filter(
      (i) => i.service && i.service.type === service.type,
    );

    if (similarInteractions.length > 0) {
      return 0.7; // User interested in this service type
    }

    return 0.5; // No behavior data
  }

  /**
   * Compute popularity score
   */
  private computePopularityScore(service: any): number {
    const reviewCount = service.reviews?.length || 0;
    const bookingCount = service.bookingItems?.length || 0;

    // Normalize scores (using log scale to prevent extreme values)
    const reviewScore = Math.min(Math.log10(reviewCount + 1) / 3, 1);
    const bookingScore = Math.min(Math.log10(bookingCount + 1) / 3, 1);

    return (reviewScore + bookingScore) / 2;
  }

  /**
   * Compute seasonal score
   */
  private computeSeasonalScore(service: any): number {
    const currentMonth = new Date().getMonth(); // 0-11
    const currentSeason = this.getSeason(currentMonth);

    // Beach activities score higher in summer
    if (service.type === 'ACTIVITY' && currentSeason === 'summer') {
      if (
        service.tags?.some((tag: string) =>
          ['beach', 'water', 'swimming'].includes(tag.toLowerCase()),
        )
      ) {
        return 1.0;
      }
    }

    // Cultural activities score higher in spring/fall
    if (service.type === 'TOUR' && ['spring', 'fall'].includes(currentSeason)) {
      if (
        service.tags?.some((tag: string) =>
          ['culture', 'history', 'museum'].includes(tag.toLowerCase()),
        )
      ) {
        return 1.0;
      }
    }

    return 0.5; // Default seasonal score
  }

  /**
   * Match service to travel styles
   */
  private matchTravelStyle(service: any, styles: string[]): number {
    const serviceTypeStyleMap: Record<string, string[]> = {
      ACCOMMODATION: ['LUXURY', 'BUDGET', 'FAMILY', 'ROMANTIC'],
      ACTIVITY: ['ADVENTURE', 'RELAXATION', 'FAMILY'],
      TOUR: ['CULTURAL', 'ADVENTURE', 'GROUP'],
      TRANSPORT: ['LUXURY', 'BUDGET'],
    };

    const relevantStyles = serviceTypeStyleMap[service.type] || [];
    const matches = styles.filter((style) => relevantStyles.includes(style));

    return matches.length > 0 ? 1.0 : 0.3;
  }

  /**
   * Match service to interests
   */
  private matchInterests(service: any, interests: string[]): number {
    const tags = service.tags || [];

    const interestKeywords: Record<string, string[]> = {
      BEACHES: ['beach', 'sea', 'coast', 'swimming'],
      NIGHTLIFE: ['bar', 'club', 'party', 'nightlife'],
      HISTORY: ['history', 'museum', 'ancient', 'heritage'],
      NATURE: ['nature', 'hiking', 'mountains', 'forest'],
      FOOD: ['food', 'restaurant', 'cuisine', 'wine'],
      ADVENTURE_SPORTS: ['adventure', 'extreme', 'sport', 'diving'],
      WELLNESS: ['spa', 'wellness', 'massage', 'yoga'],
      CULTURE: ['culture', 'art', 'festival', 'local'],
    };

    let matches = 0;
    for (const interest of interests) {
      const keywords = interestKeywords[interest] || [];
      if (tags.some((tag: string) =>
        keywords.some((kw) => tag.toLowerCase().includes(kw)),
      )) {
        matches++;
      }
    }

    return matches > 0 ? Math.min(matches / interests.length, 1.0) : 0.3;
  }

  /**
   * Get season from month
   */
  private getSeason(month: number): string {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  /**
   * Generate reasoning text
   */
  private generateReasoning(
    preferenceScore: number,
    behaviorScore: number,
    popularityScore: number,
  ): string {
    const reasons: string[] = [];

    if (preferenceScore > 0.7) {
      reasons.push('Matches your preferences');
    }
    if (behaviorScore > 0.7) {
      reasons.push('Based on your activity');
    }
    if (popularityScore > 0.7) {
      reasons.push('Popular with other travelers');
    }

    if (reasons.length === 0) {
      return 'Recommended for you';
    }

    return reasons.join(', ');
  }

  /**
   * Get cached recommendations
   */
  private async getCachedRecommendations(
    userId: number,
    limit: number,
  ): Promise<RecommendationResponseDto[]> {
    const cached = await this.prisma.recommendationScore.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      include: {
        service: {
          include: {
            supplier: true,
            photos: { take: 1 },
          },
        },
      },
      orderBy: { totalScore: 'desc' },
      take: limit,
    });

    if (cached.length < limit) {
      return []; // Not enough cached, need to recompute
    }

    return cached.map((r) => ({
      serviceId: r.serviceId,
      serviceName: r.service.name,
      serviceType: r.service.type,
      score: parseFloat(r.totalScore.toString()),
      reasoning: r.reasoning || 'Recommended for you',
      service: r.service,
    }));
  }

  /**
   * Invalidate recommendation cache
   */
  private async invalidateCache(userId: number): Promise<void> {
    await this.prisma.recommendationScore.updateMany({
      where: { userId },
      data: { expiresAt: new Date() }, // Expire immediately
    });
  }
}
