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
import { MailService } from '../mail/mail.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
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
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ============================================
  // CONVERSATIONS
  // ============================================

  async createOrGetConversation(userId: number, dto: CreateConversationDto) {
    const { supplierId, bookingId } = dto;

    // Check if current user is a supplier
    const currentUserSupplier = await this.prisma.supplier.findFirst({
      where: { userId },
      select: { id: true, businessName: true, userId: true },
    });

    // Determine if this is a supplier-initiated or guest-initiated conversation
    const isSupplierInitiated = currentUserSupplier !== null;
    let guestId: number;
    let supplierUserId: number;

    if (isSupplierInitiated) {
      // Supplier is initiating - need to get guest info from booking
      if (!bookingId) {
        throw new BadRequestException(
          'Booking ID is required when supplier initiates conversation',
        );
      }

      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { userId: true, supplierId: true },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${bookingId} not found`);
      }

      // Verify that the current supplier owns this booking
      if (currentUserSupplier.id !== booking.supplierId) {
        throw new ForbiddenException(
          'You can only message guests for your own bookings',
        );
      }

      guestId = booking.userId;
      supplierUserId = userId;
    } else {
      // Guest is initiating - verify supplier exists
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

        if (booking.userId !== userId) {
          throw new ForbiddenException('This booking does not belong to you');
        }

        if (booking.supplierId !== supplierId) {
          throw new BadRequestException(
            'Booking does not belong to this supplier',
          );
        }
      }

      guestId = userId;
      supplierUserId = supplier.userId;
    }

    // Check if conversation already exists
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        guestId,
        supplierId: supplierUserId,
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
        supplierId: supplierUserId,
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
    console.error('===== MESSAGE SEND STARTED =====');
    console.error('User ID:', userId, 'Conversation ID:', conversationId);

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

    // Send email and in-app notification to the recipient
    try {
      console.log('🔔 [MessagingService] Starting notification flow for recipient:', recipientId);

      const recipient = await this.prisma.user.findUnique({
        where: { id: recipientId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      console.log('🔔 [MessagingService] Recipient found:', recipient ? 'YES' : 'NO');

      if (recipient) {
        // Get full conversation details for email
        const fullConversation = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            booking: {
              select: {
                id: true,
                bookingReference: true,
              },
            },
          },
        });

        console.log('🔔 [MessagingService] Creating notification for user:', recipientId);

        // Send email notification
        try {
          await this.mailService.sendNewMessageNotification(
            fullConversation,
            message,
            recipient,
          );
          console.log('📧 [MessagingService] Email notification sent');
        } catch (emailError) {
          console.error('📧 [MessagingService] Email notification failed:', emailError.message);
        }

        // Send in-app notification
        const notification = await this.notificationsService.create({
          userId: recipientId,
          type: 'MESSAGE',
          title: 'New Message',
          message: `You have a new message${fullConversation?.booking?.bookingReference ? ` about booking ${fullConversation.booking.bookingReference}` : ''}`,
          actionUrl: `/messages/${conversationId}`,
          metadata: {
            conversationId,
            messageId: message.id,
            senderId: userId,
          },
        });

        console.log('🔔 [MessagingService] In-app notification created:', notification.id);
      } else {
        console.error('🔔 [MessagingService] Recipient not found, skipping notification');
      }
    } catch (error) {
      console.error('❌ [MessagingService] Failed to send notification:', error);
      // Don't throw - notification failure shouldn't prevent message from being sent
    }

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

  // ============================================
  // MESSAGE FLAGGING
  // ============================================

  async flagMessage(userId: number, messageId: number, reason: string) {
    // Verify message exists
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          select: {
            guestId: true,
            supplierId: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Verify user has access to this conversation
    if (
      message.conversation.guestId !== userId &&
      message.conversation.supplierId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
    }

    // Update message with flag
    const flaggedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isFlagged: true,
        flaggedBy: userId,
        flagReason: reason,
        flaggedAt: new Date(),
      },
    });

    // Notify admins about flagged message
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.notificationsService.create({
        userId: admin.id,
        type: 'BOOKING_UPDATE',
        title: 'Message Flagged for Review',
        message: `A message has been flagged: ${reason}`,
        metadata: {
          messageId,
          conversationId: message.conversationId,
          flaggedBy: userId,
          reason,
        },
      });
    }

    return flaggedMessage;
  }

  async getFlaggedMessages(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          isFlagged: true,
          reviewedBy: null, // Only get unreviewed flags
        },
        skip,
        take: limit,
        orderBy: { flaggedAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          conversation: {
            select: {
              id: true,
              guestId: true,
              supplierId: true,
            },
          },
        },
      }),
      this.prisma.message.count({
        where: {
          isFlagged: true,
          reviewedBy: null,
        },
      }),
    ]);

    // Get context messages (2 before and 2 after each flagged message)
    const messagesWithContext = await Promise.all(
      messages.map(async (message) => {
        const contextMessages = await this.prisma.message.findMany({
          where: {
            conversationId: message.conversationId,
            id: {
              gte: message.id - 2,
              lte: message.id + 2,
            },
          },
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return {
          ...message,
          contextMessages,
        };
      }),
    );

    return {
      data: messagesWithContext,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reviewFlaggedMessage(adminId: number, messageId: number) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    if (!message.isFlagged) {
      throw new BadRequestException('Message is not flagged');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    return { message: 'Message flag reviewed successfully' };
  }

  // ============================================
  // CONVERSATION ACCESS LOGGING
  // ============================================

  async logConversationAccess(
    adminId: number,
    conversationId: number,
    reason: string,
  ) {
    return this.prisma.conversationAccessLog.create({
      data: {
        adminId,
        conversationId,
        reason,
      },
    });
  }

  async getConversationWithAccess(
    adminId: number,
    conversationId: number,
    reason: string,
  ) {
    // Log the access
    await this.logConversationAccess(adminId, conversationId, reason);

    // Get the conversation
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
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    return conversation;
  }

  async getAccessLogs(page = 1, limit = 20, adminId?: number) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (adminId) {
      where.adminId = adminId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.conversationAccessLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { accessedAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          conversation: {
            select: {
              id: true,
              guestId: true,
              supplierId: true,
              bookingId: true,
            },
          },
        },
      }),
      this.prisma.conversationAccessLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
