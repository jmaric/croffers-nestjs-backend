import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import {
  CreatePaymentIntentDto,
  ProcessPaymentDto,
  RefundPaymentDto,
  FilterPaymentDto,
} from './dto/index.js';
import {
  PaymentStatus,
  BookingStatus,
  PaymentMethod,
} from '../../generated/prisma/client/client.js';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.warn('STRIPE_SECRET_KEY not configured. Payment processing will not work.');
    }
    this.stripe = new Stripe(stripeSecretKey || 'sk_test_dummy', {
      apiVersion: '2025-11-17.clover',
    });
  }

  async createPaymentIntent(userId: number, createPaymentIntentDto: CreatePaymentIntentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: createPaymentIntentDto.bookingId },
      include: {
        user: true,
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify user owns this booking
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not have permission to pay for this booking');
    }

    // Check if booking is already paid
    const completedPayment = booking.payments.find(
      (p) => p.status === PaymentStatus.COMPLETED,
    );
    if (completedPayment) {
      throw new BadRequestException('Booking is already paid');
    }

    // Check if booking is cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for cancelled booking');
    }

    // Create Stripe payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(Number(booking.totalAmount) * 100), // Convert to cents
      currency: booking.currency.toLowerCase(),
      metadata: {
        bookingId: booking.id.toString(),
        bookingReference: booking.bookingReference,
        userId: userId.toString(),
      },
      description: `Booking ${booking.bookingReference}`,
    });

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.STRIPE,
        stripePaymentId: paymentIntent.id,
        metadata: {
          clientSecret: paymentIntent.client_secret,
        },
      },
    });

    return {
      payment,
      clientSecret: paymentIntent.client_secret,
    };
  }

  async processPayment(userId: number, processPaymentDto: ProcessPaymentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: processPaymentDto.bookingId },
      include: {
        user: true,
        bookingItems: {
          include: {
            service: true,
          },
        },
        supplier: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify user owns this booking
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not have permission to process this payment');
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await this.stripe.paymentIntents.retrieve(
      processPaymentDto.paymentIntentId,
    );

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment has not succeeded yet');
    }

    // Find payment record
    const payment = await this.prisma.payment.findFirst({
      where: {
        bookingId: processPaymentDto.bookingId,
        stripePaymentId: processPaymentDto.paymentIntentId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Update payment status
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        method: processPaymentDto.method,
        processedAt: new Date(),
      },
    });

    // Update booking status to CONFIRMED
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CONFIRMED },
    });

    // Send payment confirmation email
    await this.mailService.sendPaymentConfirmation(booking, updatedPayment);

    return updatedPayment;
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntent.id },
      include: {
        booking: {
          include: {
            user: true,
            bookingItems: {
              include: {
                service: true,
              },
            },
            supplier: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      console.error(`Payment not found for intent: ${paymentIntent.id}`);
      return;
    }

    // Update payment status
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        processedAt: new Date(),
      },
    });

    // Update booking status
    await this.prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });

    // Send confirmation email
    await this.mailService.sendPaymentConfirmation(payment.booking, updatedPayment);
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (!payment) {
      console.error(`Payment not found for intent: ${paymentIntent.id}`);
      return;
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    });

    // TODO: Send payment failed email
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentId: charge.payment_intent as string },
      include: {
        booking: {
          include: {
            user: true,
            bookingItems: {
              include: {
                service: true,
              },
            },
            supplier: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      console.error(`Payment not found for charge: ${charge.id}`);
      return;
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });

    // Update booking status
    await this.prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: BookingStatus.REFUNDED },
    });

    // Send refund confirmation email
    await this.mailService.sendBookingCancellation(payment.booking);
  }

  async refund(id: number, userId: number, refundPaymentDto: RefundPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            user: true,
            bookingItems: {
              include: {
                service: true,
              },
            },
            supplier: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    if (!payment.stripePaymentId) {
      throw new BadRequestException('Payment does not have Stripe payment ID');
    }

    // Calculate refund amount (default to full amount)
    const refundAmount = refundPaymentDto.amount
      ? Math.round(refundPaymentDto.amount * 100)
      : Math.round(Number(payment.amount) * 100);

    // Create refund in Stripe
    const refund = await this.stripe.refunds.create({
      payment_intent: payment.stripePaymentId,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        bookingId: payment.bookingId.toString(),
        reason: refundPaymentDto.reason,
      },
    });

    // Update payment status
    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REFUNDED,
        metadata: {
          ...((payment.metadata as object) || {}),
          refundId: refund.id,
          refundReason: refundPaymentDto.reason,
        },
      },
    });

    // Update booking status
    await this.prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: BookingStatus.REFUNDED },
    });

    // Send refund confirmation email
    await this.mailService.sendBookingCancellation(payment.booking);

    return updatedPayment;
  }

  async findAll(filterDto: FilterPaymentDto) {
    const { bookingId, status, page = 1, limit = 10 } = filterDto;

    const where: any = {};

    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          booking: {
            select: {
              id: true,
              bookingReference: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            supplier: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findByBooking(bookingId: number) {
    return this.prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }
}