import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateGroupBookingDto,
  GroupBookingQuoteDto,
  GroupBookingQuoteResponseDto,
} from '../dto/group-booking.dto.js';

@Injectable()
export class GroupBookingService {
  private readonly logger = new Logger(GroupBookingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate group discount percentage based on group size
   * 10-19 people: 10% discount
   * 20-29 people: 15% discount
   * 30-49 people: 20% discount
   * 50+ people: 25% discount
   */
  private calculateGroupDiscount(groupSize: number): number {
    if (groupSize < 10) return 0;
    if (groupSize < 20) return 10;
    if (groupSize < 30) return 15;
    if (groupSize < 50) return 20;
    return 25;
  }

  /**
   * Get quote for group booking
   */
  async getGroupQuote(dto: GroupBookingQuoteDto): Promise<GroupBookingQuoteResponseDto> {
    this.logger.debug(
      `Getting group quote for service ${dto.serviceId}, ${dto.groupSize} people`,
    );

    // Get service details
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true,
        capacity: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service ${dto.serviceId} not found`);
    }

    // Check capacity
    if (service.capacity && dto.groupSize > service.capacity) {
      throw new BadRequestException(
        `Group size ${dto.groupSize} exceeds service capacity ${service.capacity}`,
      );
    }

    // Calculate discount
    const discountPercentage = this.calculateGroupDiscount(dto.groupSize);
    const regularPricePerPerson = parseFloat(service.price.toString());
    const discountedPricePerPerson =
      regularPricePerPerson * (1 - discountPercentage / 100);

    const totalRegularPrice = regularPricePerPerson * dto.groupSize;
    const totalDiscountedPrice = discountedPricePerPerson * dto.groupSize;
    const totalSavings = totalRegularPrice - totalDiscountedPrice;

    return {
      serviceName: service.name,
      regularPricePerPerson,
      groupSize: dto.groupSize,
      discountPercentage,
      discountedPricePerPerson: Math.round(discountedPricePerPerson * 100) / 100,
      totalRegularPrice: Math.round(totalRegularPrice * 100) / 100,
      totalDiscountedPrice: Math.round(totalDiscountedPrice * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      currency: service.currency,
    };
  }

  /**
   * Create group booking
   */
  async createGroupBooking(dto: CreateGroupBookingDto, userId: number) {
    this.logger.log(
      `Creating group booking for service ${dto.serviceId}, ${dto.groupSize} people`,
    );

    // Get service details
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      include: {
        supplier: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service ${dto.serviceId} not found`);
    }

    // Check capacity
    if (service.capacity && dto.groupSize > service.capacity) {
      throw new BadRequestException(
        `Group size ${dto.groupSize} exceeds service capacity ${service.capacity}`,
      );
    }

    // Calculate pricing
    const discountPercentage = this.calculateGroupDiscount(dto.groupSize);
    const regularPricePerPerson = parseFloat(service.price.toString());
    const discountedPricePerPerson =
      regularPricePerPerson * (1 - discountPercentage / 100);
    const totalAmount = discountedPricePerPerson * dto.groupSize;

    // Calculate commission
    const commissionRate = service.supplier.commissionRate || 0.15;
    const commission = totalAmount * commissionRate;

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        supplierId: service.supplierId,
        totalAmount,
        currency: service.currency,
        commission,
        serviceDate: new Date(dto.serviceDate),
        isGroupBooking: true,
        groupSize: dto.groupSize,
        groupCoordinator: dto.groupCoordinator,
        groupDiscount: discountPercentage,
        notes: dto.notes,
        bookingItems: {
          create: {
            serviceId: service.id,
            quantity: dto.groupSize,
            unitPrice: discountedPricePerPerson,
            totalPrice: totalAmount,
            metadata: dto.participants
              ? ({ participants: dto.participants } as any)
              : undefined,
          },
        },
      },
      include: {
        bookingItems: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Group booking created: ${booking.bookingReference}`);

    return {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      totalAmount: parseFloat(booking.totalAmount.toString()),
      currency: booking.currency,
      groupSize: booking.groupSize,
      groupCoordinator: booking.groupCoordinator,
      discountPercentage: booking.groupDiscount
        ? parseFloat(booking.groupDiscount.toString())
        : 0,
      regularPrice: regularPricePerPerson * dto.groupSize,
      savings:
        regularPricePerPerson * dto.groupSize -
        parseFloat(booking.totalAmount.toString()),
      serviceDate: booking.serviceDate,
      service: {
        id: service.id,
        name: service.name,
        type: service.type,
      },
    };
  }

  /**
   * Get group bookings for a user
   */
  async getUserGroupBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: {
        userId,
        isGroupBooking: true,
      },
      include: {
        bookingItems: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get group booking statistics for admin
   */
  async getGroupBookingStats() {
    const stats = await this.prisma.booking.aggregate({
      where: {
        isGroupBooking: true,
      },
      _count: true,
      _sum: {
        totalAmount: true,
        groupSize: true,
      },
      _avg: {
        groupSize: true,
        groupDiscount: true,
      },
    });

    const recentBookings = await this.prisma.booking.findMany({
      where: {
        isGroupBooking: true,
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        bookingReference: true,
        groupSize: true,
        groupCoordinator: true,
        totalAmount: true,
        serviceDate: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      totalGroupBookings: stats._count,
      totalRevenue: stats._sum.totalAmount || 0,
      totalGuests: stats._sum.groupSize || 0,
      averageGroupSize: stats._avg.groupSize || 0,
      averageDiscount: stats._avg.groupDiscount || 0,
      recentBookings,
    };
  }
}
