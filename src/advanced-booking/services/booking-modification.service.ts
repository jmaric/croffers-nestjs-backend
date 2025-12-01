import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ModifyBookingDateDto,
  ModifyBookingGuestsDto,
  UpgradeServiceDto,
  AddServiceToBookingDto,
  RemoveServiceFromBookingDto,
  BookingModificationResponseDto,
} from '../dto/booking-modification.dto.js';
import { ModificationType, BookingStatus } from '../../../generated/prisma/client/client.js';

@Injectable()
export class BookingModificationService {
  private readonly logger = new Logger(BookingModificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Modify booking date
   */
  async modifyDate(dto: ModifyBookingDateDto, userId: number) {
    this.logger.log(`Modifying booking ${dto.bookingId} date to ${dto.newServiceDate}`);

    const booking = await this.getAndValidateBooking(dto.bookingId, userId);

    const previousDate = booking.serviceDate;
    const newDate = new Date(dto.newServiceDate);

    // Calculate price difference (if any)
    const priceDifference = 0; // Can add dynamic pricing based on date

    // Create modification record
    const modification = await this.prisma.bookingModification.create({
      data: {
        bookingId: dto.bookingId,
        modificationType: ModificationType.DATE_CHANGE,
        previousData: {
          serviceDate: previousDate,
        },
        newData: {
          serviceDate: newDate,
        },
        priceDifference,
        status: 'pending',
        reason: dto.reason,
      },
    });

    // Auto-approve if no price change
    if (priceDifference === 0) {
      await this.approveModification(modification.id);
    }

    return this.mapToResponseDto(modification);
  }

  /**
   * Modify guest count
   */
  async modifyGuestCount(dto: ModifyBookingGuestsDto, userId: number) {
    this.logger.log(`Modifying booking ${dto.bookingId} guest count to ${dto.newGuestCount}`);

    const booking = await this.getAndValidateBooking(dto.bookingId, userId);

    // Get service capacity
    const service = await this.prisma.service.findFirst({
      where: {
        bookingItems: {
          some: { bookingId: dto.bookingId },
        },
      },
      include: {
        accommodationService: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Check capacity
    const maxGuests = service.accommodationService?.maxGuests || service.capacity;
    if (maxGuests && dto.newGuestCount > maxGuests) {
      throw new BadRequestException(
        `Maximum ${maxGuests} guests allowed`,
      );
    }

    // Calculate price difference
    const currentGuests = booking.bookingItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const pricePerGuest =
      parseFloat(booking.totalAmount.toString()) / currentGuests;
    const priceDifference = (dto.newGuestCount - currentGuests) * pricePerGuest;

    // Create modification
    const modification = await this.prisma.bookingModification.create({
      data: {
        bookingId: dto.bookingId,
        modificationType: ModificationType.GUEST_COUNT_CHANGE,
        previousData: {
          guestCount: currentGuests,
        },
        newData: {
          guestCount: dto.newGuestCount,
        },
        priceDifference,
        status: 'pending',
        reason: dto.reason,
      },
    });

    return this.mapToResponseDto(modification);
  }

  /**
   * Upgrade service
   */
  async upgradeService(dto: UpgradeServiceDto, userId: number) {
    this.logger.log(
      `Upgrading service in booking ${dto.bookingId} from ${dto.currentServiceId} to ${dto.upgradedServiceId}`,
    );

    const booking = await this.getAndValidateBooking(dto.bookingId, userId);

    // Get both services
    const [currentService, upgradedService] = await Promise.all([
      this.prisma.service.findUnique({
        where: { id: dto.currentServiceId },
      }),
      this.prisma.service.findUnique({
        where: { id: dto.upgradedServiceId },
      }),
    ]);

    if (!currentService || !upgradedService) {
      throw new NotFoundException('One or both services not found');
    }

    // Calculate price difference
    const currentPrice = parseFloat(currentService.price.toString());
    const upgradedPrice = parseFloat(upgradedService.price.toString());
    const priceDifference = upgradedPrice - currentPrice;

    if (priceDifference < 0) {
      throw new BadRequestException('Cannot downgrade to cheaper service');
    }

    // Create modification
    const modification = await this.prisma.bookingModification.create({
      data: {
        bookingId: dto.bookingId,
        modificationType: ModificationType.SERVICE_UPGRADE,
        previousData: {
          serviceId: currentService.id,
          serviceName: currentService.name,
          price: currentPrice,
        },
        newData: {
          serviceId: upgradedService.id,
          serviceName: upgradedService.name,
          price: upgradedPrice,
        },
        priceDifference,
        status: 'pending',
        reason: dto.reason,
      },
    });

    return this.mapToResponseDto(modification);
  }

  /**
   * Add services to booking
   */
  async addServices(dto: AddServiceToBookingDto, userId: number) {
    this.logger.log(`Adding services to booking ${dto.bookingId}`);

    const booking = await this.getAndValidateBooking(dto.bookingId, userId);

    // Get services
    const services = await this.prisma.service.findMany({
      where: { id: { in: dto.serviceIds } },
    });

    if (services.length !== dto.serviceIds.length) {
      throw new NotFoundException('One or more services not found');
    }

    // Calculate total price for new services
    const priceDifference = services.reduce(
      (sum, service) => sum + parseFloat(service.price.toString()),
      0,
    );

    // Create modification
    const modification = await this.prisma.bookingModification.create({
      data: {
        bookingId: dto.bookingId,
        modificationType: ModificationType.SERVICE_ADDITION,
        previousData: {
          serviceCount: booking.bookingItems.length,
        },
        newData: {
          addedServices: services.map((s) => ({
            id: s.id,
            name: s.name,
            price: s.price.toString(),
          })),
        },
        priceDifference,
        status: 'pending',
        reason: dto.reason,
      },
    });

    return this.mapToResponseDto(modification);
  }

  /**
   * Remove service from booking
   */
  async removeService(dto: RemoveServiceFromBookingDto, userId: number) {
    this.logger.log(
      `Removing service from booking ${dto.bookingId}, item ${dto.bookingItemId}`,
    );

    const booking = await this.getAndValidateBooking(dto.bookingId, userId);

    // Get booking item
    const bookingItem = booking.bookingItems.find(
      (item) => item.id === dto.bookingItemId,
    );

    if (!bookingItem) {
      throw new NotFoundException('Booking item not found');
    }

    // Cannot remove if only one service
    if (booking.bookingItems.length === 1) {
      throw new BadRequestException(
        'Cannot remove the last service from booking. Cancel booking instead.',
      );
    }

    const priceDifference = -parseFloat(bookingItem.totalPrice.toString());

    // Create modification
    const modification = await this.prisma.bookingModification.create({
      data: {
        bookingId: dto.bookingId,
        modificationType: ModificationType.SERVICE_REMOVAL,
        previousData: {
          bookingItemId: dto.bookingItemId,
          serviceId: bookingItem.serviceId,
          price: bookingItem.totalPrice.toString(),
        },
        newData: {},
        priceDifference,
        status: 'pending',
        reason: dto.reason,
      },
    });

    return this.mapToResponseDto(modification);
  }

  /**
   * Approve modification and apply changes
   */
  async approveModification(modificationId: number) {
    this.logger.log(`Approving modification ${modificationId}`);

    const modification = await this.prisma.bookingModification.findUnique({
      where: { id: modificationId },
      include: {
        booking: true,
      },
    });

    if (!modification) {
      throw new NotFoundException(`Modification ${modificationId} not found`);
    }

    if (modification.status !== 'pending') {
      throw new BadRequestException('Modification already processed');
    }

    // Apply the modification based on type
    switch (modification.modificationType) {
      case ModificationType.DATE_CHANGE:
        await this.applyDateChange(modification);
        break;

      case ModificationType.GUEST_COUNT_CHANGE:
        await this.applyGuestCountChange(modification);
        break;

      case ModificationType.SERVICE_UPGRADE:
        await this.applyServiceUpgrade(modification);
        break;

      case ModificationType.SERVICE_ADDITION:
        await this.applyServiceAddition(modification);
        break;

      case ModificationType.SERVICE_REMOVAL:
        await this.applyServiceRemoval(modification);
        break;
    }

    // Update modification status
    await this.prisma.bookingModification.update({
      where: { id: modificationId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
    });

    this.logger.log(`Modification ${modificationId} approved and applied`);

    return this.mapToResponseDto(modification);
  }

  /**
   * Get booking modifications
   */
  async getBookingModifications(bookingId: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this booking');
    }

    const modifications = await this.prisma.bookingModification.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });

    return modifications.map((m) => this.mapToResponseDto(m));
  }

  /**
   * Helper: Get and validate booking
   */
  private async getAndValidateBooking(bookingId: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Not authorized to modify this booking');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot modify cancelled booking');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot modify completed booking');
    }

    return booking;
  }

  /**
   * Helper: Apply date change
   */
  private async applyDateChange(modification: any) {
    await this.prisma.booking.update({
      where: { id: modification.bookingId },
      data: {
        serviceDate: modification.newData.serviceDate,
      },
    });
  }

  /**
   * Helper: Apply guest count change
   */
  private async applyGuestCountChange(modification: any) {
    const newTotal =
      parseFloat(modification.booking.totalAmount.toString()) +
      modification.priceDifference;

    await this.prisma.booking.update({
      where: { id: modification.bookingId },
      data: {
        totalAmount: newTotal,
      },
    });
  }

  /**
   * Helper: Apply service upgrade
   */
  private async applyServiceUpgrade(modification: any) {
    // Update booking item with new service
    const bookingItem = await this.prisma.bookingItem.findFirst({
      where: {
        bookingId: modification.bookingId,
        serviceId: modification.previousData.serviceId,
      },
    });

    if (bookingItem) {
      await this.prisma.bookingItem.update({
        where: { id: bookingItem.id },
        data: {
          serviceId: modification.newData.serviceId,
          unitPrice: modification.newData.price,
          totalPrice: modification.newData.price * bookingItem.quantity,
        },
      });

      // Update booking total
      await this.prisma.booking.update({
        where: { id: modification.bookingId },
        data: {
          totalAmount: {
            increment: modification.priceDifference,
          },
        },
      });
    }
  }

  /**
   * Helper: Apply service addition
   */
  private async applyServiceAddition(modification: any) {
    const servicesToAdd = modification.newData.addedServices;

    for (const service of servicesToAdd) {
      await this.prisma.bookingItem.create({
        data: {
          bookingId: modification.bookingId,
          serviceId: service.id,
          quantity: 1,
          unitPrice: parseFloat(service.price),
          totalPrice: parseFloat(service.price),
        },
      });
    }

    await this.prisma.booking.update({
      where: { id: modification.bookingId },
      data: {
        totalAmount: {
          increment: modification.priceDifference,
        },
      },
    });
  }

  /**
   * Helper: Apply service removal
   */
  private async applyServiceRemoval(modification: any) {
    await this.prisma.bookingItem.delete({
      where: { id: modification.previousData.bookingItemId },
    });

    await this.prisma.booking.update({
      where: { id: modification.bookingId },
      data: {
        totalAmount: {
          increment: modification.priceDifference, // Negative value
        },
      },
    });
  }

  /**
   * Helper: Map to response DTO
   */
  private mapToResponseDto(modification: any): BookingModificationResponseDto {
    return {
      id: modification.id,
      bookingId: modification.bookingId,
      modificationType: modification.modificationType,
      previousData: modification.previousData,
      newData: modification.newData,
      priceDifference: modification.priceDifference
        ? parseFloat(modification.priceDifference.toString())
        : 0,
      currency: modification.currency,
      status: modification.status,
      reason: modification.reason,
      createdAt: modification.createdAt,
      approvedAt: modification.approvedAt,
    };
  }
}
