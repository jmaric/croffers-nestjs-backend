import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Use stealth plugin to avoid detection
(puppeteer as any).use(StealthPlugin());

export interface GooglePopularTimesData {
  liveScore: number; // 0-100
  historicScore: number; // 0-100
  currentWaitMinutes?: number;
  historicalData?: number[]; // 24 hours of historical data
  lastFetched: Date;
}

interface CachedData {
  data: GooglePopularTimesData;
  expiresAt: Date;
}

@Injectable()
export class GooglePopularTimesService {
  private readonly logger = new Logger(GooglePopularTimesService.name);
  private readonly cache = new Map<string, CachedData>();
  private readonly CACHE_DURATION_HOURS = 6; // 6 hour cache
  private browser: any = null;
  private isInitializing = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL_MS = 5000; // 5 seconds between requests

  /**
   * Fetch Google Popular Times data for a location
   * Uses ethical scraping with aggressive caching and rate limiting
   */
  async fetchPopularTimes(
    placeName: string,
    latitude: number,
    longitude: number,
  ): Promise<GooglePopularTimesData> {
    const cacheKey = `${latitude},${longitude}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      this.logger.debug(
        `Using cached Google data for ${placeName} (expires: ${cached.expiresAt.toISOString()})`,
      );
      return cached.data;
    }

    // Rate limiting - ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL_MS) {
      const waitTime = this.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
      this.logger.debug(`Rate limiting: waiting ${waitTime}ms before next request`);
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();

    try {
      this.logger.log(
        `Fetching Google Popular Times for ${placeName} at (${latitude}, ${longitude})`,
      );

      const data = await this.scrapePopularTimes(placeName, latitude, longitude);

      // Cache the result
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.CACHE_DURATION_HOURS);

      this.cache.set(cacheKey, {
        data,
        expiresAt,
      });

      // Clean old cache entries (keep cache size manageable)
      this.cleanExpiredCache();

      return data;
    } catch (error) {
      this.logger.error(
        `Error fetching Google Popular Times for ${placeName}: ${error.message}`,
        error.stack,
      );

      // Return fallback data based on time patterns
      return this.getFallbackData();
    }
  }

  /**
   * Scrape Google Popular Times using Puppeteer
   */
  private async scrapePopularTimes(
    placeName: string,
    latitude: number,
    longitude: number,
  ): Promise<GooglePopularTimesData> {
    let page: any = null;

    try {
      // Initialize browser if needed
      if (!this.browser) {
        await this.initBrowser();
      }

      page = await this.browser.newPage();

      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      // Build Google Maps URL with coordinates
      const searchQuery = encodeURIComponent(placeName);
      const url = `https://www.google.com/maps/search/${searchQuery}/@${latitude},${longitude},15z`;

      this.logger.debug(`Navigating to: ${url}`);

      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait a bit for dynamic content to load
      await this.sleep(3000);

      // Try to find and click on the first result if needed
      try {
        await page.waitForSelector('div[role="article"]', { timeout: 5000 });
        const firstResult = await page.$('div[role="article"]');
        if (firstResult) {
          await firstResult.click();
          await this.sleep(2000);
        }
      } catch (e) {
        this.logger.debug('Could not find/click search result, continuing...');
      }

      // Extract Popular Times data from the page
      const popularTimesData = await page.evaluate(() => {
        // Look for Popular Times section
        const popularTimesSection = Array.from(
          document.querySelectorAll('div[aria-label*="Popular times"]'),
        )[0];

        if (!popularTimesSection) {
          return null;
        }

        // Extract live busyness (if available)
        const liveText = document.body.innerText;
        const liveMatch = liveText.match(/(\d+)%\s+(as\s+)?busy/i);
        const liveScore = liveMatch ? parseInt(liveMatch[1]) : null;

        // Extract hour-by-hour data
        const hourBars = popularTimesSection.querySelectorAll('[aria-label*="hour"]');
        const historicalData: number[] = [];

        hourBars.forEach((bar: any) => {
          const ariaLabel = bar.getAttribute('aria-label') || '';
          const match = ariaLabel.match(/(\d+)%/);
          if (match) {
            historicalData.push(parseInt(match[1]));
          }
        });

        return {
          liveScore,
          historicalData: historicalData.length > 0 ? historicalData : null,
        };
      });

      await page.close();

      if (!popularTimesData || !popularTimesData.liveScore) {
        this.logger.warn(
          `No Popular Times data found for ${placeName}, using fallback`,
        );
        return this.getFallbackData();
      }

      // Calculate historic score from historical data
      const currentHour = new Date().getHours();
      const historicScore = popularTimesData.historicalData
        ? popularTimesData.historicalData[currentHour] || 50
        : 50;

      return {
        liveScore: popularTimesData.liveScore,
        historicScore,
        historicalData: popularTimesData.historicalData || undefined,
        lastFetched: new Date(),
      };
    } catch (error) {
      if (page) {
        await page.close().catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Initialize Puppeteer browser
   */
  private async initBrowser() {
    if (this.isInitializing) {
      // Wait for initialization to complete
      while (this.isInitializing) {
        await this.sleep(100);
      }
      return;
    }

    this.isInitializing = true;

    try {
      this.logger.log('Initializing Puppeteer browser...');
      this.browser = await (puppeteer as any).launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
        ],
      });

      this.logger.log('Puppeteer browser initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize browser: ${error.message}`);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Get fallback data based on time patterns when scraping fails
   */
  private getFallbackData(): GooglePopularTimesData {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    const liveScore = this.simulateLiveScore(hour, dayOfWeek);
    const historicScore = this.simulateHistoricScore(hour, dayOfWeek);

    this.logger.debug(
      `Using fallback data: live=${liveScore}, historic=${historicScore}`,
    );

    return {
      liveScore,
      historicScore,
      historicalData: this.generateHistoricalPattern(dayOfWeek),
      lastFetched: new Date(),
    };
  }

  /**
   * Simulate live score based on time of day (fallback)
   */
  private simulateLiveScore(hour: number, dayOfWeek: number): number {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendMultiplier = isWeekend ? 1.3 : 1.0;

    let baseScore = 30;

    if (hour >= 11 && hour <= 14) {
      baseScore = 70; // Lunch peak
    } else if (hour >= 19 && hour <= 22) {
      baseScore = 80; // Evening peak
    } else if (hour >= 8 && hour <= 10) {
      baseScore = 40; // Morning
    } else if (hour >= 15 && hour <= 18) {
      baseScore = 50; // Afternoon
    } else {
      baseScore = 20; // Off-hours
    }

    const score = Math.min(100, baseScore * weekendMultiplier + Math.random() * 15);
    return Math.round(score);
  }

  /**
   * Simulate historic average score (fallback)
   */
  private simulateHistoricScore(hour: number, dayOfWeek: number): number {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendMultiplier = isWeekend ? 1.2 : 1.0;

    let baseScore = 30;

    if (hour >= 11 && hour <= 14) {
      baseScore = 65;
    } else if (hour >= 19 && hour <= 22) {
      baseScore = 75;
    } else if (hour >= 8 && hour <= 10) {
      baseScore = 35;
    } else if (hour >= 15 && hour <= 18) {
      baseScore = 45;
    }

    return Math.round(baseScore * weekendMultiplier);
  }

  /**
   * Generate 24-hour historical pattern (fallback)
   */
  private generateHistoricalPattern(dayOfWeek: number): number[] {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const multiplier = isWeekend ? 1.2 : 1.0;

    const pattern = [
      10, 10, 10, 10, 10, 15, 25, 40, 50, 55, // 0-9
      60, 70, 75, 70, 60, 55, 50, 55, 65, 80, // 10-19
      85, 75, 50, 25, // 20-23
    ];

    return pattern.map((v) => Math.round(v * multiplier));
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache() {
    const now = new Date();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Puppeteer browser closed');
    }
  }
}
