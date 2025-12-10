import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import {
  CreateNotificationDto,
  QueryNotificationsDto,
  MarkReadDto,
} from './dto/index.js';
import { NotificationType } from '../../generated/prisma/client/client.js';
import { NotificationsGateway } from './notifications.gateway.js';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async create(dto: CreateNotificationDto) {
    console.log('🔔 [NotificationsService] Creating notification for user:', dto.userId, 'Type:', dto.type);

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        actionUrl: dto.actionUrl,
        metadata: dto.metadata,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log('✅ [NotificationsService] Notification created in DB:', notification.id);

    // Send real-time notification via WebSocket
    console.log('📡 [NotificationsService] Sending WebSocket notification to user:', dto.userId);
    this.gateway.sendNotificationToUser(dto.userId, notification);

    // Update unread count
    const unreadCount = await this.prisma.notification.count({
      where: { userId: dto.userId, isRead: false },
    });
    console.log('📊 [NotificationsService] Unread count for user', dto.userId, ':', unreadCount);
    this.gateway.sendUnreadCountUpdate(dto.userId, unreadCount);

    // Send email notification for important types
    if (this.shouldSendEmail(dto.type)) {
      await this.sendEmailNotification(notification);
    }

    return notification;
  }

  async findAll(userId: number, query: QueryNotificationsDto) {
    const { type, isRead, page = 1, limit = 20 } = query;

    const where: any = { userId };

    if (type) {
      where.type = type;
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async markAsRead(id: number, userId: number, dto: MarkReadDto) {
    const notification = await this.findOne(id, userId);

    const updatedNotification = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: dto.isRead },
    });

    // Send updated unread count
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    this.gateway.sendUnreadCountUpdate(userId, unreadCount);

    return updatedNotification;
  }

  async markAllAsRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    // Send updated unread count (should be 0)
    this.gateway.sendUnreadCountUpdate(userId, 0);

    return {
      message: `Marked ${result.count} notifications as read`,
      count: result.count,
    };
  }

  async delete(id: number, userId: number) {
    const notification = await this.findOne(id, userId);

    await this.prisma.notification.delete({
      where: { id: notification.id },
    });

    return { message: 'Notification deleted successfully' };
  }

  async deleteAll(userId: number) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return {
      message: `Deleted ${result.count} notifications`,
      count: result.count,
    };
  }

  async getUnreadCount(userId: number) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }

  // ============================================
  // NOTIFICATION CREATION HELPERS
  // ============================================

  async notifyBookingConfirmation(
    userId: number,
    bookingId: number,
    bookingReference: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.BOOKING_CONFIRMATION,
      title: 'Booking Confirmed',
      message: `Your booking ${bookingReference} has been confirmed!`,
      actionUrl: `/bookings/${bookingId}`,
      metadata: { bookingId, bookingReference },
    });
  }

  async notifyPaymentReceived(
    userId: number,
    bookingId: number,
    amount: number,
    currency: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'Payment Received',
      message: `Payment of ${amount} ${currency} has been received successfully.`,
      actionUrl: `/bookings/${bookingId}`,
      metadata: { bookingId, amount, currency },
    });
  }

  async notifyReviewRequest(
    userId: number,
    bookingId: number,
    bookingReference: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.REVIEW_REQUEST,
      title: 'Leave a Review',
      message: `Your booking ${bookingReference} is complete. Share your experience!`,
      actionUrl: `/bookings/${bookingId}/review`,
      metadata: { bookingId, bookingReference },
    });
  }

  async notifyDensityAlert(
    userId: number,
    locationId: number,
    locationName: string,
    density: number,
  ) {
    return this.create({
      userId,
      type: NotificationType.DENSITY_ALERT,
      title: 'Crowd Alert',
      message: `${locationName} is currently ${density > 0.8 ? 'very crowded' : 'moderately busy'}. Consider visiting later.`,
      actionUrl: `/locations/${locationId}`,
      metadata: { locationId, locationName, density },
    });
  }

  async notifyPromotion(
    userId: number,
    title: string,
    message: string,
    actionUrl?: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.PROMOTIONAL,
      title,
      message,
      actionUrl,
      metadata: {},
    });
  }

  // Notify supplier about new booking
  async notifySupplierNewBooking(
    supplierId: number,
    bookingId: number,
    bookingReference: string,
    amount: number,
  ) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { userId: true },
    });

    if (!supplier) return;

    return this.create({
      userId: supplier.userId,
      type: NotificationType.BOOKING_CONFIRMATION,
      title: 'New Booking Received',
      message: `New booking ${bookingReference} for ${amount} EUR received!`,
      actionUrl: `/bookings/${bookingId}`,
      metadata: { bookingId, bookingReference, amount },
    });
  }

  // Notify supplier about payment
  async notifySupplierPayment(
    supplierId: number,
    bookingId: number,
    amount: number,
    commission: number,
  ) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { userId: true },
    });

    if (!supplier) return;

    const payout = amount - commission;

    return this.create({
      userId: supplier.userId,
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'Payment Processed',
      message: `Payment received. Your payout: ${payout.toFixed(2)} EUR (after ${commission.toFixed(2)} EUR commission)`,
      actionUrl: `/supplier/bookings/${bookingId}`,
      metadata: { bookingId, amount, commission, payout },
    });
  }

  // Notify guest about supplier review
  async notifyGuestReview(
    userId: number,
    reviewId: number,
    supplierName: string,
    wouldRecommend: boolean,
  ) {
    return this.create({
      userId,
      type: NotificationType.REVIEW_REQUEST,
      title: wouldRecommend ? 'Positive Review Received' : 'Review Received',
      message: `${supplierName} ${wouldRecommend ? 'recommends' : 'reviewed'} you as a guest.`,
      actionUrl: `/reviews/${reviewId}`,
      metadata: { reviewId, supplierName, wouldRecommend },
    });
  }

  // Notify all admins about pending approvals
  async notifyAllAdmins(
    type: NotificationType,
    title: string,
    message: string,
    actionUrl?: string,
    metadata?: any,
  ) {
    console.log('🔔 [NotificationsService] Notifying all admins:', title);

    // Find all admin users
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    console.log(`✅ [NotificationsService] Found ${admins.length} admins to notify`);

    // Create notifications for each admin
    const notifications = await Promise.all(
      admins.map((admin) =>
        this.create({
          userId: admin.id,
          type,
          title,
          message,
          actionUrl,
          metadata,
        }),
      ),
    );

    return notifications;
  }

  // ============================================
  // EMAIL INTEGRATION
  // ============================================

  private shouldSendEmail(type: NotificationType): boolean {
    // Send emails for critical notifications only
    const criticalTypes: NotificationType[] = [
      NotificationType.BOOKING_CONFIRMATION,
      NotificationType.PAYMENT_RECEIVED,
    ];
    return criticalTypes.includes(type);
  }

  private async sendEmailNotification(notification: any) {
    try {
      const user = notification.user;

      if (!user || !user.email) return;

      // Use existing mail service - for now just log since sendEmail isn't a method on MailService
      // In production, you'd use this.mailService.sendBookingConfirmation or similar
      console.log(
        `Would send email notification to ${user.email}: ${notification.title}`,
      );

      // TODO: Implement generic email sending in MailService if needed
      // await this.mailService.sendGenericEmail({
      //   to: user.email,
      //   subject: notification.title,
      //   html: '...'
      // });
    } catch (error) {
      // Log error but don't throw - email failure shouldn't break notification creation
      console.error('Failed to send email notification:', error);
    }
  }
}
