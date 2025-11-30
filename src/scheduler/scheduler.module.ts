import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service.js';
import { MailModule } from '../mail/mail.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [ScheduleModule.forRoot(), MailModule, forwardRef(() => NotificationsModule)],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}