import { Module } from '@nestjs/common';
import { JourneysController } from './journeys.controller.js';
import { JourneysService } from './journeys.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [JourneysController],
  providers: [JourneysService],
  exports: [JourneysService],
})
export class JourneysModule {}
