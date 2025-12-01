import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface InstagramTrendData {
  score: number; // 0-100
  postCount: number;
  storyCount: number;
  hashtagVelocity: number;
  engagement: number;
  hashtags: string[];
}

@Injectable()
export class InstagramApiService {
  private readonly logger = new Logger(InstagramApiService.name);
  private readonly apiBaseUrl = 'https://graph.instagram.com';

  /**
   * Fetch Instagram trend data for a location
   *
   * Uses Instagram Graph API:
   * - Location-based hashtag search
   * - Recent media count
   * - Engagement rate
   *
   * Requires: Instagram Business Account + Facebook App + Access Token
   */
  async fetchLocationTrends(
    locationName: string,
    latitude: number,
    longitude: number,
    hashtags: string[],
  ): Promise<InstagramTrendData> {
    this.logger.debug(
      `Fetching Instagram trends for ${locationName} with hashtags: ${hashtags.join(', ')}`,
    );

    try {
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

      if (!accessToken) {
        this.logger.warn('Instagram API token not configured, using mock data');
        return this.generateMockData(hashtags);
      }

      // TODO: Implement actual Instagram Graph API calls
      // Example endpoints:
      // 1. GET /{ig-hashtag-id}/recent_media
      // 2. GET /{ig-user-id}/media
      // 3. GET /{media-id}?fields=like_count,comments_count

      const postCount = await this.fetchRecentPostCount(hashtags, accessToken);
      const engagement = await this.calculateEngagement(hashtags, accessToken);

      const score = this.calculateInstagramScore(
        postCount,
        engagement,
        hashtags.length,
      );

      return {
        score,
        postCount,
        storyCount: 0, // Stories API requires special permissions
        hashtagVelocity: postCount / 60, // Posts per minute in last hour
        engagement,
        hashtags,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching Instagram trends: ${error.message}`,
        error.stack,
      );
      return this.generateMockData(hashtags);
    }
  }

  /**
   * Fetch recent post count for hashtags
   */
  private async fetchRecentPostCount(
    hashtags: string[],
    accessToken: string,
  ): Promise<number> {
    // TODO: Implement actual Instagram API call
    // For now, return simulated data

    const hour = new Date().getHours();
    const baseCount = hour >= 10 && hour <= 22 ? 50 : 10;

    return Math.round(baseCount + Math.random() * 30);
  }

  /**
   * Calculate engagement rate for location
   */
  private async calculateEngagement(
    hashtags: string[],
    accessToken: string,
  ): Promise<number> {
    // TODO: Implement actual engagement calculation
    // Engagement = (Likes + Comments) / Posts

    const baseEngagement = 0.05; // 5% base engagement
    return baseEngagement + Math.random() * 0.03; // 5-8%
  }

  /**
   * Calculate Instagram score (0-100) from metrics
   */
  private calculateInstagramScore(
    postCount: number,
    engagement: number,
    hashtagCount: number,
  ): number {
    // Score formula:
    // - Post count: 60% (more posts = busier)
    // - Engagement rate: 30% (higher engagement = more interest)
    // - Hashtag diversity: 10% (more hashtags tracked = better coverage)

    const postScore = Math.min(100, (postCount / 100) * 100); // Normalize to 100
    const engagementScore = Math.min(100, engagement * 1000); // 0.05 -> 50
    const hashtagScore = Math.min(100, (hashtagCount / 10) * 100);

    const totalScore =
      postScore * 0.6 + engagementScore * 0.3 + hashtagScore * 0.1;

    return Math.round(Math.max(0, Math.min(100, totalScore)));
  }

  /**
   * Generate mock Instagram data for testing
   */
  private generateMockData(hashtags: string[]): InstagramTrendData {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Simulate activity based on time
    let baseActivity = 30;
    if (hour >= 11 && hour <= 14) baseActivity = 70; // Lunch
    if (hour >= 19 && hour <= 23) baseActivity = 85; // Evening/Night
    if (isWeekend) baseActivity *= 1.3;

    const postCount = Math.round(baseActivity + Math.random() * 20);
    const storyCount = Math.round(postCount * 0.5); // Stories ~50% of posts
    const engagement = 0.05 + Math.random() * 0.03;

    const score = this.calculateInstagramScore(
      postCount,
      engagement,
      hashtags.length,
    );

    this.logger.debug(`Mock Instagram data: score=${score}, posts=${postCount}`);

    return {
      score,
      postCount,
      storyCount,
      hashtagVelocity: postCount / 60,
      engagement,
      hashtags,
    };
  }

  /**
   * Get suggested hashtags for a location
   */
  getSuggestedHashtags(locationName: string, locationType: string): string[] {
    const baseHashtags = [
      locationName.toLowerCase().replace(/\s+/g, ''),
      `${locationName.toLowerCase().replace(/\s+/g, '')}beach`,
      `${locationName.toLowerCase().replace(/\s+/g, '')}croatia`,
    ];

    const typeHashtags: Record<string, string[]> = {
      BEACH: ['beach', 'beachlife', 'croatia', 'adriatic', 'summervibes'],
      RESTAURANT: ['restaurant', 'food', 'croatianfood', 'dining'],
      NIGHTLIFE: ['party', 'nightlife', 'clubbing', 'nightout'],
      ATTRACTION: ['travel', 'tourism', 'sightseeing', 'explore'],
    };

    return [...baseHashtags, ...(typeHashtags[locationType] || [])];
  }
}
