import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import { JwtGuard } from '../guard/index.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import {
  CreateNotificationDto,
  QueryNotificationsDto,
  MarkReadDto,
} from './dto/index.js';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all notifications for current user',
    description:
      'Returns paginated list of notifications with filtering options.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            userId: 5,
            type: 'BOOKING_CONFIRMATION',
            title: 'Booking Confirmed',
            message: 'Your booking #BK123456 has been confirmed!',
            isRead: false,
            actionUrl: '/bookings/123',
            metadata: { bookingId: 123, bookingReference: 'BK123456' },
            createdAt: '2024-12-15T10:30:00.000Z',
            updatedAt: '2024-12-15T10:30:00.000Z',
          },
        ],
        meta: {
          total: 45,
          unreadCount: 12,
          page: 1,
          limit: 20,
          totalPages: 3,
        },
      },
    },
  })
  findAll(@GetUser('id') userId: number, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.findAll(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Returns the count of unread notifications for current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved',
    schema: {
      example: { unreadCount: 12 },
    },
  })
  getUnreadCount(@GetUser('id') userId: number) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get notification by ID',
    description: 'Returns a single notification by ID.',
  })
  @ApiParam({ name: 'id', description: 'Notification ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Notification retrieved' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.notificationsService.findOne(id, userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a notification (internal use)',
    description: 'Manually create a notification. Typically called by other services.',
  })
  @ApiResponse({ status: 201, description: 'Notification created' })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read/unread',
    description: 'Updates the read status of a notification.',
  })
  @ApiParam({ name: 'id', description: 'Notification ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Notification updated' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @Body() dto: MarkReadDto,
  ) {
    return this.notificationsService.markAsRead(id, userId, dto);
  }

  @Patch('mark-all-read')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Marks all unread notifications as read for current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      example: {
        message: 'Marked 12 notifications as read',
        count: 12,
      },
    },
  })
  markAllAsRead(@GetUser('id') userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a notification',
    description: 'Deletes a single notification by ID.',
  })
  @ApiParam({ name: 'id', description: 'Notification ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.notificationsService.delete(id, userId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete all notifications',
    description: 'Deletes all notifications for current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications deleted',
    schema: {
      example: {
        message: 'Deleted 45 notifications',
        count: 45,
      },
    },
  })
  deleteAll(@GetUser('id') userId: number) {
    return this.notificationsService.deleteAll(userId);
  }
}
