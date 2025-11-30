import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import {
  AuthDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/index.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Post('signup')
  @ApiOperation({
    summary: 'User signup',
    description:
      'Creates a new user account with hashed password. Sends verification email. User status is INACTIVE until email is verified.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully. Check email for verification link.',
    schema: {
      example: {
        message: 'User created successfully. Please check your email to verify your account.',
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: null,
          lastName: null,
          role: 'TOURIST',
          status: 'INACTIVE',
          emailVerified: false,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Email already exists' })
  signup(@Body() dto: AuthDto) {
    console.log(dto);
    return this.authService.signup(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates user with email and password. Returns JWT access token. User must have verified email and ACTIVE status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns JWT token.',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'TOURIST',
          status: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Invalid credentials, email not verified, or account not active' })
  signin(@Body() dto: AuthDto) {
    return this.authService.login(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Verifies user email with token sent via email. Updates user status to ACTIVE. Token expires after 24 hours.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: {
        message: 'Email verified successfully',
        user: {
          id: 1,
          email: 'user@example.com',
          status: 'ACTIVE',
          emailVerified: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Generates password reset token and sends email. Token expires after 1 hour. Does not reveal if email exists (security).',
  })
  @ApiResponse({
    status: 200,
    description: 'If email exists, password reset email sent',
    schema: {
      example: {
        message: 'If the email exists in our system, a password reset link has been sent.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Resets user password using token from forgot-password email. Token is single-use and expires after 1 hour.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        message: 'Password reset successfully. You can now login with your new password.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token, or password too weak' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
