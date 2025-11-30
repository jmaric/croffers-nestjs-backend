import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ItinerariesController } from './itineraries.controller.js';
import { ItinerariesService } from './itineraries.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ItinerariesController],
  providers: [ItinerariesService],
  exports: [ItinerariesService],
})
export class ItinerariesModule {}
