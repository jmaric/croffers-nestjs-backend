import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../src/strategy/index.js';
import { MailModule } from '../src/mail/mail.module.js';

@Module({
  imports: [PrismaModule, JwtModule.register({}), MailModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
