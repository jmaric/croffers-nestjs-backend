import { Module } from '@nestjs/common';
import { BusesController } from './buses.controller.js';
import { BusesService } from './buses.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [BusesController],
  providers: [BusesService],
  exports: [BusesService],
})
export class BusesModule {}
