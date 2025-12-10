import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  JourneyStatus,
  SegmentType,
  TransportType,
  ServiceType,
  BookingStatus,
  Prisma,
} from '../../generated/prisma/client/client.js';
import {
  PlanJourneyDto,
  UpdateJourneyDto,
  BookJourneyDto,
  JourneyResponseDto,
  JourneyListResponseDto,
  AddSegmentDto,
  UpdateSegmentDto,
} from './dto/index.js';

interface RouteSegment {
  type: SegmentType;
  fromLocationId: number;
  toLocationId: number;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;
  price: number;
  serviceId?: number;
  metadata?: any;
}

@Injectable()
export class JourneysService {
  private readonly logger = new Logger(JourneysService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Plan a multi-modal journey from origin to destination
   * Creates a blank journey that users can manually populate with services
   */
  async planJourney(
    userId: number,
    dto: PlanJourneyDto,
  ): Promise<JourneyResponseDto> {
    this.logger.log(
      `Creating blank journey for user ${userId} from ${dto.originLocationId} to ${dto.destLocationId}`,
    );

    // Validate locations exist
    await this.validateLocations(dto.originLocationId, dto.destLocationId);

    // Check journey limit - only count PLANNING and READY journeys
    // Don't count CONFIRMED, BOOKING, PENDING_CHANGES, IN_PROGRESS, COMPLETED, or CANCELLED
    const planningJourneysCount = await this.prisma.journey.count({
      where: {
        userId,
        status: {
          in: [JourneyStatus.PLANNING, JourneyStatus.READY],
        },
      },
    });

    if (planningJourneysCount >= 3) {
      throw new BadRequestException(
        'You have reached the maximum of 3 planned journeys. Please book or delete an existing journey to create a new one.',
      );
    }

    // Create blank journey without segments - users will add services manually
    const journey = await this.prisma.journey.create({
      data: {
        userId,
        name: dto.name || 'My Croatian Adventure',
        originLocationId: dto.originLocationId,
        destLocationId: dto.destLocationId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        totalPrice: 0, // Will be calculated as services are added
        currency: 'EUR',
        travelers: dto.travelers,
        preferences: (dto.preferences || {}) as any,
        optimizedRoute: Prisma.JsonNull, // No auto-planning
        status: JourneyStatus.PLANNING,
        // No segments created - users add them manually
      },
      include: {
        segments: {
          include: {
            departureLocation: true,
            arrivalLocation: true,
            service: true,
          },
          orderBy: { segmentOrder: 'asc' },
        },
        originLocation: true,
        destLocation: true,
      },
    });

    this.logger.log(`Blank journey ${journey.id} created - ready for manual planning`);

    return this.mapToResponse(journey);
  }

  /**
   * Calculate optimal route from origin to destination
   */
  private async calculateOptimalRoute(
    dto: PlanJourneyDto,
  ): Promise<RouteSegment[]> {
    const segments: RouteSegment[] = [];
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Helper function to calculate day number from start date
    const getDayNumber = (date: Date): number => {
      const daysDiff = Math.floor(
        (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return Math.max(1, daysDiff + 1);
    };

    // Get location details
    const [origin, destination] = await Promise.all([
      this.prisma.location.findUnique({
        where: { id: dto.originLocationId },
      }),
      this.prisma.location.findUnique({
        where: { id: dto.destLocationId },
      }),
    ]);

    if (!origin || !destination) {
      throw new NotFoundException('Origin or destination location not found');
    }

    let currentLocation = origin;
    let currentTime = startDate;

    // Step 1: Airport to Port (if origin is airport)
    if (origin.type === 'AIRPORT') {
      const port = await this.findNearestPort(origin);
      if (port) {
        const transferService = await this.findBestTransport(
          origin.id,
          port.id,
          currentTime,
          TransportType.TAXI,
        );

        if (transferService) {
          const duration = 30; // Default 30 minutes for airport transfer
          const arrivalTime = new Date(
            currentTime.getTime() + duration * 60000,
          );

          segments.push({
            type: SegmentType.AIRPORT_TRANSFER,
            fromLocationId: origin.id,
            toLocationId: port.id,
            departureTime: currentTime,
            arrivalTime,
            duration,
            price: parseFloat(transferService.service.price.toString()),
            serviceId: transferService.service.id,
            metadata: {
              dayNumber: getDayNumber(currentTime),
              transportType: 'TAXI',
              vehicleType: transferService.vehicleType,
            },
          });

          currentLocation = port;
          currentTime = arrivalTime;
        }
      }
    }

    // Step 2: Ferry/Speedboat to island (if destination is on an island)
    if (destination.type === 'ISLAND' || destination.parentId) {
      const ferryService = await this.findBestFerryService(
        currentLocation.id,
        destination.id,
        currentTime,
        dto.preferences,
      );

      if (ferryService) {
        const duration = 90; // Default 90 minutes for ferry
        const arrivalTime = new Date(currentTime.getTime() + duration * 60000);

        segments.push({
          type: SegmentType.FERRY,
          fromLocationId: currentLocation.id,
          toLocationId: destination.id,
          departureTime: currentTime,
          arrivalTime,
          duration,
          price: parseFloat(ferryService.service.price.toString()),
          serviceId: ferryService.service.id,
          metadata: {
            dayNumber: getDayNumber(currentTime),
            transportType: ferryService.transportType,
            ferryCompany: 'Jadrolinija', // Placeholder
          },
        });

        currentLocation = destination;
        currentTime = arrivalTime;
      }
    }

    // Step 3: Accommodation at destination
    const accommodationService = await this.findBestAccommodation(
      destination.id,
      currentTime,
      endDate,
      dto.travelers,
      dto.preferences,
    );

    if (accommodationService) {
      const nights = Math.ceil(
        (endDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24),
      );
      const pricePerNight = parseFloat(
        accommodationService.service.price.toString(),
      );

      segments.push({
        type: SegmentType.ACCOMMODATION,
        fromLocationId: destination.id,
        toLocationId: destination.id,
        departureTime: currentTime,
        arrivalTime: endDate,
        duration: nights * 24 * 60,
        price: pricePerNight * nights,
        serviceId: accommodationService.service.id,
        metadata: {
          dayNumber: getDayNumber(currentTime),
          accommodationType: accommodationService.accommodationType,
          nights,
          checkInTime: accommodationService.checkInTime,
          checkOutTime: accommodationService.checkOutTime,
        },
      });
    }

    return segments;
  }

  /**
   * Find nearest port to a location
   */
  private async findNearestPort(location: any) {
    // Simple implementation - find port within 50km
    const ports = await this.prisma.location.findMany({
      where: {
        type: 'PORT',
        isActive: true,
      },
      take: 1,
    });

    return ports[0] || null;
  }

  /**
   * Find best transport service between two locations
   */
  private async findBestTransport(
    fromLocationId: number,
    toLocationId: number,
    departureTime: Date,
    transportType: TransportType,
  ) {
    const transports = await this.prisma.transportService.findMany({
      where: {
        departureLocationId: fromLocationId,
        arrivalLocationId: toLocationId,
        transportType,
        service: {
          isActive: true,
          status: 'ACTIVE',
        },
      },
      include: {
        service: true,
      },
      take: 1,
      orderBy: {
        service: {
          price: 'asc',
        },
      },
    });

    return transports[0] || null;
  }

  /**
   * Recursively find all descendant ports of a location
   */
  private async findDescendantPorts(locationId: number): Promise<number[]> {
    const portIds: number[] = [];

    // Check if the location itself is a port
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (location?.type === 'PORT' && location.isActive) {
      portIds.push(locationId);
    }

    // Find all children of this location
    const children = await this.prisma.location.findMany({
      where: {
        parentId: locationId,
        isActive: true,
      },
    });

    // Recursively search children for ports
    for (const child of children) {
      if (child.type === 'PORT') {
        portIds.push(child.id);
      } else {
        // Recursively search this child's descendants
        const childPorts = await this.findDescendantPorts(child.id);
        portIds.push(...childPorts);
      }
    }

    return portIds;
  }

  /**
   * Find best ferry service between locations
   */
  private async findBestFerryService(
    fromLocationId: number,
    toLocationId: number,
    departureTime: Date,
    preferences?: any,
  ) {
    // First, try direct match
    let ferries = await this.prisma.transportService.findMany({
      where: {
        departureLocationId: fromLocationId,
        arrivalLocationId: toLocationId,
        transportType: {
          in: [TransportType.FERRY, TransportType.SPEEDBOAT],
        },
        service: {
          isActive: true,
          status: 'ACTIVE',
        },
      },
      include: {
        service: true,
      },
      take: 1,
      orderBy: {
        service: {
          price: preferences?.budget === 'PREMIUM' ? 'desc' : 'asc',
        },
      },
    });

    // If no direct match, look for ports as descendants of the locations
    if (ferries.length === 0) {
      // Find ports that are descendants of origin and destination (recursive search)
      const [departurePortIds, arrivalPortIds] = await Promise.all([
        this.findDescendantPorts(fromLocationId),
        this.findDescendantPorts(toLocationId),
      ]);

      if (departurePortIds.length > 0 && arrivalPortIds.length > 0) {
        ferries = await this.prisma.transportService.findMany({
          where: {
            departureLocationId: { in: departurePortIds },
            arrivalLocationId: { in: arrivalPortIds },
            transportType: {
              in: [TransportType.FERRY, TransportType.SPEEDBOAT],
            },
            service: {
              isActive: true,
              status: 'ACTIVE',
            },
          },
          include: {
            service: true,
          },
          take: 1,
          orderBy: {
            service: {
              price: preferences?.budget === 'PREMIUM' ? 'desc' : 'asc',
            },
          },
        });
      }
    }

    return ferries[0] || null;
  }

  /**
   * Find best accommodation at location
   */
  private async findBestAccommodation(
    locationId: number,
    checkIn: Date,
    checkOut: Date,
    guests: number,
    preferences?: any,
  ) {
    // First, try direct match at the location
    let accommodations = await this.prisma.accommodationService.findMany({
      where: {
        locationId,
        maxGuests: {
          gte: guests,
        },
        service: {
          isActive: true,
          status: 'ACTIVE',
        },
      },
      include: {
        service: true,
      },
      take: 1,
      orderBy: {
        service: {
          price: preferences?.budget === 'LUXURY' ? 'desc' : 'asc',
        },
      },
    });

    // If no direct match, look for accommodations in child locations (e.g., Hvar Town if searching for Hvar Island)
    if (accommodations.length === 0) {
      const childLocations = await this.prisma.location.findMany({
        where: {
          OR: [
            { id: locationId },
            { parentId: locationId },
          ],
          isActive: true,
        },
      });

      const locationIds = childLocations.map((l) => l.id);

      if (locationIds.length > 0) {
        accommodations = await this.prisma.accommodationService.findMany({
          where: {
            locationId: { in: locationIds },
            maxGuests: {
              gte: guests,
            },
            service: {
              isActive: true,
              status: 'ACTIVE',
            },
          },
          include: {
            service: true,
          },
          take: 1,
          orderBy: {
            service: {
              price: preferences?.budget === 'LUXURY' ? 'desc' : 'asc',
            },
          },
        });
      }
    }

    return accommodations[0] || null;
  }

  /**
   * Get journey by ID
   */
  async getJourney(
    journeyId: number,
    userId: number,
  ): Promise<JourneyResponseDto> {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        segments: {
          include: {
            departureLocation: true,
            arrivalLocation: true,
            service: true,
          },
          orderBy: { segmentOrder: 'asc' },
        },
        originLocation: true,
        destLocation: true,
      },
    });

    if (!journey) {
      throw new NotFoundException(`Journey with ID ${journeyId} not found`);
    }

    // Check ownership
    if (journey.userId !== userId) {
      throw new ForbiddenException('You do not have access to this journey');
    }

    return this.mapToResponse(journey);
  }

  /**
   * Get user's journeys
   */
  async getUserJourneys(
    userId: number,
    page = 1,
    limit = 10,
  ): Promise<JourneyListResponseDto> {
    const skip = (page - 1) * limit;

    const [journeys, total] = await Promise.all([
      this.prisma.journey.findMany({
        where: { userId },
        include: {
          segments: {
            include: {
              departureLocation: true,
              arrivalLocation: true,
              service: true,
            },
            orderBy: { segmentOrder: 'asc' },
          },
          originLocation: true,
          destLocation: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.journey.count({ where: { userId } }),
    ]);

    return {
      journeys: journeys.map((j) => this.mapToResponse(j)),
      total,
      page,
      limit,
    };
  }

  /**
   * Update journey
   */
  async updateJourney(
    journeyId: number,
    userId: number,
    dto: UpdateJourneyDto,
  ): Promise<JourneyResponseDto> {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
    });

    if (!journey) {
      throw new NotFoundException(`Journey with ID ${journeyId} not found`);
    }

    if (journey.userId !== userId) {
      throw new ForbiddenException('You do not have access to this journey');
    }

    // Prevent updating booked/confirmed journeys
    if (
      journey.status === JourneyStatus.CONFIRMED ||
      journey.status === JourneyStatus.IN_PROGRESS ||
      journey.status === JourneyStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot update journey in current status',
      );
    }

    const updated = await this.prisma.journey.update({
      where: { id: journeyId },
      data: {
        name: dto.name,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        travelers: dto.travelers,
      },
      include: {
        segments: {
          include: {
            departureLocation: true,
            arrivalLocation: true,
            service: true,
          },
          orderBy: { segmentOrder: 'asc' },
        },
        originLocation: true,
        destLocation: true,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Delete journey
   */
  async deleteJourney(journeyId: number, userId: number): Promise<void> {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        segments: {
          include: {
            booking: true,
          },
        },
      },
    });

    if (!journey) {
      throw new NotFoundException(`Journey with ID ${journeyId} not found`);
    }

    if (journey.userId !== userId) {
      throw new ForbiddenException('You do not have access to this journey');
    }

    // Check if there are any active bookings
    const activeBookings = journey.segments.filter(
      (segment) =>
        segment.booking &&
        (segment.booking.status === 'PENDING' ||
          segment.booking.status === 'CONFIRMED'),
    );

    if (activeBookings.length > 0) {
      throw new BadRequestException(
        'Cannot delete journey with active bookings. Please cancel all bookings first.',
      );
    }

    // Allow deletion of journeys in any status as long as there are no active bookings
    // This includes PLANNING, READY, BOOKING, CANCELLED, COMPLETED, PENDING_CHANGES, IN_PROGRESS
    await this.prisma.journey.delete({ where: { id: journeyId } });
  }

  /**
   * Book entire journey (all segments)
   */
  async bookJourney(
    journeyId: number,
    userId: number,
    dto: BookJourneyDto,
  ): Promise<JourneyResponseDto> {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        segments: {
          include: {
            service: {
              include: {
                supplier: true,
              },
            },
          },
          orderBy: { segmentOrder: 'asc' },
        },
      },
    });

    if (!journey) {
      throw new NotFoundException(`Journey with ID ${journeyId} not found`);
    }

    if (journey.userId !== userId) {
      throw new ForbiddenException('You do not have access to this journey');
    }

    if (
      journey.status !== JourneyStatus.PLANNING &&
      journey.status !== JourneyStatus.READY &&
      journey.status !== JourneyStatus.PENDING_CHANGES
    ) {
      throw new BadRequestException(
        'Journey must be in PLANNING, READY, or PENDING_CHANGES status to book',
      );
    }

    // Generate a unique package booking ID for this journey
    const packageBookingId = `pkg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Filter segments that need booking
    // - Skip segments that are already booked (isBooked = true)
    // - Skip segments that are cancelled (isCancelled = true)
    const segmentsToBook = journey.segments.filter(
      (segment) => !segment.isBooked && !segment.isCancelled,
    );

    if (segmentsToBook.length === 0) {
      throw new BadRequestException(
        'No segments available for booking. All segments are either already booked or cancelled.',
      );
    }

    // Group segments for booking creation
    // - For ACCOMMODATION: group consecutive segments for the same service
    // - For other types: create one booking per segment
    interface BookingGroup {
      segments: typeof journey.segments;
      serviceId: number;
      supplierId: number;
      segmentType: string;
      checkIn: Date | null;
      checkOut: Date | null;
      totalAmount: number;
    }

    const bookingGroups: BookingGroup[] = [];
    let currentAccommodationGroup: BookingGroup | null = null;

    for (const segment of segmentsToBook) {
      if (!segment.service) {
        throw new BadRequestException(
          `Segment ${segment.id} does not have an associated service`,
        );
      }

      const segmentAmount = parseFloat(segment.price.toString());

      // For ACCOMMODATION: group consecutive segments for the same service
      if (segment.segmentType === 'ACCOMMODATION') {
        if (
          currentAccommodationGroup &&
          currentAccommodationGroup.serviceId === segment.serviceId
        ) {
          // Continue existing accommodation group
          currentAccommodationGroup.segments.push(segment);
          currentAccommodationGroup.totalAmount += segmentAmount;
          // Update check-out date
          if (segment.arrivalTime) {
            const checkOutDate = new Date(segment.arrivalTime);
            checkOutDate.setDate(checkOutDate.getDate() + 1);
            currentAccommodationGroup.checkOut = checkOutDate;
          }
        } else {
          // Start new accommodation group
          if (currentAccommodationGroup) {
            bookingGroups.push(currentAccommodationGroup);
          }

          currentAccommodationGroup = {
            segments: [segment],
            serviceId: segment.serviceId!,
            supplierId: segment.service.supplierId,
            segmentType: segment.segmentType,
            checkIn: segment.departureTime,
            checkOut: segment.arrivalTime
              ? new Date(new Date(segment.arrivalTime).getTime() + 86400000)
              : null,
            totalAmount: segmentAmount,
          };
        }
      } else {
        // Close any open accommodation group
        if (currentAccommodationGroup) {
          bookingGroups.push(currentAccommodationGroup);
          currentAccommodationGroup = null;
        }

        // Non-accommodation segments get their own booking
        bookingGroups.push({
          segments: [segment],
          serviceId: segment.serviceId!,
          supplierId: segment.service.supplierId,
          segmentType: segment.segmentType,
          checkIn: segment.departureTime,
          checkOut: segment.arrivalTime,
          totalAmount: segmentAmount,
        });
      }
    }

    // Don't forget to add the last accommodation group if it exists
    if (currentAccommodationGroup) {
      bookingGroups.push(currentAccommodationGroup);
    }

    // Create bookings for each group
    const bookingPromises: any[] = [];
    const segmentToBookingMap = new Map<number, any>(); // Track which booking each segment belongs to

    for (const group of bookingGroups) {
      const booking = this.prisma.booking.create({
        data: {
          userId,
          supplierId: group.supplierId,
          packageBookingId,
          status: BookingStatus.PENDING,
          totalAmount: group.totalAmount,
          currency: 'EUR',
          commission: group.totalAmount * 0.15, // 15% commission
          serviceDate: group.checkIn || journey.startDate,
          notes: dto.notes,
          bookingItems: {
            create: {
              serviceId: group.serviceId,
              quantity: journey.travelers,
              unitPrice: group.totalAmount / journey.travelers,
              totalPrice: group.totalAmount,
              metadata: {
                ...dto.guestDetails,
                segmentIds: group.segments.map((s) => s.id),
                checkIn: group.checkIn?.toISOString(),
                checkOut: group.checkOut?.toISOString(),
                dayCount: group.segments.length,
              },
            },
          },
        },
      });

      bookingPromises.push(booking);

      // Map all segments in this group to this booking
      for (const segment of group.segments) {
        segmentToBookingMap.set(segment.id, booking);
      }
    }

    // Execute all booking creations
    const bookings = await Promise.all(bookingPromises);

    // Send notification to each supplier about their booking
    for (const booking of bookings) {
      await this.notificationsService.notifySupplierNewBooking(
        booking.supplierId,
        booking.id,
        booking.bookingReference,
        Number(booking.totalAmount),
      );
    }

    // Update journey segments with booking IDs (only for newly booked segments)
    for (const segment of segmentsToBook) {
      const bookingPromise = segmentToBookingMap.get(segment.id);
      if (bookingPromise) {
        const booking = await bookingPromise;
        await this.prisma.journeySegment.update({
          where: { id: segment.id },
          data: {
            bookingId: booking?.id,
            isBooked: true,
          },
        });
      }
    }

    // Update journey status
    await this.prisma.journey.update({
      where: { id: journeyId },
      data: {
        status: JourneyStatus.BOOKING,
      },
    });

    // TODO: Process payment with Stripe using dto.paymentMethodId
    // For now, we'll simulate successful payment

    // Recalculate total price (excluding cancelled segments)
    const allSegments = await this.prisma.journeySegment.findMany({
      where: { journeyId },
    });
    const totalPrice = allSegments
      .filter((seg) => !seg.isCancelled)
      .reduce(
        (sum, seg) => sum + parseFloat(seg.price.toString()),
        0,
      );

    // Update journey status to CONFIRMED and recalculate total price
    const updatedJourney = await this.prisma.journey.update({
      where: { id: journeyId },
      data: {
        status: JourneyStatus.CONFIRMED,
        totalPrice,
      },
      include: {
        segments: {
          include: {
            departureLocation: true,
            arrivalLocation: true,
            service: true,
            booking: true,
          },
          orderBy: { segmentOrder: 'asc' },
        },
        originLocation: true,
        destLocation: true,
      },
    });

    // Mark all segments as confirmed
    await this.prisma.journeySegment.updateMany({
      where: { journeyId },
      data: { isConfirmed: true },
    });

    const isRebooking = journey.status === JourneyStatus.PENDING_CHANGES;
    this.logger.log(
      `Journey ${journeyId} ${isRebooking ? 'rebooked' : 'booked'} successfully with ${bookings.length} new booking${bookings.length !== 1 ? 's' : ''}`,
    );

    return this.mapToResponse(updatedJourney);
  }

  /**
   * Add a segment to a journey
   */
  async addSegment(
    journeyId: number,
    userId: number,
    dto: AddSegmentDto,
  ): Promise<JourneyResponseDto> {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        segments: {
          orderBy: { segmentOrder: 'asc' },
        },
      },
    });

    if (!journey) {
      throw new NotFoundException(`Journey with ID ${journeyId} not found`);
    }

    if (journey.userId !== userId) {
      throw new ForbiddenException('You do not have access to this journey');
    }

    // Prevent modifying confirmed journeys (allow PENDING_CHANGES for replacements)
    if (journey.status === JourneyStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot modify completed journey',
      );
    }

    if (journey.status === JourneyStatus.CONFIRMED) {
      throw new BadRequestException(
        'Cannot modify confirmed journey. If you need to make changes, cancel the booking first.',
      );
    }

    // Validate service exists (if serviceId provided)
    let service: Awaited<ReturnType<typeof this.prisma.service.findUnique>> = null;
    if (dto.serviceId) {
      service = await this.prisma.service.findUnique({
        where: { id: dto.serviceId },
      });

      if (!service) {
        throw new NotFoundException(`Service with ID ${dto.serviceId} not found`);
      }
    }

    // Calculate segment order
    let segmentOrder: number;
    if (dto.insertAfterOrder) {
      // Insert after specific segment - shift subsequent segments
      await this.prisma.journeySegment.updateMany({
        where: {
          journeyId,
          segmentOrder: { gt: dto.insertAfterOrder },
        },
        data: {
          segmentOrder: { increment: 1 },
        },
      });
      segmentOrder = dto.insertAfterOrder + 1;
    } else {
      // Add at the end
      segmentOrder = journey.segments.length + 1;
    }

    // Calculate duration
    const departureTime = new Date(dto.departureTime);
    const arrivalTime = new Date(dto.arrivalTime);
    const duration = dto.duration || Math.round((arrivalTime.getTime() - departureTime.getTime()) / 60000); // minutes

    // Determine price and currency
    let price: number;
    let currency: string;

    if (service) {
      // Use service price and currency
      const basePrice = parseFloat(service.price.toString());

      // For tours and activities, multiply by number of travelers (price is per person)
      // For accommodation and transport, use the base price (already includes all travelers or calculated separately)
      if (dto.segmentType === 'TOUR' || dto.segmentType === 'ACTIVITY') {
        price = basePrice * journey.travelers;
      } else {
        price = basePrice;
      }

      currency = service.currency;
    } else {
      // For transport segments, price and currency must be provided
      if (dto.price === undefined || !dto.currency) {
        throw new BadRequestException(
          'Price and currency are required for segments without a service'
        );
      }
      price = dto.price;
      currency = dto.currency;
    }

    // Create new segment
    await this.prisma.journeySegment.create({
      data: {
        journeyId,
        segmentType: dto.segmentType,
        segmentOrder,
        serviceId: dto.serviceId,
        departureLocationId: dto.departureLocationId,
        arrivalLocationId: dto.arrivalLocationId,
        departureTime,
        arrivalTime,
        duration,
        price,
        currency,
        isBooked: false,
        isConfirmed: false,
        metadata: {
          dayNumber: dto.dayNumber,
          timeOfDay: dto.timeOfDay,
          ...(dto.metadata || {}),
        },
      },
    });

    // Recalculate total price (excluding cancelled segments)
    const updatedSegments = await this.prisma.journeySegment.findMany({
      where: { journeyId },
    });

    const totalPrice = updatedSegments
      .filter((seg) => !seg.isCancelled)
      .reduce(
        (sum, seg) => sum + parseFloat(seg.price.toString()),
        0,
      );

    await this.prisma.journey.update({
      where: { id: journeyId },
      data: { totalPrice },
    });

    // Fetch and return updated journey
    return this.getJourney(journeyId, userId);
  }

  /**
   * Update a journey segment
   */
  async updateSegment(
    journeyId: number,
    segmentId: number,
    userId: number,
    dto: UpdateSegmentDto,
  ): Promise<JourneyResponseDto> {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        segments: {
          where: { id: segmentId },
        },
      },
    });

    if (!journey) {
      throw new NotFoundException(`Journey with ID ${journeyId} not found`);
    }

    if (journey.userId !== userId) {
      throw new ForbiddenException('You do not have access to this journey');
    }

    if (journey.segments.length === 0) {
      throw new NotFoundException(`Segment with ID ${segmentId} not found in this journey`);
    }

    // Prevent modifying confirmed journeys
    if (journey.status === JourneyStatus.CONFIRMED || journey.status === JourneyStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot modify confirmed or completed journey',
      );
    }

    // Build update data
    const updateData: any = {};

    if (dto.serviceId !== undefined) {
      const service = await this.prisma.service.findUnique({
        where: { id: dto.serviceId },
      });
      if (!service) {
        throw new NotFoundException(`Service with ID ${dto.serviceId} not found`);
      }
      updateData.serviceId = dto.serviceId;
      updateData.price = service.price;
      updateData.currency = service.currency;
    }

    if (dto.departureTime !== undefined) {
      updateData.departureTime = new Date(dto.departureTime);
    }

    if (dto.arrivalTime !== undefined) {
      updateData.arrivalTime = new Date(dto.arrivalTime);
    }

    if (dto.departureLocationId !== undefined) {
      updateData.departureLocationId = dto.departureLocationId;
    }

    if (dto.arrivalLocationId !== undefined) {
      updateData.arrivalLocationId = dto.arrivalLocationId;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    // Recalculate duration if times changed
    if (updateData.departureTime || updateData.arrivalTime) {
      const segment = journey.segments[0];
      const departureTime = updateData.departureTime || segment.departureTime;
      const arrivalTime = updateData.arrivalTime || segment.arrivalTime;

      if (departureTime && arrivalTime) {
        updateData.duration = Math.round(
          (new Date(arrivalTime).getTime() - new Date(departureTime).getTime()) / 60000
        );
      }
    }

    // Update segment
    await this.prisma.journeySegment.update({
      where: { id: segmentId },
      data: updateData,
    });

    // Recalculate total price if service changed
    if (dto.serviceId !== undefined) {
      const updatedSegments = await this.prisma.journeySegment.findMany({
        where: { journeyId },
      });

      const totalPrice = updatedSegments.reduce(
        (sum, seg) => sum + parseFloat(seg.price.toString()),
        0,
      );

      await this.prisma.journey.update({
        where: { id: journeyId },
        data: { totalPrice },
      });
    }

    // Fetch and return updated journey
    return this.getJourney(journeyId, userId);
  }

  /**
   * Delete a segment from a journey
   */
  async deleteSegment(
    journeyId: number,
    segmentId: number,
    userId: number,
  ): Promise<JourneyResponseDto> {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        segments: {
          where: { id: segmentId },
        },
      },
    });

    if (!journey) {
      throw new NotFoundException(`Journey with ID ${journeyId} not found`);
    }

    if (journey.userId !== userId) {
      throw new ForbiddenException('You do not have access to this journey');
    }

    if (journey.segments.length === 0) {
      throw new NotFoundException(`Segment with ID ${segmentId} not found in this journey`);
    }

    // Prevent modifying confirmed journeys
    if (journey.status === JourneyStatus.CONFIRMED || journey.status === JourneyStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot modify confirmed or completed journey',
      );
    }

    const segment = journey.segments[0];

    // Delete segment
    await this.prisma.journeySegment.delete({
      where: { id: segmentId },
    });

    // Reorder remaining segments
    await this.prisma.journeySegment.updateMany({
      where: {
        journeyId,
        segmentOrder: { gt: segment.segmentOrder },
      },
      data: {
        segmentOrder: { decrement: 1 },
      },
    });

    // Recalculate total price (excluding cancelled segments)
    const updatedSegments = await this.prisma.journeySegment.findMany({
      where: { journeyId },
    });

    const totalPrice = updatedSegments
      .filter((seg) => !seg.isCancelled)
      .reduce(
        (sum, seg) => sum + parseFloat(seg.price.toString()),
        0,
      );

    await this.prisma.journey.update({
      where: { id: journeyId },
      data: { totalPrice },
    });

    // Fetch and return updated journey
    return this.getJourney(journeyId, userId);
  }

  /**
   * Validate locations exist
   */
  private async validateLocations(
    originId: number,
    destId: number,
  ): Promise<void> {
    const locations = await this.prisma.location.findMany({
      where: {
        id: { in: [originId, destId] },
      },
    });

    if (locations.length !== 2) {
      throw new NotFoundException('One or more locations not found');
    }
  }

  /**
   * Map Prisma journey to response DTO
   */
  private mapToResponse(journey: any): JourneyResponseDto {
    // Recalculate segment prices for tours and activities (per-person pricing)
    const correctedSegments = journey.segments.map((seg: any) => {
      let correctedPrice = parseFloat(seg.price.toString());

      // If this is a tour or activity with a service, recalculate price per travelers
      if ((seg.segmentType === 'TOUR' || seg.segmentType === 'ACTIVITY') && seg.service) {
        const servicePricePerPerson = parseFloat(seg.service.price.toString());
        correctedPrice = servicePricePerPerson * journey.travelers;
      }

      return {
        id: seg.id,
        journeyId: seg.journeyId,
        segmentType: seg.segmentType,
        segmentOrder: seg.segmentOrder,
        serviceId: seg.serviceId,
        bookingId: seg.bookingId,
        departureLocationId: seg.departureLocationId,
        arrivalLocationId: seg.arrivalLocationId,
        departureTime: seg.departureTime,
        arrivalTime: seg.arrivalTime,
        duration: seg.duration,
        price: correctedPrice,
        currency: seg.currency,
        isBooked: seg.isBooked,
        isConfirmed: seg.isConfirmed,
        isCancelled: seg.isCancelled,
        cancelledAt: seg.cancelledAt,
        cancellationReason: seg.cancellationReason,
        notes: seg.notes,
        metadata: seg.metadata,
        departureLocation: seg.departureLocation
          ? {
              id: seg.departureLocation.id,
              name: seg.departureLocation.name,
              type: seg.departureLocation.type,
              latitude: seg.departureLocation.latitude,
              longitude: seg.departureLocation.longitude,
            }
          : undefined,
        arrivalLocation: seg.arrivalLocation
          ? {
              id: seg.arrivalLocation.id,
              name: seg.arrivalLocation.name,
              type: seg.arrivalLocation.type,
              latitude: seg.arrivalLocation.latitude,
              longitude: seg.arrivalLocation.longitude,
            }
          : undefined,
        service: seg.service
          ? {
              id: seg.service.id,
              name: seg.service.name,
              type: seg.service.type,
              description: seg.service.description,
            }
          : undefined,
      };
    });

    // Recalculate total price from corrected segments (excluding cancelled segments)
    const totalPrice = correctedSegments
      .filter((seg) => !seg.isCancelled)
      .reduce((sum, seg) => sum + seg.price, 0);

    return {
      id: journey.id,
      userId: journey.userId,
      status: journey.status,
      name: journey.name,
      originLocationId: journey.originLocationId,
      destLocationId: journey.destLocationId,
      startDate: journey.startDate,
      endDate: journey.endDate,
      totalPrice,
      currency: journey.currency,
      travelers: journey.travelers,
      preferences: journey.preferences,
      optimizedRoute: journey.optimizedRoute,
      segments: correctedSegments,
      createdAt: journey.createdAt,
      updatedAt: journey.updatedAt,
      originLocation: journey.originLocation
        ? {
            id: journey.originLocation.id,
            name: journey.originLocation.name,
            type: journey.originLocation.type,
            latitude: journey.originLocation.latitude,
            longitude: journey.originLocation.longitude,
          }
        : undefined,
      destLocation: journey.destLocation
        ? {
            id: journey.destLocation.id,
            name: journey.destLocation.name,
            type: journey.destLocation.type,
            latitude: journey.destLocation.latitude,
            longitude: journey.destLocation.longitude,
          }
        : undefined,
    };
  }

  // ============================================
  // JOURNEY LIFECYCLE & CANCELLATION MANAGEMENT
  // ============================================

  /**
   * Mark a journey as completed (archive it)
   * Completed journeys don't count toward the 3 journey limit
   */
  async completeJourney(id: number, userId: number): Promise<JourneyResponseDto> {
    const journey = await this.prisma.journey.findFirst({
      where: { id, userId },
    });

    if (!journey) {
      throw new NotFoundException(`Journey with ID ${id} not found`);
    }

    const updated = await this.prisma.journey.update({
      where: { id },
      data: { status: JourneyStatus.COMPLETED },
      include: {
        segments: {
          include: {
            departureLocation: true,
            arrivalLocation: true,
            service: true,
          },
          orderBy: { segmentOrder: 'asc' },
        },
        originLocation: true,
        destLocation: true,
      },
    });

    this.logger.log(`Journey ${id} marked as COMPLETED`);
    return this.mapToResponse(updated);
  }

  /**
   * Get all cancelled segments in a journey
   */
  async getCancelledSegments(journeyId: number, userId: number) {
    const journey = await this.prisma.journey.findFirst({
      where: { id: journeyId, userId },
      include: {
        segments: {
          where: { isCancelled: true },
          include: {
            service: true,
            departureLocation: true,
            arrivalLocation: true,
          },
        },
      },
    });

    if (!journey) {
      throw new NotFoundException(`Journey with ID ${journeyId} not found`);
    }

    return journey.segments;
  }

  /**
   * Find replacement services for a cancelled segment
   */
  async findReplacementServices(journeyId: number, segmentId: number, userId: number) {
    const segment = await this.prisma.journeySegment.findFirst({
      where: { id: segmentId, journeyId },
      include: {
        journey: true,
        departureLocation: true,
        arrivalLocation: true,
        service: true,
      },
    });

    if (!segment || segment.journey.userId !== userId) {
      throw new NotFoundException(`Segment with ID ${segmentId} not found`);
    }

    if (!segment.isCancelled) {
      throw new BadRequestException('Segment is not cancelled');
    }

    // Find similar services based on segment type and locations
    const similarServices = await this.prisma.service.findMany({
      where: {
        type: this.mapSegmentTypeToServiceType(segment.segmentType) as any,
        isActive: true,
        status: 'ACTIVE' as any,
        // For transport services, match departure and arrival locations
        ...(segment.segmentType === 'FERRY' || segment.segmentType === 'TRANSPORT'
          ? {
              transportService: {
                departureLocationId: segment.departureLocationId,
                arrivalLocationId: segment.arrivalLocationId,
              },
            }
          : {}),
        // For accommodations, match location
        ...(segment.segmentType === 'ACCOMMODATION' && segment.arrivalLocationId
          ? {
              accommodationService: {
                locationId: segment.arrivalLocationId,
              },
            }
          : {}),
      } as any,
      include: {
        supplier: {
          select: {
            businessName: true,
            userId: true,
          },
        },
        photos: {
          where: { isMain: true },
          take: 1,
        },
        transportService: true,
        accommodationService: true,
        tourService: true,
      },
      take: 10, // Limit to 10 alternatives
      orderBy: { price: 'asc' },
    });

    return similarServices;
  }

  /**
   * Replace a cancelled segment with a new service
   */
  async replaceSegment(
    journeyId: number,
    segmentId: number,
    newServiceId: number,
    userId: number,
  ): Promise<JourneyResponseDto> {
    const segment = await this.prisma.journeySegment.findFirst({
      where: { id: segmentId, journeyId },
      include: {
        journey: true,
        service: true,
      },
    });

    if (!segment || segment.journey.userId !== userId) {
      throw new NotFoundException(`Segment with ID ${segmentId} not found`);
    }

    if (!segment.isCancelled) {
      throw new BadRequestException('Segment is not cancelled');
    }

    // Get new service details
    const newService = await this.prisma.service.findUnique({
      where: { id: newServiceId },
      include: {
        transportService: true,
        accommodationService: true,
        tourService: true,
      },
    });

    if (!newService) {
      throw new NotFoundException(`Service with ID ${newServiceId} not found`);
    }

    // Update segment with new service
    await this.prisma.journeySegment.update({
      where: { id: segmentId },
      data: {
        serviceId: newServiceId,
        price: newService.price,
        isCancelled: false,
        cancelledAt: null,
        cancellationReason: null,
        // Update locations if it's a transport service
        ...(newService.transportService
          ? {
              departureLocationId: newService.transportService.departureLocationId,
              arrivalLocationId: newService.transportService.arrivalLocationId,
              departureTime: newService.transportService.departureTime,
              arrivalTime: newService.transportService.arrivalTime,
              duration: newService.duration,
            }
          : {}),
      },
    });

    // Check if all cancelled segments are now replaced
    const remainingCancelled = await this.prisma.journeySegment.count({
      where: { journeyId, isCancelled: true },
    });

    // If no more cancelled segments, change journey status back to CONFIRMED
    if (remainingCancelled === 0) {
      await this.prisma.journey.update({
        where: { id: journeyId },
        data: { status: JourneyStatus.CONFIRMED },
      });
      this.logger.log(`Journey ${journeyId} status changed back to CONFIRMED - all segments replaced`);
    }

    // Recalculate journey total price
    const allSegments = await this.prisma.journeySegment.findMany({
      where: { journeyId },
    });
    const newTotalPrice = allSegments.reduce((sum, seg) => sum + parseFloat(seg.price.toString()), 0);

    await this.prisma.journey.update({
      where: { id: journeyId },
      data: { totalPrice: newTotalPrice },
    });

    // Return updated journey
    return this.getJourney(journeyId, userId);
  }

  /**
   * Helper: Map segment type to service type
   */
  private mapSegmentTypeToServiceType(segmentType: string): string {
    const mapping: Record<string, string> = {
      FERRY: 'TRANSPORT',
      TRANSPORT: 'TRANSPORT',
      AIRPORT_TRANSFER: 'TRANSPORT',
      ACCOMMODATION: 'ACCOMMODATION',
      TOUR: 'TOUR',
      ACTIVITY: 'ACTIVITY',
      EVENT: 'EVENT_TICKET',
    };
    return mapping[segmentType] || 'TRANSPORT';
  }

  /**
   * Auto-archive journeys whose end dates have passed
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async autoArchivePastJourneys() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    try {
      const pastJourneys = await this.prisma.journey.findMany({
        where: {
          endDate: {
            lt: yesterday,
          },
          status: {
            in: [JourneyStatus.CONFIRMED, JourneyStatus.IN_PROGRESS],
          },
        },
      });

      if (pastJourneys.length > 0) {
        const result = await this.prisma.journey.updateMany({
          where: {
            id: {
              in: pastJourneys.map((j) => j.id),
            },
          },
          data: {
            status: JourneyStatus.COMPLETED,
          },
        });

        this.logger.log(
          `[Cron] Auto-archived ${result.count} past journeys (end date before ${yesterday.toDateString()})`,
        );
      }
    } catch (error) {
      this.logger.error('[Cron] Failed to auto-archive past journeys:', error);
    }
  }

  /**
   * Recalculate journey status based on booking states
   * Used to fix journeys that have incorrect status after booking cancellations
   */
  async recalculateJourneyStatus(journeyId: number, userId: number): Promise<JourneyResponseDto> {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        segments: {
          include: {
            booking: true,
            departureLocation: true,
            arrivalLocation: true,
            service: true,
          },
        },
        originLocation: true,
        destLocation: true,
      },
    });

    if (!journey) {
      throw new NotFoundException(`Journey with ID ${journeyId} not found`);
    }

    if (journey.userId !== userId) {
      throw new ForbiddenException('You do not have access to this journey');
    }

    // Check booking states
    const segmentsWithBookings = journey.segments.filter(seg => seg.booking);

    if (segmentsWithBookings.length === 0) {
      // No bookings - journey should remain in planning state
      this.logger.log(`Journey ${journeyId} has no bookings - keeping status as ${journey.status}`);
      return this.mapToResponse(journey);
    }

    const allCancelled = segmentsWithBookings.every(
      seg => seg.booking && seg.booking.status === 'CANCELLED'
    );

    const hasActiveBookings = segmentsWithBookings.some(
      seg => seg.booking &&
        (seg.booking.status === 'PENDING' || seg.booking.status === 'CONFIRMED')
    );

    const hasCancelledBySupplier = journey.segments.some(
      seg => seg.isCancelled && seg.booking && seg.booking.status === 'CANCELLED'
    );

    let newStatus = journey.status;

    if (allCancelled) {
      // All bookings are cancelled
      newStatus = JourneyStatus.CANCELLED;
      this.logger.log(`Journey ${journeyId}: All bookings cancelled -> CANCELLED`);
    } else if (hasCancelledBySupplier && hasActiveBookings) {
      // Some cancelled by supplier, some still active
      newStatus = JourneyStatus.PENDING_CHANGES;
      this.logger.log(`Journey ${journeyId}: Has cancelled segments and active bookings -> PENDING_CHANGES`);
    } else if (!hasActiveBookings && journey.status === JourneyStatus.CONFIRMED) {
      // No active bookings but was confirmed - should be cancelled
      newStatus = JourneyStatus.CANCELLED;
      this.logger.log(`Journey ${journeyId}: No active bookings -> CANCELLED`);
    }

    if (newStatus !== journey.status) {
      const updated = await this.prisma.journey.update({
        where: { id: journeyId },
        data: { status: newStatus },
        include: {
          segments: {
            include: {
              departureLocation: true,
              arrivalLocation: true,
              service: true,
              booking: true,
            },
            orderBy: { segmentOrder: 'asc' },
          },
          originLocation: true,
          destLocation: true,
        },
      });

      this.logger.log(`Journey ${journeyId} status updated from ${journey.status} to ${newStatus}`);
      return this.mapToResponse(updated);
    }

    return this.mapToResponse(journey);
  }

  /**
   * Recalculate all journey statuses for a user
   */
  async recalculateAllJourneyStatuses(userId: number): Promise<{ updated: number; journeys: JourneyResponseDto[] }> {
    const journeys = await this.prisma.journey.findMany({
      where: { userId },
    });

    const updatedJourneys: JourneyResponseDto[] = [];
    let updatedCount = 0;

    for (const journey of journeys) {
      const result = await this.recalculateJourneyStatus(journey.id, userId);
      updatedJourneys.push(result);
      if (result.status !== journey.status) {
        updatedCount++;
      }
    }

    this.logger.log(`Recalculated ${journeys.length} journeys for user ${userId}, updated ${updatedCount}`);

    return {
      updated: updatedCount,
      journeys: updatedJourneys,
    };
  }
}
