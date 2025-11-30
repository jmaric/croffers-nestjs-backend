import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthDto, ForgotPasswordDto, ResetPasswordDto } from './dto/index.js';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { MailService } from '../src/mail/mail.service.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mailService: MailService,
  ) {}

  async signup(dto: AuthDto) {
    const hash = await argon.hash(dto.password);

    try {
      // Generate email verification token
      const emailVerificationToken = randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date();
      verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // Token valid for 24 hours

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
          emailVerificationToken,
          verificationTokenExpiry,
          status: 'INACTIVE', // User starts as inactive until email is verified
        },
      });

      // Send verification email
      await this.mailService.sendVerificationEmail(
        user.email,
        emailVerificationToken,
      );

      return {
        message:
          'Registration successful! Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
        },
      };
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw err;
    }
  }
  async login(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException('Credentials incorrect');
    }

    const pwMatches = await argon.verify(user.hash, dto.password);
    if (!pwMatches) {
      throw new ForbiddenException('Credentials incorrect');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email before logging in. Check your inbox for the verification link.',
      );
    }

    // Check if user status is ACTIVE
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Your account is not active. Please contact support.',
      );
    }

    // ✅ Fix: Await the token and return it properly
    const token = await this.signToken(user.id, user.email);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // hash excluded
      },
    };
  }

  signToken(userId: number, email: string) {
    const payload = {
      sub: userId,
      email,
    };
    const secret = process.env.JWT_SECRET;
    return this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: secret,
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    // Don't reveal if user exists or not for security
    if (!user) {
      return {
        message: 'If the email exists, a reset link has been sent',
      };
    }

    // Generate a random reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token valid for 1 hour

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email
    await this.mailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      message: 'If the email exists, a reset link has been sent',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is expired
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password
    const hash = await argon.hash(dto.newPassword);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        hash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return {
      message: 'Password has been reset successfully',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if token is expired
    if (
      !user.verificationTokenExpiry ||
      user.verificationTokenExpiry < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if email is already verified
    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Update user to mark email as verified and set status to ACTIVE
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerified: true,
        status: 'ACTIVE',
        emailVerificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    // Generate JWT token for the newly verified user
    const accessToken = await this.signToken(user.id, user.email);

    return {
      message: 'Email verified successfully! You can now access your account.',
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: true,
      },
    };
  }
}
