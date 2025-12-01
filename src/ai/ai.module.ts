import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AiController } from './ai.controller.js';
import { RecommendationService } from './services/recommendation.service.js';
import { PersonalizationService } from './services/personalization.service.js';
import { ChatService } from './services/chat.service.js';
import { DynamicPricingService } from './services/dynamic-pricing.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [
    RecommendationService,
    PersonalizationService,
    ChatService,
    DynamicPricingService,
  ],
  exports: [
    RecommendationService,
    PersonalizationService,
    ChatService,
    DynamicPricingService,
  ],
})
export class AiModule {}
