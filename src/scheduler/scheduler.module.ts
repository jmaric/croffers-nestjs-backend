import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [ScheduleModule.forRoot(), MailModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}