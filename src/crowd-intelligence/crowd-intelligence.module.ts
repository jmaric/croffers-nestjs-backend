import { Module } from '@nestjs/common';
import { CrowdIntelligenceController } from './crowd-intelligence.controller.js';
import { CrowdIntelligenceService } from './services/crowd-intelligence.service.js';
import { CrowdIndexCalculatorService } from './services/crowd-index-calculator.service.js';
import { GooglePopularTimesService } from './services/google-popular-times.service.js';
import { WeatherApiService } from './services/weather-api.service.js';
import { SensorService } from './services/sensor.service.js';
import { PredictionService } from './services/prediction.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [CrowdIntelligenceController],
  providers: [
    CrowdIntelligenceService,
    CrowdIndexCalculatorService,
    GooglePopularTimesService,
    WeatherApiService,
    SensorService,
    PredictionService,
  ],
  exports: [
    CrowdIntelligenceService,
    SensorService,
    PredictionService,
  ],
})
export class CrowdIntelligenceModule {}
