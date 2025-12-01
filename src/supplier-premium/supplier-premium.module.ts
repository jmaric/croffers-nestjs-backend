import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SupplierPremiumController } from './supplier-premium.controller.js';

// Services
import { SupplierAddonService } from './services/supplier-addon.service.js';
import { ApiKeyService } from './services/api-key.service.js';
import { MarketingService } from './services/marketing.service.js';
import { SupportService } from './services/support.service.js';
import { AnalyticsProService } from './services/analytics-pro.service.js';

// Guards
import { ApiKeyGuard } from './guards/api-key.guard.js';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [SupplierPremiumController],
  providers: [
    SupplierAddonService,
    ApiKeyService,
    MarketingService,
    SupportService,
    AnalyticsProService,
    ApiKeyGuard,
  ],
  exports: [
    SupplierAddonService,
    ApiKeyService,
    MarketingService,
    SupportService,
    AnalyticsProService,
    ApiKeyGuard,
  ],
})
export class SupplierPremiumModule {}
