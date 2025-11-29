// src/strategy/jwt.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    });
  }

  async validate(payload: any) {
    // ✅ Add async
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    // ✅ Exclude hash from returned user
    if (user) {
      const { hash, ...result } = user;
      return result;
    }

    return null; // Return null if user not found
  }
}
