import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CrowdIndexCalculatorService } from './crowd-index-calculator.service.js';
import { WeatherApiService } from './weather-api.service.js';
import {
  PredictionResponseDto,
  HourlyPrediction,
} from '../dto/prediction-response.dto.js';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crowdCalculator: CrowdIndexCalculatorService,
    private readonly weatherService: WeatherApiService,
  ) {}

  /**
   * Get hourly predictions for a location for the next 24 hours
   */
  async getPredictions(
    locationId: number,
    date?: string,
  ): Promise<PredictionResponseDto> {
    this.logger.debug(`Fetching predictions for location ${locationId}`);

    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check for existing predictions
    let predictions = await this.prisma.crowdPrediction.findMany({
      where: {
        locationId,
        predictionFor: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { predictionFor: 'asc' },
    });

    // Generate predictions if not exist or stale (> 1 hour old)
    if (
      predictions.length === 0 ||
      predictions[0].generatedAt < new Date(Date.now() - 60 * 60 * 1000)
    ) {
      this.logger.debug('Generating new predictions');
      predictions = await this.generatePredictions(locationId, targetDate);
    }

    const hourlyPredictions: HourlyPrediction[] = predictions.map((p) => ({
      hour: new Date(p.predictionFor).getHours(),
      predictedIndex: p.predictedIndex,
      predictedLevel: p.predictedLevel,
      confidence: p.confidence,
      isBestTime: p.isBestTime,
    }));

    // Find best time to visit
    const bestTime = predictions.find((p) => p.isBestTime);

    // Get weather forecast
    const weatherForecast = await this.getWeatherForecast(location);

    // Get upcoming events
    const upcomingEvents = await this.getUpcomingEvents(locationId, targetDate);

    return {
      locationId,
      locationName: location.name,
      date: targetDate.toISOString().split('T')[0],
      hourlyPredictions,
      bestTimeHour: bestTime ? new Date(bestTime.predictionFor).getHours() : undefined,
      weatherForecast,
      upcomingEvents,
    };
  }

  /**
   * Generate predictions for next 24 hours
   */
  private async generatePredictions(
    locationId: number,
    startDate: Date,
  ): Promise<any[]> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }

    // Get historical data for this day of week and hour
    const dayOfWeek = startDate.getDay();
    const historicalData = await this.getHistoricalPatterns(locationId, dayOfWeek);

    // Get weather forecast
    const weatherForecast = await this.weatherService.fetchForecast(
      location.latitude,
      location.longitude,
      location.type,
    );

    // Get upcoming events
    const events = await this.getUpcomingEvents(locationId, startDate);

    const predictions: any[] = [];
    let lowestIndex = 100;
    let bestTimeHour = 0;

    // Generate prediction for each hour
    for (let hour = 0; hour < 24; hour++) {
      const predictionTime = new Date(startDate);
      predictionTime.setHours(hour, 0, 0, 0);

      // Get historical average for this hour
      const historicalPattern = historicalData[hour] || 50;

      // Get weather for this hour (approximate from 3-hour forecast)
      const weatherIndex = Math.floor(hour / 3);
      const weatherImpact = weatherForecast[weatherIndex]?.score || 50;

      // Calculate event impact
      const eventImpact = this.calculateEventImpact(events, predictionTime);

      // Calculate social trend impact based on time
      const trendImpact = this.calculateTrendImpact(hour, dayOfWeek);

      // Weighted prediction
      const predictedIndex =
        historicalPattern * 0.5 +
        weatherImpact * 0.2 +
        eventImpact * 0.2 +
        trendImpact * 0.1;

      const predictedLevel = this.crowdCalculator['determineCrowdLevel'](predictedIndex);

      // Track best time (lowest crowd index)
      if (predictedIndex < lowestIndex) {
        lowestIndex = predictedIndex;
        bestTimeHour = hour;
      }

      const prediction = await this.prisma.crowdPrediction.create({
        data: {
          locationId,
          predictedIndex: Math.round(predictedIndex),
          predictedLevel,
          predictionFor: predictionTime,
          confidence: 0.75, // Base confidence, can be improved with ML
          historicalPattern,
          weatherImpact,
          eventImpact,
          trendImpact,
          isBestTime: false, // Will update after loop
        },
      });

      predictions.push(prediction);
    }

    // Mark best time
    if (predictions.length > 0) {
      await this.prisma.crowdPrediction.updateMany({
        where: {
          locationId,
          predictionFor: predictions[bestTimeHour].predictionFor,
        },
        data: { isBestTime: true },
      });
      predictions[bestTimeHour].isBestTime = true;
    }

    this.logger.log(
      `Generated ${predictions.length} predictions for location ${locationId}`,
    );

    return predictions;
  }

  /**
   * Get historical crowd patterns for a day of week
   */
  private async getHistoricalPatterns(
    locationId: number,
    dayOfWeek: number,
  ): Promise<number[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const historicalData = await this.prisma.crowdDataPoint.findMany({
      where: {
        locationId,
        isPrediction: false,
        timestamp: { gte: thirtyDaysAgo },
      },
      select: {
        crowdIndex: true,
        timestamp: true,
      },
    });

    // Group by hour of day
    const hourlyAverages: number[] = Array(24).fill(50); // Default to moderate

    for (let hour = 0; hour < 24; hour++) {
      const hourData = historicalData.filter((d) => {
        const dataDay = d.timestamp.getDay();
        const dataHour = d.timestamp.getHours();
        return dataDay === dayOfWeek && dataHour === hour;
      });

      if (hourData.length > 0) {
        const avg =
          hourData.reduce((sum, d) => sum + d.crowdIndex, 0) / hourData.length;
        hourlyAverages[hour] = avg;
      }
    }

    return hourlyAverages;
  }

  /**
   * Calculate event impact on crowd levels
   */
  private calculateEventImpact(events: any[], predictionTime: Date): number {
    if (events.length === 0) return 0;

    // Events increase crowd by 30 points each
    const eventScore = Math.min(100, events.length * 30);

    return eventScore;
  }

  /**
   * Calculate social trend impact based on time
   */
  private calculateTrendImpact(hour: number, dayOfWeek: number): number {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Peak social media activity times
    let impact = 30; // Base

    if (hour >= 19 && hour <= 23) {
      // Evening peak
      impact = 80;
    } else if (hour >= 11 && hour <= 14) {
      // Lunch peak
      impact = 60;
    }

    if (isWeekend) {
      impact *= 1.3;
    }

    return Math.min(100, impact);
  }

  /**
   * Get upcoming events for a date
   */
  private async getUpcomingEvents(locationId: number, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await this.prisma.event.findMany({
      where: {
        locationId,
        startDate: { gte: startOfDay, lte: endOfDay },
        isActive: true,
      },
      select: {
        name: true,
        startDate: true,
      },
      orderBy: { startDate: 'asc' },
    });

    return events.map(
      (e) =>
        `${e.name} at ${e.startDate.getHours()}:${e.startDate.getMinutes().toString().padStart(2, '0')}`,
    );
  }

  /**
   * Get weather forecast summary
   */
  private async getWeatherForecast(location: any) {
    const weatherData = await this.weatherService.fetchWeather(
      location.latitude,
      location.longitude,
      location.type,
    );

    return {
      temperature: weatherData.temperature,
      condition: weatherData.weatherCondition,
    };
  }

  /**
   * Cron job: Generate predictions daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generateDailyPredictions() {
    this.logger.log('Running daily prediction generation');

    const activeLocations = await this.prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const location of activeLocations) {
      try {
        await this.generatePredictions(location.id, tomorrow);
        this.logger.debug(`Generated predictions for ${location.name}`);
      } catch (error) {
        this.logger.error(
          `Failed to generate predictions for ${location.name}: ${error.message}`,
        );
      }
    }

    this.logger.log('Daily prediction generation completed');
  }
}
