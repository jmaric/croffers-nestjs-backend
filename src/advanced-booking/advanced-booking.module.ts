import { Module } from '@nestjs/common';
import { AdvancedBookingController } from './advanced-booking.controller.js';
import { GroupBookingService } from './services/group-booking.service.js';
import { PackageService } from './services/package.service.js';
import { PriceAlertService } from './services/price-alert.service.js';
import { BookingModificationService } from './services/booking-modification.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [AdvancedBookingController],
  providers: [
    GroupBookingService,
    PackageService,
    PriceAlertService,
    BookingModificationService,
  ],
  exports: [
    GroupBookingService,
    PackageService,
    PriceAlertService,
    BookingModificationService,
  ],
})
export class AdvancedBookingModule {}
