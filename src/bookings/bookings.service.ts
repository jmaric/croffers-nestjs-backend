import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { ServicesService } from '../services/services.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  CreateBookingDto,
  UpdateBookingDto,
  CancelBookingDto,
  FilterBookingDto,
} from './dto/index.js';
import {
  BookingStatus,
  UserRole,
  Prisma,
} from '../../generated/prisma/client/client.js';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private servicesService: ServicesService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: number, createBookingDto: CreateBookingDto) {
    const serviceDate = new Date(createBookingDto.serviceDate);

    // Validate service date is in the future
    if (serviceDate <= new Date()) {
      throw new BadRequestException('Service date must be in the future');
    }

    // Fetch all services and validate
    const serviceIds = createBookingDto.items.map((item) => item.serviceId);
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      include: {
        supplier: true,
      },
    });

    if (services.length !== serviceIds.length) {
      throw new NotFoundException('One or more services not found');
    }

    // Validate all services are active
    const inactiveService = services.find((s) => !s.isActive);
    if (inactiveService) {
      throw new BadRequestException(
        `Service "${inactiveService.name}" is not available`,
      );
    }

    // Validate all services belong to the same supplier
    const supplierIds = [...new Set(services.map((s) => s.supplierId))];
    if (supplierIds.length > 1) {
      throw new BadRequestException(
        'All services in a booking must be from the same supplier',
      );
    }

    const supplier = services[0].supplier;

    // Check availability for all services
    const serviceDateStr = serviceDate.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
    const availabilityChecks = await Promise.all(
      createBookingDto.items.map((item) =>
        this.servicesService.checkAvailability(item.serviceId, serviceDateStr, item.quantity),
      ),
    );

    // Find any unavailable services
    const unavailableServices = availabilityChecks.filter((check) => !check.available);
    if (unavailableServices.length > 0) {
      const reasons = unavailableServices
        .map((check) => {
          if (check.reason) {
            return `${check.service.name}: ${check.reason}`;
          }
          return `${check.service.name}: Requested ${check.requestedQuantity}, but only ${check.availableCapacity} available`;
        })
        .join('; ');
      throw new BadRequestException(`Services not available: ${reasons}`);
    }

    // Calculate totals
    let totalAmount = new Prisma.Decimal(0);
    const bookingItems = createBookingDto.items.map((item) => {
      const service = services.find((s) => s.id === item.serviceId);
      if (!service) {
        throw new NotFoundException(`Service with ID ${item.serviceId} not found`);
      }
      const unitPrice = service.price;
      const totalPrice = new Prisma.Decimal(unitPrice.toString()).mul(item.quantity);
      totalAmount = totalAmount.add(totalPrice);

      return {
        serviceId: item.serviceId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        metadata: item.metadata,
      };
    });

    // Calculate commission
    const commission = totalAmount.mul(supplier.commissionRate);

    // Create booking with items
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        supplierId: supplier.id,
        status: BookingStatus.PENDING,
        totalAmount,
        commission,
        serviceDate,
        notes: createBookingDto.notes,
        bookingItems: {
          create: bookingItems,
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
        supplier: {
          select: {
            id: true,
            businessName: true,
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
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

    // Send confirmation email to user and supplier
    await this.mailService.sendBookingConfirmation(booking);

    // Send notifications to guest and supplier
    await Promise.all([
      this.notificationsService.notifyBookingConfirmation(
        userId,
        booking.id,
        booking.bookingReference,
      ),
      this.notificationsService.notifySupplierNewBooking(
        supplier.id,
        booking.id,
        booking.bookingReference,
        Number(totalAmount),
      ),
    ]);

    return booking;
  }

  async findAll(filterDto: FilterBookingDto) {
    const {
      userId,
      supplierId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
    } = filterDto;

    const where: any = {};

    if (userId) where.userId = userId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.serviceDate = {};
      if (dateFrom) where.serviceDate.gte = new Date(dateFrom);
      if (dateTo) where.serviceDate.lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
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
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              method: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMyBookings(userId: number, filterDto: FilterBookingDto) {
    return this.findAll({ ...filterDto, userId });
  }

  async findSupplierBookings(userId: number, filterDto: FilterBookingDto) {
    // Get supplier for this user
    const supplier = await this.prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier profile not found');
    }

    return this.findAll({ ...filterDto, supplierId: supplier.id });
  }

  async findOne(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        bookingItems: {
          include: {
            service: {
              include: {
                transportService: {
                  include: {
                    departureLocation: true,
                    arrivalLocation: true,
                  },
                },
                accommodationService: {
                  include: {
                    location: true,
                  },
                },
                tourService: {
                  include: {
                    location: true,
                  },
                },
                activityService: {
                  include: {
                    location: true,
                  },
                },
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            businessName: true,
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async findByReference(bookingReference: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingReference },
      include: {
        bookingItems: {
          include: {
            service: true,
          },
        },
        supplier: {
          select: {
            id: true,
            businessName: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(
        `Booking with reference ${bookingReference} not found`,
      );
    }

    return booking;
  }

  async update(
    id: number,
    userId: number,
    userRole: UserRole,
    updateBookingDto: UpdateBookingDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Only owner or admin can update
    if (booking.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this booking');
    }

    // Cannot update confirmed or completed bookings
    if (
      booking.status === BookingStatus.CONFIRMED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException('Cannot update confirmed or completed bookings');
    }

    const data: any = {};

    if (updateBookingDto.serviceDate) {
      const newDate = new Date(updateBookingDto.serviceDate);
      if (newDate <= new Date()) {
        throw new BadRequestException('Service date must be in the future');
      }
      data.serviceDate = newDate;
    }

    if (updateBookingDto.notes !== undefined) {
      data.notes = updateBookingDto.notes;
    }

    return this.prisma.booking.update({
      where: { id },
      data,
      include: {
        bookingItems: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  async confirm(id: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        supplier: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Only supplier or admin can confirm
    const supplier = await this.prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier || booking.supplierId !== supplier.id) {
      throw new ForbiddenException('Only the supplier can confirm this booking');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
      include: {
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
        user: true,
      },
    });

    // Send confirmation email
    await this.mailService.sendBookingConfirmation(updated);

    return updated;
  }

  async cancel(
    id: number,
    userId: number,
    userRole: UserRole,
    cancelBookingDto: CancelBookingDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        supplier: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Check permissions (owner, supplier, or admin)
    const supplier = await this.prisma.supplier.findFirst({
      where: { userId },
    });

    const isOwner = booking.userId === userId;
    const isSupplier = supplier && booking.supplierId === supplier.id;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isSupplier && !isAdmin) {
      throw new ForbiddenException('You do not have permission to cancel this booking');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed bookings');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancelBookingDto.cancellationReason,
      },
      include: {
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
        user: true,
      },
    });

    // TODO: Process refund if payment was made

    // Send cancellation email
    await this.mailService.sendBookingCancellation(updated);

    return updated;
  }

  async complete(id: number, userId: number, userRole: UserRole) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        supplier: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Only supplier or admin can complete
    const supplier = await this.prisma.supplier.findFirst({
      where: { userId },
    });

    const isSupplier = supplier && booking.supplierId === supplier.id;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isSupplier && !isAdmin) {
      throw new ForbiddenException('Only the supplier or admin can complete this booking');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be completed');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.COMPLETED },
      include: {
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
        user: true,
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

    // Send review request email to user
    await this.mailService.sendReviewRequest(updated);

    return updated;
  }

  async remove(id: number, userId: number, userRole: UserRole) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Only admin can delete bookings
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete bookings');
    }

    // Cannot delete if payments exist
    if (booking.payments.length > 0) {
      throw new BadRequestException('Cannot delete booking with payments');
    }

    await this.prisma.booking.delete({
      where: { id },
    });

    return {
      message: 'Booking deleted successfully',
    };
  }
}