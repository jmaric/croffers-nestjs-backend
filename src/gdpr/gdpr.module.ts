import { Module } from '@nestjs/common';
import { GdprController } from './gdpr.controller.js';
import { GdprService } from './gdpr.service.js';
import { GdprCronService } from './cron/gdpr-cron.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [GdprController],
  providers: [GdprService, GdprCronService],
  exports: [GdprService],
})
export class GdprModule {}
