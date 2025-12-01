import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface TikTokTrendData {
  score: number; // 0-100
  videoCount: number;
  viewCount: number;
  hashtagVelocity: number;
  engagement: number;
  hashtags: string[];
}

@Injectable()
export class TikTokApiService {
  private readonly logger = new Logger(TikTokApiService.name);
  private readonly apiBaseUrl = 'https://open.tiktokapis.com/v2';

  /**
   * Fetch TikTok trend data for a location
   *
   * Uses TikTok Research API or Display API:
   * - Hashtag-based video search
   * - Location-based content discovery
   * - Engagement metrics
   *
   * Requires: TikTok Developer Account + API Access Token
   */
  async fetchLocationTrends(
    locationName: string,
    latitude: number,
    longitude: number,
    hashtags: string[],
  ): Promise<TikTokTrendData> {
    this.logger.debug(
      `Fetching TikTok trends for ${locationName} with hashtags: ${hashtags.join(', ')}`,
    );

    try {
      const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

      if (!accessToken) {
        this.logger.warn('TikTok API token not configured, using mock data');
        return this.generateMockData(hashtags);
      }

      // TODO: Implement actual TikTok API calls
      // Example endpoints:
      // 1. POST /research/video/query - Search videos by hashtag
      // 2. GET /video/list - Get video details
      // 3. POST /research/hashtag/query - Get hashtag stats

      const videoCount = await this.fetchRecentVideoCount(hashtags, accessToken);
      const engagement = await this.calculateEngagement(hashtags, accessToken);

      const score = this.calculateTikTokScore(videoCount, engagement, hashtags.length);

      return {
        score,
        videoCount,
        viewCount: videoCount * 5000, // Estimate 5k views per video
        hashtagVelocity: videoCount / 60, // Videos per minute
        engagement,
        hashtags,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching TikTok trends: ${error.message}`,
        error.stack,
      );
      return this.generateMockData(hashtags);
    }
  }

  /**
   * Fetch recent video count for hashtags
   */
  private async fetchRecentVideoCount(
    hashtags: string[],
    accessToken: string,
  ): Promise<number> {
    // TODO: Implement actual TikTok API call
    // For now, return simulated data

    const hour = new Date().getHours();
    const baseCount = hour >= 10 && hour <= 23 ? 30 : 5;

    return Math.round(baseCount + Math.random() * 20);
  }

  /**
   * Calculate engagement rate for location
   */
  private async calculateEngagement(
    hashtags: string[],
    accessToken: string,
  ): Promise<number> {
    // TODO: Implement actual engagement calculation
    // Engagement = (Likes + Comments + Shares) / Videos

    const baseEngagement = 0.08; // 8% base engagement (TikTok typically higher than Instagram)
    return baseEngagement + Math.random() * 0.05; // 8-13%
  }

  /**
   * Calculate TikTok score (0-100) from metrics
   */
  private calculateTikTokScore(
    videoCount: number,
    engagement: number,
    hashtagCount: number,
  ): number {
    // Score formula:
    // - Video count: 60% (more videos = more activity)
    // - Engagement rate: 30% (higher engagement = more interest)
    // - Hashtag diversity: 10%

    const videoScore = Math.min(100, (videoCount / 50) * 100); // Normalize to 100
    const engagementScore = Math.min(100, engagement * 800); // 0.08 -> 64
    const hashtagScore = Math.min(100, (hashtagCount / 10) * 100);

    const totalScore =
      videoScore * 0.6 + engagementScore * 0.3 + hashtagScore * 0.1;

    return Math.round(Math.max(0, Math.min(100, totalScore)));
  }

  /**
   * Generate mock TikTok data for testing
   */
  private generateMockData(hashtags: string[]): TikTokTrendData {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // TikTok activity peaks in evening/night
    let baseActivity = 20;
    if (hour >= 18 && hour <= 23) baseActivity = 80; // Peak evening
    if (hour >= 11 && hour <= 14) baseActivity = 50; // Lunch
    if (isWeekend) baseActivity *= 1.4; // Higher weekend activity on TikTok

    const videoCount = Math.round(baseActivity + Math.random() * 15);
    const viewCount = videoCount * (3000 + Math.random() * 7000); // 3k-10k views per video
    const engagement = 0.08 + Math.random() * 0.05;

    const score = this.calculateTikTokScore(videoCount, engagement, hashtags.length);

    this.logger.debug(`Mock TikTok data: score=${score}, videos=${videoCount}`);

    return {
      score,
      videoCount,
      viewCount: Math.round(viewCount),
      hashtagVelocity: videoCount / 60,
      engagement,
      hashtags,
    };
  }

  /**
   * Get suggested hashtags for a location (TikTok-specific)
   */
  getSuggestedHashtags(locationName: string, locationType: string): string[] {
    const baseHashtags = [
      locationName.toLowerCase().replace(/\s+/g, ''),
      `${locationName.toLowerCase().replace(/\s+/g, '')}beach`,
      `${locationName.toLowerCase().replace(/\s+/g, '')}croatia`,
      'fyp', // For You Page
      'viral',
    ];

    const typeHashtags: Record<string, string[]> = {
      BEACH: ['beachtok', 'summervibes', 'beachday', 'croatia', 'travel'],
      RESTAURANT: ['foodtok', 'foodie', 'restaurant', 'eating'],
      NIGHTLIFE: ['partytok', 'nightlife', 'party', 'clubbing'],
      ATTRACTION: ['traveltok', 'explore', 'tourism', 'adventure'],
    };

    return [...baseHashtags, ...(typeHashtags[locationType] || [])];
  }

  /**
   * Check if a hashtag is trending on TikTok
   */
  async isHashtagTrending(hashtag: string): Promise<boolean> {
    // TODO: Implement actual trending check via TikTok API
    // For now, return mock data
    return Math.random() > 0.7; // 30% chance of trending
  }
}
