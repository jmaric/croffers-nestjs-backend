import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

    if (!smtpHost || !smtpUser) {
      console.warn('Email configuration not complete. Email sending will not work.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort || 587,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.MAIL_FROM || '"Croffers Nest" <noreply@croffersnest.com>',
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Croffers Nest!</h2>
          <p>Thank you for signing up. Please verify your email address to activate your account.</p>
          <p>Click the button below to verify your email:</p>
          <a href="${verificationUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Verify Email
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p style="margin-top: 30px; color: #999; font-size: 12px;">
            This link will expire in 24 hours. If you didn't sign up for Croffers Nest, please ignore this email.
          </p>
        </div>
      `,
      text: `Welcome to Croffers Nest! Please verify your email by clicking this link: ${verificationUrl}. This link will expire in 24 hours.`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.MAIL_FROM || '"Croffers Nest" <noreply@croffersnest.com>',
      to: email,
      subject: 'Reset your password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Reset Password
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="margin-top: 30px; color: #999; font-size: 12px;">
            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      `,
      text: `Reset your password by clicking this link: ${resetUrl}. This link will expire in 1 hour.`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  // Booking Emails

  async sendBookingConfirmation(booking: any) {
    if (!this.transporter) return;

    const html = this.getBookingConfirmationTemplate(booking);

    await this.sendMail({
      to: booking.user.email,
      subject: `Booking Confirmation - ${booking.bookingReference}`,
      html,
    });

    // Send notification to supplier
    if (booking.supplier?.user?.email) {
      await this.sendMail({
        to: booking.supplier.user.email,
        subject: `New Booking Received - ${booking.bookingReference}`,
        html: this.getSupplierBookingNotificationTemplate(booking),
      });
    }
  }

  async sendPaymentConfirmation(booking: any, payment: any) {
    if (!this.transporter) return;

    const html = this.getPaymentConfirmationTemplate(booking, payment);

    await this.sendMail({
      to: booking.user.email,
      subject: `Payment Received - ${booking.bookingReference}`,
      html,
    });
  }

  async sendBookingCancellation(booking: any) {
    if (!this.transporter) return;

    const html = this.getBookingCancellationTemplate(booking);

    await this.sendMail({
      to: booking.user.email,
      subject: `Booking Cancelled - ${booking.bookingReference}`,
      html,
    });

    // Notify supplier
    if (booking.supplier?.user?.email) {
      await this.sendMail({
        to: booking.supplier.user.email,
        subject: `Booking Cancelled - ${booking.bookingReference}`,
        html: this.getSupplierCancellationNotificationTemplate(booking),
      });
    }
  }

  async sendBookingReminder(booking: any) {
    if (!this.transporter) return;

    const html = this.getBookingReminderTemplate(booking);

    await this.sendMail({
      to: booking.user.email,
      subject: `Booking Reminder - ${booking.bookingReference}`,
      html,
    });
  }

  async sendReviewRequest(booking: any) {
    if (!this.transporter) return;

    const html = this.getReviewRequestTemplate(booking);

    await this.sendMail({
      to: booking.user.email,
      subject: `How was your experience? - ${booking.bookingReference}`,
      html,
    });
  }

  async sendSupplierApproval(supplier: any) {
    if (!this.transporter) return;

    const html = this.getSupplierApprovalTemplate(supplier);

    await this.sendMail({
      to: supplier.user.email,
      subject: 'Your Supplier Account Has Been Approved!',
      html,
    });
  }

  async sendSupplierRejection(supplier: any, reason: string) {
    if (!this.transporter) return;

    const html = this.getSupplierRejectionTemplate(supplier, reason);

    await this.sendMail({
      to: supplier.user.email,
      subject: 'Supplier Account Application Update',
      html,
    });
  }

  private async sendMail(options: {
    to: string;
    subject: string;
    html: string;
  }) {
    if (!this.transporter) {
      console.log('Email not sent - transporter not configured');
      return;
    }

    try {
      const fromEmail = this.configService.get<string>('SMTP_USER');
      const fromName = 'Croffers Nest';

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  // Email Templates

  private getBookingConfirmationTemplate(booking: any): string {
    const items = booking.bookingItems
      ?.map(
        (item: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.service?.name || 'Service'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${booking.currency} ${Number(item.totalPrice).toFixed(2)}</td>
        </tr>
      `,
      )
      .join('') || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
          th { background-color: #f2f2f2; padding: 12px; text-align: left; }
          .total { font-size: 1.2em; font-weight: bold; text-align: right; padding: 15px; background: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed!</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Dear ${booking.user?.firstName || 'Customer'},</p>
            <p>Your booking has been confirmed. Here are the details:</p>

            <p><strong>Booking Reference:</strong> ${booking.bookingReference}</p>
            <p><strong>Service Date:</strong> ${new Date(booking.serviceDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Supplier:</strong> ${booking.supplier?.businessName || 'Supplier'}</p>

            <h3>Booking Items:</h3>
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${items}
              </tbody>
            </table>

            <div class="total">
              Total: ${booking.currency} ${Number(booking.totalAmount).toFixed(2)}
            </div>

            ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}

            <p>Thank you for choosing Croffers Nest!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSupplierBookingNotificationTemplate(booking: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
            <h1>New Booking Received!</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Hello ${booking.supplier?.businessName},</p>
            <p>You have received a new booking:</p>

            <p><strong>Booking Reference:</strong> ${booking.bookingReference}</p>
            <p><strong>Customer:</strong> ${booking.user?.firstName} ${booking.user?.lastName}</p>
            <p><strong>Service Date:</strong> ${new Date(booking.serviceDate).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> ${booking.currency} ${Number(booking.totalAmount).toFixed(2)}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPaymentConfirmationTemplate(booking: any, payment: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h1>Payment Received</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Dear ${booking.user?.firstName || 'Customer'},</p>
            <p>We have received your payment for booking ${booking.bookingReference}.</p>

            <p><strong>Payment Amount:</strong> ${payment.currency} ${Number(payment.amount).toFixed(2)}</p>
            <p><strong>Payment Method:</strong> ${payment.method}</p>

            <p>Your booking is now confirmed!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getBookingCancellationTemplate(booking: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f44336; color: white; padding: 20px; text-align: center;">
            <h1>Booking Cancelled</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Dear ${booking.user?.firstName || 'Customer'},</p>
            <p>Your booking ${booking.bookingReference} has been cancelled.</p>

            ${booking.cancellationReason ? `<p><strong>Reason:</strong> ${booking.cancellationReason}</p>` : ''}

            <p>If you paid for this booking, a refund will be processed within 5-7 business days.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSupplierCancellationNotificationTemplate(booking: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f44336; color: white; padding: 20px; text-align: center;">
            <h1>Booking Cancelled</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Hello ${booking.supplier?.businessName},</p>
            <p>Booking ${booking.bookingReference} has been cancelled.</p>

            <p><strong>Customer:</strong> ${booking.user?.firstName} ${booking.user?.lastName}</p>
            ${booking.cancellationReason ? `<p><strong>Reason:</strong> ${booking.cancellationReason}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getBookingReminderTemplate(booking: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #FF9800; color: white; padding: 20px; text-align: center;">
            <h1>Booking Reminder</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Dear ${booking.user?.firstName || 'Customer'},</p>
            <p>This is a reminder that you have an upcoming booking tomorrow!</p>

            <p><strong>Booking Reference:</strong> ${booking.bookingReference}</p>
            <p><strong>Service Date:</strong> ${new Date(booking.serviceDate).toLocaleDateString()}</p>
            <p><strong>Supplier:</strong> ${booking.supplier?.businessName || 'Supplier'}</p>

            <p>We hope you have a wonderful experience!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getReviewRequestTemplate(booking: any): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h1>How Was Your Experience?</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Dear ${booking.user?.firstName || 'Customer'},</p>
            <p>Thank you for your recent booking with ${booking.supplier?.businessName}!</p>

            <p>We'd love to hear about your experience.</p>

            <p style="text-align: center;">
              <a href="${frontendUrl}/bookings/${booking.id}/review" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Leave a Review</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSupplierApprovalTemplate(supplier: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h1>Congratulations!</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Dear ${supplier.businessName},</p>
            <p>Great news! Your supplier account has been approved.</p>

            <p>You can now create and manage your services!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSupplierRejectionTemplate(supplier: any, reason: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f44336; color: white; padding: 20px; text-align: center;">
            <h1>Application Update</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Dear ${supplier.businessName},</p>
            <p>Unfortunately, we are unable to approve your application at this time.</p>

            <p><strong>Reason:</strong> ${reason}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
