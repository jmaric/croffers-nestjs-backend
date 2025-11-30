import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../guard/index.js';
import { GetUser } from '../../auth/decorator/index.js';
import type { User } from '../../generated/prisma/client/client.js';
import { UserService } from './user.service.js';
import { UpdateUserDto } from './dto/index.js';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user profile. Requires JWT token.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'TOURIST',
        status: 'ACTIVE',
        emailVerified: true,
        phone: '+1234567890',
        avatar: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  getMe(@GetUser() user: User) {
    return user;
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Updates the authenticated user profile. All fields are optional.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    schema: {
      example: {
        id: 1,
        email: 'updated@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'TOURIST',
        status: 'ACTIVE',
        updatedAt: '2024-12-01T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Email already in use by another user' })
  updateMe(@GetUser() user: User, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me')
  @ApiOperation({
    summary: 'Delete current user account',
    description:
      'Permanently deletes the authenticated user account. This action cannot be undone. Returns 204 No Content on success.',
  })
  @ApiResponse({ status: 204, description: 'User account deleted successfully (no content)' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deleteMe(@GetUser() user: User) {
    return this.userService.deleteUser(user.id);
  }
}
