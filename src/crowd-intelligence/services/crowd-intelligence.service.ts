import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CrowdIndexCalculatorService } from './crowd-index-calculator.service.js';
import { GooglePopularTimesService } from './google-popular-times.service.js';
import { InstagramApiService } from './instagram-api.service.js';
import { TikTokApiService } from './tiktok-api.service.js';
import { WeatherApiService } from './weather-api.service.js';
import {
  CrowdDataResponseDto,
  DataSourceScores,
  HeatmapResponseDto,
  HeatmapPoint,
} from '../dto/index.js';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CrowdIntelligenceService {
  private readonly logger = new Logger(CrowdIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crowdCalculator: CrowdIndexCalculatorService,
    private readonly googleService: GooglePopularTimesService,
    private readonly instagramService: InstagramApiService,
    private readonly tiktokService: TikTokApiService,
    private readonly weatherService: WeatherApiService,
  ) {}

  /**
   * Get current crowd data for a location
   */
  async getCurrentCrowdData(locationId: number): Promise<CrowdDataResponseDto> {
    this.logger.debug(`Fetching crowd data for location ${locationId}`);

    // Get location details
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }

    // Check for recent data (< 15 minutes old)
    const recentData = await this.prisma.crowdDataPoint.findFirst({
      where: {
        locationId,
        isPrediction: false,
        timestamp: {
          gte: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (recentData) {
      this.logger.debug(`Using cached crowd data from ${recentData.timestamp}`);
      return this.mapToResponseDto(recentData, location);
    }

    // Fetch fresh data from all sources
    this.logger.debug(`Fetching fresh crowd data for ${location.name}`);
    const crowdData = await this.aggregateCrowdData(locationId);

    return crowdData;
  }

  /**
   * Aggregate crowd data from all sources
   */
  private async aggregateCrowdData(locationId: number): Promise<CrowdDataResponseDto> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }

    // Fetch data from all sources in parallel
    const [googleData, instagramData, tiktokData, weatherData, eventData, sensorData] =
      await Promise.all([
        this.googleService.fetchPopularTimes(
          location.slug,
          location.latitude,
          location.longitude,
        ),
        this.fetchInstagramData(location),
        this.fetchTikTokData(location),
        this.weatherService.fetchWeather(
          location.latitude,
          location.longitude,
          location.type,
        ),
        this.fetchEventData(locationId),
        this.fetchSensorData(locationId),
      ]);

    // Calculate crowd index
    const crowdResult = this.crowdCalculator.calculateCrowdIndex({
      googleLiveScore: googleData.liveScore,
      googleHistoricScore: googleData.historicScore,
      instagramScore: instagramData.score,
      tiktokScore: tiktokData.score,
      weatherScore: weatherData.score,
      eventScore: eventData.score,
      sensorScore: sensorData.score,
      hasSensors: sensorData.hasSensors,
    });

    // Store in database
    const crowdDataPoint = await this.prisma.crowdDataPoint.create({
      data: {
        locationId,
        crowdIndex: crowdResult.crowdIndex,
        crowdLevel: crowdResult.crowdLevel,
        googleLiveScore: googleData.liveScore,
        googleHistoricScore: googleData.historicScore,
        instagramScore: instagramData.score,
        tiktokScore: tiktokData.score,
        weatherScore: weatherData.score,
        eventScore: eventData.score,
        sensorScore: sensorData.score,
        temperature: weatherData.temperature,
        weatherCondition: weatherData.weatherCondition,
        activeEvents: eventData.events,
        timestamp: new Date(),
        isPrediction: false,
      },
    });

    // Store social trends
    await this.storeSocialTrends(locationId, instagramData, tiktokData);

    // Store weather snapshot
    await this.storeWeatherSnapshot(locationId, weatherData);

    return this.mapToResponseDto(crowdDataPoint, location);
  }

  /**
   * Get heatmap for multiple locations
   */
  async getHeatmap(
    locationIds?: number[],
    locationType?: string,
  ): Promise<HeatmapResponseDto> {
    this.logger.debug(`Generating heatmap for ${locationIds?.length || 'all'} locations`);

    // Get locations
    const locations = await this.prisma.location.findMany({
      where: {
        ...(locationIds && { id: { in: locationIds } }),
        ...(locationType && { type: locationType as any }),
        isActive: true,
      },
      include: {
        crowdData: {
          where: {
            isPrediction: false,
            timestamp: {
              gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    const points: HeatmapPoint[] = locations
      .filter((loc) => loc.crowdData.length > 0)
      .map((loc) => {
        const crowdData = loc.crowdData[0];
        return {
          locationId: loc.id,
          name: loc.name,
          type: loc.type,
          latitude: loc.latitude,
          longitude: loc.longitude,
          crowdIndex: crowdData.crowdIndex,
          crowdLevel: crowdData.crowdLevel,
          color: this.crowdCalculator.getColorForCrowdLevel(crowdData.crowdLevel),
        };
      });

    return {
      points,
      timestamp: new Date(),
      totalLocations: points.length,
    };
  }

  /**
   * Cron job: Update crowd data every 15 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async updateAllCrowdData() {
    this.logger.log('Running scheduled crowd data update');

    const activeLocations = await this.prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    this.logger.log(`Updating crowd data for ${activeLocations.length} locations`);

    for (const location of activeLocations) {
      try {
        await this.aggregateCrowdData(location.id);
      } catch (error) {
        this.logger.error(
          `Failed to update crowd data for location ${location.name}: ${error.message}`,
        );
      }
    }

    this.logger.log('Crowd data update completed');
  }

  /**
   * Helper: Fetch Instagram data
   */
  private async fetchInstagramData(location: any) {
    const hashtags = this.instagramService.getSuggestedHashtags(location.name, location.type);
    return this.instagramService.fetchLocationTrends(
      location.name,
      location.latitude,
      location.longitude,
      hashtags,
    );
  }

  /**
   * Helper: Fetch TikTok data
   */
  private async fetchTikTokData(location: any) {
    const hashtags = this.tiktokService.getSuggestedHashtags(location.name, location.type);
    return this.tiktokService.fetchLocationTrends(
      location.name,
      location.latitude,
      location.longitude,
      hashtags,
    );
  }

  /**
   * Helper: Fetch event data
   */
  private async fetchEventData(locationId: number) {
    const now = new Date();
    const events = await this.prisma.event.findMany({
      where: {
        locationId,
        startDate: { lte: now },
        endDate: { gte: now },
        isActive: true,
      },
      select: { name: true },
    });

    // Event score based on number of concurrent events
    const score = Math.min(100, events.length * 30); // Each event adds 30 points

    return {
      score,
      events: events.map((e) => e.name),
    };
  }

  /**
   * Helper: Fetch sensor data
   */
  private async fetchSensorData(locationId: number) {
    const sensors = await this.prisma.sensor.findMany({
      where: { locationId, isActive: true },
      include: {
        readings: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (sensors.length === 0) {
      return { score: 0, hasSensors: false };
    }

    // Calculate average sensor score
    const sensorScores = sensors
      .filter((s) => s.readings.length > 0)
      .map((s) => {
        const reading = s.readings[0];
        const capacity = s.capacity || 100;
        return (reading.count / capacity) * 100;
      });

    const avgScore = sensorScores.length > 0
      ? sensorScores.reduce((a, b) => a + b, 0) / sensorScores.length
      : 0;

    return {
      score: Math.min(100, avgScore),
      hasSensors: true,
    };
  }

  /**
   * Helper: Store social trends
   */
  private async storeSocialTrends(locationId: number, instagramData: any, tiktokData: any) {
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()];

    await Promise.all([
      this.prisma.socialTrend.create({
        data: {
          locationId,
          platform: 'instagram',
          postCount: instagramData.postCount,
          storyCount: instagramData.storyCount,
          hashtagVelocity: instagramData.hashtagVelocity,
          engagement: instagramData.engagement,
          hashtags: instagramData.hashtags,
          hourOfDay,
          dayOfWeek,
        },
      }),
      this.prisma.socialTrend.create({
        data: {
          locationId,
          platform: 'tiktok',
          postCount: tiktokData.videoCount,
          hashtagVelocity: tiktokData.hashtagVelocity,
          engagement: tiktokData.engagement,
          hashtags: tiktokData.hashtags,
          hourOfDay,
          dayOfWeek,
        },
      }),
    ]);
  }

  /**
   * Helper: Store weather snapshot
   */
  private async storeWeatherSnapshot(locationId: number, weatherData: any) {
    await this.prisma.weatherSnapshot.create({
      data: {
        locationId,
        temperature: weatherData.temperature,
        feelsLike: weatherData.feelsLike,
        humidity: weatherData.humidity,
        uvIndex: weatherData.uvIndex,
        windSpeed: weatherData.windSpeed,
        cloudCover: weatherData.cloudCover,
        precipitation: weatherData.precipitation,
        weatherCondition: weatherData.weatherCondition,
        waveHeight: weatherData.waveHeight,
        seaTemperature: weatherData.seaTemperature,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Helper: Map database model to DTO
   */
  private mapToResponseDto(crowdDataPoint: any, location: any): CrowdDataResponseDto {
    const dataSourceScores: DataSourceScores = {
      googleLive: crowdDataPoint.googleLiveScore,
      googleHistoric: crowdDataPoint.googleHistoricScore,
      instagram: crowdDataPoint.instagramScore,
      tiktok: crowdDataPoint.tiktokScore,
      weather: crowdDataPoint.weatherScore,
      event: crowdDataPoint.eventScore,
      sensor: crowdDataPoint.sensorScore,
    };

    return {
      locationId: location.id,
      locationName: location.name,
      crowdIndex: crowdDataPoint.crowdIndex,
      crowdLevel: crowdDataPoint.crowdLevel,
      timestamp: crowdDataPoint.timestamp,
      dataSourceScores,
      temperature: crowdDataPoint.temperature,
      weatherCondition: crowdDataPoint.weatherCondition,
      activeEvents: crowdDataPoint.activeEvents,
      isPrediction: crowdDataPoint.isPrediction,
      confidence: crowdDataPoint.confidence,
    };
  }
}
