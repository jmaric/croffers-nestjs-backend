import { Module } from '@nestjs/common';
import { FerriesController } from './ferries.controller.js';
import { FerriesService } from './ferries.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [FerriesController],
  providers: [FerriesService],
  exports: [FerriesService],
})
export class FerriesModule {}
