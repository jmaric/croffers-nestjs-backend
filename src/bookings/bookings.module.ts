import { Module, forwardRef } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { BookingsController } from './bookings.controller.js';
import { InvoiceService } from './invoice.service.js';
import { MailModule } from '../mail/mail.module.js';
import { ServicesModule } from '../services/services.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [MailModule, ServicesModule, forwardRef(() => NotificationsModule)],
  controllers: [BookingsController],
  providers: [BookingsService, InvoiceService],
  exports: [BookingsService],
})
export class BookingsModule {}