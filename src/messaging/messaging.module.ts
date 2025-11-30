import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MessagingController } from './messaging.controller.js';
import { MessagingService } from './messaging.service.js';
import { MessagingGateway } from './messaging.gateway.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, JwtModule, ConfigModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
