import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  JourneyStatus,
  SegmentType,
  TransportType,
  ServiceType,
  BookingStatus,
} from '../../generated/prisma/client/client.js';
import {
  PlanJourneyDto,
  UpdateJourneyDto,
  BookJourneyDto,
  JourneyResponseDto,
  JourneyListResponseDto,
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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plan a multi-modal journey from origin to destination
   */
  async planJourney(
    userId: number,
    dto: PlanJourneyDto,
  ): Promise<JourneyResponseDto> {
    this.logger.log(
      `Planning journey for user ${userId} from ${dto.originLocationId} to ${dto.destLocationId}`,
    );

    // Validate locations exist
    await this.validateLocations(dto.originLocationId, dto.destLocationId);

    // Calculate optimal route segments
    const routeSegments = await this.calculateOptimalRoute(dto);

    // Calculate total price
    const totalPrice = routeSegments.reduce(
      (sum, segment) => sum + segment.price * dto.travelers,
      0,
    );

    // Create journey with segments
    const journey = await this.prisma.journey.create({
      data: {
        userId,
        name: dto.name,
        originLocationId: dto.originLocationId,
        destLocationId: dto.destLocationId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        totalPrice,
        currency: 'EUR',
        travelers: dto.travelers,
        preferences: (dto.preferences || {}) as any,
        optimizedRoute: { segments: routeSegments } as any,
        status: JourneyStatus.PLANNING,
        segments: {
          create: routeSegments.map((segment, index) => ({
            segmentType: segment.type,
            segmentOrder: index + 1,
            serviceId: segment.serviceId,
            departureLocationId: segment.fromLocationId,
            arrivalLocationId: segment.toLocationId,
            departureTime: segment.departureTime,
            arrivalTime: segment.arrivalTime,
            duration: segment.duration,
            price: segment.price * dto.travelers,
            currency: 'EUR',
            metadata: segment.metadata,
            isBooked: false,
            isConfirmed: false,
          })),
        },
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

    this.logger.log(`Journey ${journey.id} created with ${routeSegments.length} segments`);

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
   * Find best ferry service between locations
   */
  private async findBestFerryService(
    fromLocationId: number,
    toLocationId: number,
    departureTime: Date,
    preferences?: any,
  ) {
    const ferries = await this.prisma.transportService.findMany({
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
    const accommodations = await this.prisma.accommodationService.findMany({
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
    });

    if (!journey) {
      throw new NotFoundException(`Journey with ID ${journeyId} not found`);
    }

    if (journey.userId !== userId) {
      throw new ForbiddenException('You do not have access to this journey');
    }

    // Prevent deleting confirmed journeys
    if (journey.status === JourneyStatus.CONFIRMED) {
      throw new BadRequestException(
        'Cannot delete confirmed journey. Please cancel bookings first.',
      );
    }

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

    if (journey.status !== JourneyStatus.PLANNING && journey.status !== JourneyStatus.READY) {
      throw new BadRequestException(
        'Journey must be in PLANNING or READY status to book',
      );
    }

    // Group segments by supplier to create bookings
    const segmentsBySupplier = new Map<number, typeof journey.segments>();

    for (const segment of journey.segments) {
      if (!segment.service) {
        throw new BadRequestException(
          `Segment ${segment.id} does not have an associated service`,
        );
      }

      const supplierId = segment.service.supplierId;
      if (!segmentsBySupplier.has(supplierId)) {
        segmentsBySupplier.set(supplierId, []);
      }
      segmentsBySupplier.get(supplierId)!.push(segment);
    }

    // Create bookings for each supplier
    const bookingPromises: any[] = [];

    for (const [supplierId, segments] of segmentsBySupplier) {
      const totalAmount = segments.reduce(
        (sum, seg) => sum + parseFloat(seg.price.toString()),
        0,
      );

      const booking = this.prisma.booking.create({
        data: {
          userId,
          supplierId,
          status: BookingStatus.PENDING,
          totalAmount,
          currency: 'EUR',
          commission: totalAmount * 0.15, // 15% commission
          serviceDate: segments[0].departureTime || journey.startDate,
          notes: dto.notes,
          bookingItems: {
            create: segments.map((seg) => ({
              serviceId: seg.serviceId!,
              quantity: journey.travelers,
              unitPrice: parseFloat(seg.price.toString()) / journey.travelers,
              totalPrice: parseFloat(seg.price.toString()),
              metadata: {
                ...dto.guestDetails,
                segmentId: seg.id,
              },
            })),
          },
        },
      });

      bookingPromises.push(booking);
    }

    // Execute all booking creations
    const bookings = await Promise.all(bookingPromises);

    // Update journey segments with booking IDs
    for (let i = 0; i < journey.segments.length; i++) {
      const segment = journey.segments[i];
      const supplierId = segment.service!.supplierId;
      const booking = bookings.find(
        (b: any) => b.supplierId === supplierId,
      );

      await this.prisma.journeySegment.update({
        where: { id: segment.id },
        data: {
          bookingId: booking?.id,
          isBooked: true,
        },
      });
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

    // Update journey status to CONFIRMED
    const updatedJourney = await this.prisma.journey.update({
      where: { id: journeyId },
      data: {
        status: JourneyStatus.CONFIRMED,
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

    this.logger.log(`Journey ${journeyId} booked successfully with ${bookings.length} bookings`);

    return this.mapToResponse(updatedJourney);
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
    return {
      id: journey.id,
      userId: journey.userId,
      status: journey.status,
      name: journey.name,
      originLocationId: journey.originLocationId,
      destLocationId: journey.destLocationId,
      startDate: journey.startDate,
      endDate: journey.endDate,
      totalPrice: parseFloat(journey.totalPrice.toString()),
      currency: journey.currency,
      travelers: journey.travelers,
      preferences: journey.preferences,
      optimizedRoute: journey.optimizedRoute,
      segments: journey.segments.map((seg: any) => ({
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
        price: parseFloat(seg.price.toString()),
        currency: seg.currency,
        isBooked: seg.isBooked,
        isConfirmed: seg.isConfirmed,
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
      })),
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
}
