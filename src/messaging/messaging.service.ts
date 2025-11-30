import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MessagingGateway } from './messaging.gateway.js';
import {
  CreateConversationDto,
  SendMessageDto,
  QueryConversationsDto,
  QueryMessagesDto,
} from './dto/index.js';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessagingGateway))
    private readonly gateway: MessagingGateway,
  ) {}

  // ============================================
  // CONVERSATIONS
  // ============================================

  async createOrGetConversation(guestId: number, dto: CreateConversationDto) {
    const { supplierId, bookingId } = dto;

    // Verify supplier exists
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, businessName: true, userId: true },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    // If bookingId is provided, verify the booking exists and belongs to the guest
    if (bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { userId: true, supplierId: true },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${bookingId} not found`);
      }

      if (booking.userId !== guestId) {
        throw new ForbiddenException('This booking does not belong to you');
      }

      if (booking.supplierId !== supplierId) {
        throw new BadRequestException(
          'Booking does not belong to this supplier',
        );
      }
    }

    // Check if conversation already exists
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        guestId,
        supplierId,
        bookingId: bookingId || null,
      },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        supplier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        booking: bookingId
          ? {
              select: {
                id: true,
                bookingReference: true,
                status: true,
                serviceDate: true,
              },
            }
          : undefined,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            isRead: true,
            createdAt: true,
          },
        },
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const newConversation = await this.prisma.conversation.create({
      data: {
        guestId,
        supplierId,
        bookingId: bookingId || null,
      },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        supplier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        booking: bookingId
          ? {
              select: {
                id: true,
                bookingReference: true,
                status: true,
                serviceDate: true,
              },
            }
          : undefined,
        messages: true,
      },
    });

    return newConversation;
  }

  async getConversations(userId: number, query: QueryConversationsDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Find conversations where user is either guest or supplier
    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: {
          OR: [{ guestId: userId }, { supplierId: userId }],
        },
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
          supplier: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
          booking: {
            select: {
              id: true,
              bookingReference: true,
              status: true,
              serviceDate: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              senderId: true,
              isRead: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.conversation.count({
        where: {
          OR: [{ guestId: userId }, { supplierId: userId }],
        },
      }),
    ]);

    // Calculate unread count for each conversation
    const conversationsWithUnread = conversations.map((conv) => {
      const isGuest = conv.guestId === userId;
      const unreadCount = isGuest
        ? conv.guestUnreadCount
        : conv.supplierUnreadCount;
      return {
        ...conv,
        unreadCount,
        isGuest,
      };
    });

    return {
      data: conversationsWithUnread,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConversation(userId: number, conversationId: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        supplier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingReference: true,
            status: true,
            serviceDate: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    // Verify user has access to this conversation
    if (conversation.guestId !== userId && conversation.supplierId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
    }

    const isGuest = conversation.guestId === userId;
    const unreadCount = isGuest
      ? conversation.guestUnreadCount
      : conversation.supplierUnreadCount;

    return {
      ...conversation,
      unreadCount,
      isGuest,
    };
  }

  // ============================================
  // MESSAGES
  // ============================================

  async sendMessage(
    userId: number,
    conversationId: number,
    dto: SendMessageDto,
  ) {
    // Verify conversation exists and user has access
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { guestId: true, supplierId: true },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    if (conversation.guestId !== userId && conversation.supplierId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
    }

    const isGuest = conversation.guestId === userId;

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: dto.content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Update conversation's lastMessageAt and increment unread counter
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        // Increment unread counter for the recipient
        ...(isGuest
          ? { supplierUnreadCount: { increment: 1 } }
          : { guestUnreadCount: { increment: 1 } }),
      },
    });

    // Send real-time message via WebSocket
    this.gateway.sendMessageToConversation(conversationId, message);

    // Update unread count for the recipient
    const recipientId = isGuest
      ? conversation.supplierId
      : conversation.guestId;
    const recipientUnreadCount = await this.getTotalUnreadCount(recipientId);
    this.gateway.sendUnreadCountUpdate(
      recipientId,
      recipientUnreadCount.totalUnread,
    );

    return message;
  }

  async getMessages(
    userId: number,
    conversationId: number,
    query: QueryMessagesDto,
  ) {
    // Verify conversation exists and user has access
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { guestId: true, supplierId: true },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    if (conversation.guestId !== userId && conversation.supplierId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
    }

    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.message.count({
        where: { conversationId },
      }),
    ]);

    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markMessagesAsRead(userId: number, conversationId: number) {
    // Verify conversation exists and user has access
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { guestId: true, supplierId: true },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    if (conversation.guestId !== userId && conversation.supplierId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
    }

    const isGuest = conversation.guestId === userId;

    // Mark all unread messages from the other party as read
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: isGuest ? conversation.supplierId : conversation.guestId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    // Reset unread counter for this user
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: isGuest ? { guestUnreadCount: 0 } : { supplierUnreadCount: 0 },
    });

    return {
      message: `Marked ${result.count} messages as read`,
      count: result.count,
    };
  }

  async getTotalUnreadCount(userId: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ guestId: userId }, { supplierId: userId }],
      },
      select: {
        guestId: true,
        guestUnreadCount: true,
        supplierUnreadCount: true,
      },
    });

    const totalUnread = conversations.reduce((sum, conv) => {
      const isGuest = conv.guestId === userId;
      return sum + (isGuest ? conv.guestUnreadCount : conv.supplierUnreadCount);
    }, 0);

    return { totalUnread };
  }
}
