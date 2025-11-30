import { Module } from '@nestjs/common';
import { SupplierAnalyticsController } from './supplier-analytics.controller.js';
import { SupplierAnalyticsService } from './supplier-analytics.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [SupplierAnalyticsController],
  providers: [SupplierAnalyticsService],
  exports: [SupplierAnalyticsService],
})
export class SupplierAnalyticsModule {}
