import { Injectable, Logger } from '@nestjs/common';
import { CrowdLevel } from '../../../generated/prisma/client/client.js';

export interface CrowdIndexInput {
  googleLiveScore?: number;
  googleHistoricScore?: number;
  instagramScore?: number;
  tiktokScore?: number;
  weatherScore?: number;
  eventScore?: number;
  sensorScore?: number;
  hasSensors?: boolean;
}

export interface CrowdIndexResult {
  crowdIndex: number;
  crowdLevel: CrowdLevel;
  breakdown: {
    googleLive?: number;
    googleHistoric?: number;
    instagram?: number;
    tiktok?: number;
    weather?: number;
    event?: number;
    sensor?: number;
  };
}

@Injectable()
export class CrowdIndexCalculatorService {
  private readonly logger = new Logger(CrowdIndexCalculatorService.name);

  /**
   * Calculate Crowd Index based on multiple data sources
   *
   * Algorithm:
   * Without sensors: GoogleLive (55%) + GoogleHistoric (10%) + Instagram (15%) + TikTok (5%) + Weather (10%) + Event (5%)
   * With sensors: SensorScore (50%) + GoogleLive (30%) + Instagram (10%) + TikTok (5%) + Weather (3%) + Event (2%)
   */
  calculateCrowdIndex(input: CrowdIndexInput): CrowdIndexResult {
    this.logger.debug(`Calculating crowd index with input: ${JSON.stringify(input)}`);

    let crowdIndex: number;
    const breakdown: CrowdIndexResult['breakdown'] = {};

    if (input.hasSensors && input.sensorScore !== undefined) {
      // Algorithm with sensors
      breakdown.sensor = input.sensorScore * 0.5;
      breakdown.googleLive = (input.googleLiveScore ?? 0) * 0.3;
      breakdown.instagram = (input.instagramScore ?? 0) * 0.1;
      breakdown.tiktok = (input.tiktokScore ?? 0) * 0.05;
      breakdown.weather = (input.weatherScore ?? 0) * 0.03;
      breakdown.event = (input.eventScore ?? 0) * 0.02;

      crowdIndex =
        breakdown.sensor +
        breakdown.googleLive +
        breakdown.instagram +
        breakdown.tiktok +
        breakdown.weather +
        breakdown.event;
    } else {
      // Algorithm without sensors
      breakdown.googleLive = (input.googleLiveScore ?? 0) * 0.55;
      breakdown.googleHistoric = (input.googleHistoricScore ?? 0) * 0.1;
      breakdown.instagram = (input.instagramScore ?? 0) * 0.15;
      breakdown.tiktok = (input.tiktokScore ?? 0) * 0.05;
      breakdown.weather = (input.weatherScore ?? 0) * 0.1;
      breakdown.event = (input.eventScore ?? 0) * 0.05;

      crowdIndex =
        breakdown.googleLive +
        breakdown.googleHistoric +
        breakdown.instagram +
        breakdown.tiktok +
        breakdown.weather +
        breakdown.event;
    }

    // Ensure crowd index is within 0-100 range
    crowdIndex = Math.max(0, Math.min(100, crowdIndex));

    const crowdLevel = this.determineCrowdLevel(crowdIndex);

    this.logger.debug(`Calculated crowd index: ${crowdIndex}, level: ${crowdLevel}`);

    return {
      crowdIndex,
      crowdLevel,
      breakdown,
    };
  }

  /**
   * Determine crowd level from crowd index
   */
  private determineCrowdLevel(crowdIndex: number): CrowdLevel {
    if (crowdIndex <= 20) return CrowdLevel.EMPTY;
    if (crowdIndex <= 40) return CrowdLevel.QUIET;
    if (crowdIndex <= 60) return CrowdLevel.MODERATE;
    if (crowdIndex <= 80) return CrowdLevel.BUSY;
    return CrowdLevel.VERY_BUSY;
  }

  /**
   * Get color code for heatmap visualization
   */
  getColorForCrowdLevel(level: CrowdLevel): string {
    const colorMap: Record<CrowdLevel, string> = {
      [CrowdLevel.EMPTY]: '#00FF00', // Green
      [CrowdLevel.QUIET]: '#7FFF00', // Light green
      [CrowdLevel.MODERATE]: '#FFFF00', // Yellow
      [CrowdLevel.BUSY]: '#FFA500', // Orange
      [CrowdLevel.VERY_BUSY]: '#FF0000', // Red
    };

    return colorMap[level];
  }

  /**
   * Get color code for crowd index
   */
  getColorForCrowdIndex(crowdIndex: number): string {
    const level = this.determineCrowdLevel(crowdIndex);
    return this.getColorForCrowdLevel(level);
  }
}
