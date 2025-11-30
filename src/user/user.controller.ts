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
import { JwtGuard } from '../guard/index.js';
import { GetUser } from '../../auth/decorator/index.js';
import type { User } from '../../generated/prisma/client/client.js';
import { UserService } from './user.service.js';
import { UpdateUserDto } from './dto/index.js';

@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  getMe(@GetUser() user: User) {
    return user;
  }

  @Patch('me')
  updateMe(@GetUser() user: User, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me')
  deleteMe(@GetUser() user: User) {
    return this.userService.deleteUser(user.id);
  }
}
