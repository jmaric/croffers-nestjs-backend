import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
