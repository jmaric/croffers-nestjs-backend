import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [ConfigModule, MailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}