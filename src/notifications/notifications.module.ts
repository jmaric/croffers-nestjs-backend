import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    JwtModule,
    ConfigModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
