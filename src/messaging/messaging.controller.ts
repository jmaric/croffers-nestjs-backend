import {
  Controller,
  Get,
  Post,
  Patch,
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
import { MessagingService } from './messaging.service.js';
import { JwtGuard } from '../guard/index.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import {
  CreateConversationDto,
  SendMessageDto,
  QueryConversationsDto,
  QueryMessagesDto,
} from './dto/index.js';

@ApiTags('Messaging')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ============================================
  // CONVERSATIONS
  // ============================================

  @Post('conversations')
  @ApiOperation({
    summary: 'Create or get existing conversation',
    description:
      'Creates a new conversation with a supplier or returns existing one if already exists.',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation created or retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Supplier or booking not found' })
  createOrGetConversation(
    @GetUser('id') userId: number,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagingService.createOrGetConversation(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'Get all conversations for current user',
    description:
      'Returns paginated list of conversations where user is either guest or supplier.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            guestId: 5,
            supplierId: 2,
            bookingId: 10,
            lastMessageAt: '2024-12-15T14:30:00.000Z',
            guestUnreadCount: 2,
            supplierUnreadCount: 0,
            guest: {
              id: 5,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              avatar: null,
            },
            supplier: {
              id: 2,
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane@example.com',
              avatar: null,
            },
            booking: {
              id: 10,
              bookingReference: 'BK123456',
              status: 'CONFIRMED',
              serviceDate: '2024-12-20T10:00:00.000Z',
            },
            messages: [
              {
                id: 45,
                content: 'Looking forward to the tour!',
                senderId: 5,
                isRead: false,
                createdAt: '2024-12-15T14:30:00.000Z',
              },
            ],
            unreadCount: 2,
            isGuest: true,
          },
        ],
        meta: {
          total: 5,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    },
  })
  getConversations(
    @GetUser('id') userId: number,
    @Query() query: QueryConversationsDto,
  ) {
    return this.messagingService.getConversations(userId, query);
  }

  @Get('conversations/unread-count')
  @ApiOperation({
    summary: 'Get total unread message count',
    description:
      'Returns the total number of unread messages across all conversations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved',
    schema: {
      example: { totalUnread: 8 },
    },
  })
  getTotalUnreadCount(@GetUser('id') userId: number) {
    return this.messagingService.getTotalUnreadCount(userId);
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get conversation by ID',
    description: 'Returns a single conversation with details.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Conversation retrieved' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  getConversation(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.messagingService.getConversation(userId, id);
  }

  // ============================================
  // MESSAGES
  // ============================================

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Send a message in conversation',
    description: 'Sends a new message in the specified conversation.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID', example: 1 })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  sendMessage(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(userId, conversationId, dto);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Get messages in conversation',
    description:
      'Returns paginated list of messages in chronological order (oldest first).',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            conversationId: 1,
            senderId: 5,
            content: 'Hi, is the boat tour available for 5 people?',
            isRead: true,
            createdAt: '2024-12-15T10:00:00.000Z',
            sender: {
              id: 5,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              avatar: null,
            },
          },
          {
            id: 2,
            conversationId: 1,
            senderId: 2,
            content:
              'Yes! We have availability next week. What date works for you?',
            isRead: true,
            createdAt: '2024-12-15T10:15:00.000Z',
            sender: {
              id: 2,
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane@example.com',
              avatar: null,
            },
          },
        ],
        meta: {
          total: 12,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  getMessages(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
    @Query() query: QueryMessagesDto,
  ) {
    return this.messagingService.getMessages(userId, conversationId, query);
  }

  @Patch('conversations/:id/mark-read')
  @ApiOperation({
    summary: 'Mark all messages in conversation as read',
    description:
      'Marks all unread messages from the other party as read and resets unread counter.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as read',
    schema: {
      example: {
        message: 'Marked 3 messages as read',
        count: 3,
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  markMessagesAsRead(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
  ) {
    return this.messagingService.markMessagesAsRead(userId, conversationId);
  }
}
