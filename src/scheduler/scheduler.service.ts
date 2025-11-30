import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { BookingStatus } from '../../generated/prisma/client/client.js';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  // Run every hour to check for bookings that should be auto-completed
  @Cron(CronExpression.EVERY_HOUR)
  async autoCompleteBookings() {
    this.logger.log('Running auto-complete bookings job...');

    try {
      // Find confirmed bookings where service date was more than 24 hours ago
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      const bookingsToComplete = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED,
          serviceDate: {
            lte: cutoffDate,
          },
        },
        include: {
          supplier: true,
          user: true,
          bookingItems: {
            include: {
              service: true,
            },
          },
        },
      });

      this.logger.log(`Found ${bookingsToComplete.length} bookings to auto-complete`);

      for (const booking of bookingsToComplete) {
        try {
          // Update booking status to completed
          const updatedBooking = await this.prisma.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.COMPLETED },
            include: {
              supplier: {
                include: {
                  user: true,
                },
              },
              user: true,
              bookingItems: {
                include: {
                  service: true,
                },
              },
            },
          });

          // Create commission record
          await this.prisma.commission.create({
            data: {
              supplierId: booking.supplierId,
              amount: booking.commission,
              rate: booking.supplier.commissionRate,
              bookingReference: booking.bookingReference,
              status: 'pending',
            },
          });

          // Send review request email and notification
          await Promise.all([
            this.mailService.sendReviewRequest(updatedBooking),
            this.notificationsService.notifyReviewRequest(
              booking.userId,
              booking.id,
              booking.bookingReference,
            ),
          ]);

          this.logger.log(`Auto-completed booking ${booking.bookingReference}`);
        } catch (error) {
          this.logger.error(
            `Failed to auto-complete booking ${booking.bookingReference}: ${error.message}`,
          );
        }
      }

      this.logger.log('Auto-complete bookings job completed');
    } catch (error) {
      this.logger.error(`Auto-complete bookings job failed: ${error.message}`);
    }
  }

  // Run every 6 hours to send reminder emails
  @Cron(CronExpression.EVERY_6_HOURS)
  async sendBookingReminders() {
    this.logger.log('Running send booking reminders job...');

    try {
      // Find confirmed bookings where service date is within 24-30 hours from now
      const now = new Date();
      const reminderWindowStart = new Date(now);
      reminderWindowStart.setHours(reminderWindowStart.getHours() + 24);

      const reminderWindowEnd = new Date(now);
      reminderWindowEnd.setHours(reminderWindowEnd.getHours() + 30);

      const bookingsForReminder = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED,
          serviceDate: {
            gte: reminderWindowStart,
            lte: reminderWindowEnd,
          },
        },
        include: {
          supplier: {
            include: {
              user: true,
            },
          },
          user: true,
          bookingItems: {
            include: {
              service: true,
            },
          },
        },
      });

      this.logger.log(`Found ${bookingsForReminder.length} bookings to send reminders for`);

      for (const booking of bookingsForReminder) {
        try {
          await this.mailService.sendBookingReminder(booking);
          this.logger.log(`Sent reminder for booking ${booking.bookingReference}`);
        } catch (error) {
          this.logger.error(
            `Failed to send reminder for booking ${booking.bookingReference}: ${error.message}`,
          );
        }
      }

      this.logger.log('Send booking reminders job completed');
    } catch (error) {
      this.logger.error(`Send booking reminders job failed: ${error.message}`);
    }
  }

  // Run daily at 9 AM to clean up old pending bookings (optional)
  @Cron('0 9 * * *')
  async cleanupOldPendingBookings() {
    this.logger.log('Running cleanup old pending bookings job...');

    try {
      // Find pending bookings where service date has passed by more than 7 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const result = await this.prisma.booking.updateMany({
        where: {
          status: BookingStatus.PENDING,
          serviceDate: {
            lte: cutoffDate,
          },
        },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: 'Automatically cancelled - service date passed without confirmation',
        },
      });

      this.logger.log(`Cancelled ${result.count} old pending bookings`);
      this.logger.log('Cleanup old pending bookings job completed');
    } catch (error) {
      this.logger.error(`Cleanup old pending bookings job failed: ${error.message}`);
    }
  }

  // Run every hour to auto-publish reviews after 72h
  @Cron(CronExpression.EVERY_HOUR)
  async autoPublishReviews() {
    this.logger.log('Running auto-publish reviews job...');

    try {
      const now = new Date();

      // Find reviews where publishAt has passed and not yet published
      const result = await this.prisma.review.updateMany({
        where: {
          isPublished: false,
          publishAt: {
            lte: now,
          },
        },
        data: {
          isPublished: true,
        },
      });

      this.logger.log(`Published ${result.count} reviews`);
      this.logger.log('Auto-publish reviews job completed');
    } catch (error) {
      this.logger.error(`Auto-publish reviews job failed: ${error.message}`);
    }
  }
}