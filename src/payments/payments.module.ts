import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { MailModule } from '../mail/mail.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [ConfigModule, MailModule, forwardRef(() => NotificationsModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}