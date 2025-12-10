import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { I18nModule, AcceptLanguageResolver, QueryResolver, HeaderResolver } from 'nestjs-i18n';
import { WinstonModule } from 'nest-winston';
import * as path from 'path';
import { winstonConfig } from './common/config/winston.config.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { ServicesModule } from './services/services.module.js';
import { PhotosModule } from './photos/photos.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { AdminModule } from './admin/admin.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { SupplierAnalyticsModule } from './supplier-analytics/supplier-analytics.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { ItinerariesModule } from './itineraries/itineraries.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';
import { CacheModule } from './cache/cache.module.js';
import { HealthModule } from './health/health.module.js';
import { UploadModule } from './upload/upload.module.js';
import { CommonModule } from './common/common.module.js';
import { AuditModule } from './audit/audit.module.js';
import { GdprModule } from './gdpr/gdpr.module.js';
import { JourneysModule } from './journeys/journeys.module.js';
import { FerriesModule } from './ferries/ferries.module.js';
import { EventsModule } from './events/events.module.js';
import { BusesModule } from './buses/buses.module.js';
import { CrowdIntelligenceModule } from './crowd-intelligence/crowd-intelligence.module.js';
import { AdvancedBookingModule } from './advanced-booking/advanced-booking.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { SupplierPremiumModule } from './supplier-premium/supplier-premium.module.js';
import { SocialModule } from './social/social.module.js';
import { AiModule } from './ai/ai.module.js';
import { TransportModule } from './transport/transport.module.js';
import { DisputesModule } from './disputes/disputes.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    NestScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),
    WinstonModule.forRoot(winstonConfig),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(process.cwd(), 'src/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-custom-lang']),
      ],
    }),
    CacheModule,
    AuthModule,
    UserModule,
    PrismaModule,
    LocationsModule,
    SuppliersModule,
    ServicesModule,
    PhotosModule,
    BookingsModule,
    PaymentsModule,
    SchedulerModule,
    ReviewsModule,
    AdminModule,
    NotificationsModule,
    SupplierAnalyticsModule,
    MessagingModule,
    ItinerariesModule,
    FavoritesModule,
    HealthModule,
    UploadModule,
    CommonModule,
    AuditModule,
    GdprModule,
    JourneysModule,
    FerriesModule,
    EventsModule,
    BusesModule,
    CrowdIntelligenceModule,
    AdvancedBookingModule,
    SubscriptionsModule,
    SupplierPremiumModule,
    SocialModule,
    AiModule,
    TransportModule,
    DisputesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
