import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  FerryOperator,
  ScheduleStatus,
} from '../../generated/prisma/client/client.js';
import {
  SearchFerriesDto,
  FerryScheduleResponseDto,
  FerrySearchResultDto,
  BookFerryDto,
} from './dto/index.js';

@Injectable()
export class FerriesService {
  private readonly logger = new Logger(FerriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search ferry schedules based on criteria
   */
  async searchFerries(dto: SearchFerriesDto): Promise<FerrySearchResultDto> {
    this.logger.log(
      `Searching ferries from ${dto.departurePortId} to ${dto.arrivalPortId} on ${dto.departureDate}`,
    );

    const departureDate = new Date(dto.departureDate);
    const dayOfWeek = this.getDayOfWeek(departureDate);

    // Build where clause
    const whereClause: any = {
      departurePortId: dto.departurePortId,
      arrivalPortId: dto.arrivalPortId,
      status: {
        not: ScheduleStatus.CANCELLED,
      },
      operatingDays: {
        has: dayOfWeek,
      },
      departureTime: {
        gte: departureDate,
        lt: new Date(departureDate.getTime() + 24 * 60 * 60 * 1000),
      },
    };

    // Filter by operator if specified
    if (dto.operator) {
      whereClause.operator = dto.operator;
    }

    // Filter by availability
    if (dto.availableOnly !== false) {
      const adults = dto.adults || 1;
      const children = dto.children || 0;
      const totalPassengers = adults + children;

      whereClause.availableSeats = {
        gte: totalPassengers,
      };

      if (dto.vehicles && dto.vehicles > 0) {
        whereClause.availableVehicles = {
          gte: dto.vehicles,
        };
      }
    }

    // Search outbound schedules
    const outbound = await this.prisma.ferrySchedule.findMany({
      where: whereClause,
      include: {
        departurePort: true,
        arrivalPort: true,
      },
      orderBy: {
        departureTime: 'asc',
      },
    });

    const result: FerrySearchResultDto = {
      outbound: outbound.map((schedule) => this.mapToResponse(schedule)),
      total: outbound.length,
    };

    // Search return schedules if return date specified
    if (dto.returnDate) {
      const returnDate = new Date(dto.returnDate);
      const returnDayOfWeek = this.getDayOfWeek(returnDate);

      const returnWhereClause = {
        ...whereClause,
        departurePortId: dto.arrivalPortId,
        arrivalPortId: dto.departurePortId,
        operatingDays: {
          has: returnDayOfWeek,
        },
        departureTime: {
          gte: returnDate,
          lt: new Date(returnDate.getTime() + 24 * 60 * 60 * 1000),
        },
      };

      const returnSchedules = await this.prisma.ferrySchedule.findMany({
        where: returnWhereClause,
        include: {
          departurePort: true,
          arrivalPort: true,
        },
        orderBy: {
          departureTime: 'asc',
        },
      });

      result.return = returnSchedules.map((schedule) =>
        this.mapToResponse(schedule),
      );
      result.total += returnSchedules.length;
    }

    this.logger.log(`Found ${result.total} ferry schedules`);

    return result;
  }

  /**
   * Get ferry schedule by ID
   */
  async getFerrySchedule(id: number): Promise<FerryScheduleResponseDto> {
    const schedule = await this.prisma.ferrySchedule.findUnique({
      where: { id },
      include: {
        departurePort: true,
        arrivalPort: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Ferry schedule with ID ${id} not found`);
    }

    return this.mapToResponse(schedule);
  }

  /**
   * Get all schedules for a specific route
   */
  async getRouteSchedules(
    departurePortId: number,
    arrivalPortId: number,
  ): Promise<FerryScheduleResponseDto[]> {
    const schedules = await this.prisma.ferrySchedule.findMany({
      where: {
        departurePortId,
        arrivalPortId,
        status: {
          not: ScheduleStatus.CANCELLED,
        },
      },
      include: {
        departurePort: true,
        arrivalPort: true,
      },
      orderBy: {
        departureTime: 'asc',
      },
    });

    return schedules.map((schedule) => this.mapToResponse(schedule));
  }

  /**
   * Get available ferry operators
   */
  async getOperators(): Promise<FerryOperator[]> {
    const operators = await this.prisma.ferrySchedule.findMany({
      select: {
        operator: true,
      },
      distinct: ['operator'],
    });

    return operators.map((o) => o.operator);
  }

  /**
   * Update ferry schedule availability
   */
  async updateAvailability(
    scheduleId: number,
    availableSeats: number,
    availableVehicles?: number,
  ): Promise<void> {
    await this.prisma.ferrySchedule.update({
      where: { id: scheduleId },
      data: {
        availableSeats,
        availableVehicles,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(
      `Updated availability for ferry schedule ${scheduleId}: ${availableSeats} seats`,
    );
  }

  /**
   * Update ferry schedule status
   */
  async updateScheduleStatus(
    scheduleId: number,
    status: ScheduleStatus,
  ): Promise<void> {
    await this.prisma.ferrySchedule.update({
      where: { id: scheduleId },
      data: {
        status,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(
      `Updated status for ferry schedule ${scheduleId}: ${status}`,
    );
  }

  /**
   * Sync ferry schedules from external APIs
   * This is a placeholder for actual API integration
   */
  async syncSchedules(operator: FerryOperator): Promise<number> {
    this.logger.log(`Syncing schedules for operator: ${operator}`);

    // TODO: Implement actual API integration based on operator
    // For now, this is a placeholder that creates sample schedules

    switch (operator) {
      case FerryOperator.JADROLINIJA:
        return this.syncJadrolinija();
      case FerryOperator.KRILO:
        return this.syncKrilo();
      case FerryOperator.TP_LINE:
        return this.syncTPLine();
      default:
        throw new BadRequestException(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Sync Jadrolinija schedules
   * Placeholder for actual API integration
   */
  private async syncJadrolinija(): Promise<number> {
    this.logger.log('Syncing Jadrolinija schedules (placeholder)');

    // In production, this would:
    // 1. Fetch schedules from Jadrolinija API
    // 2. Parse the response
    // 3. Upsert schedules in database
    // 4. Update availability

    // For now, return 0 to indicate no schedules synced
    return 0;
  }

  /**
   * Sync Krilo schedules
   * Placeholder for actual API integration
   */
  private async syncKrilo(): Promise<number> {
    this.logger.log('Syncing Krilo schedules (placeholder)');

    // In production, this would integrate with Krilo API
    // Krilo operates fast catamarans between Split and islands

    return 0;
  }

  /**
   * Sync TP Line schedules
   * Placeholder for actual API integration
   */
  private async syncTPLine(): Promise<number> {
    this.logger.log('Syncing TP Line schedules (placeholder)');

    // In production, this would integrate with TP Line API

    return 0;
  }

  /**
   * Create or update a ferry schedule
   * Used for manual schedule management and API sync
   */
  async upsertSchedule(data: any): Promise<FerryScheduleResponseDto> {
    const schedule = await this.prisma.ferrySchedule.upsert({
      where: {
        id: data.id || 0,
      },
      update: {
        operator: data.operator,
        vesselName: data.vesselName,
        routeName: data.routeName,
        departurePortId: data.departurePortId,
        arrivalPortId: data.arrivalPortId,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        duration: data.duration,
        totalCapacity: data.totalCapacity,
        vehicleCapacity: data.vehicleCapacity,
        availableSeats: data.availableSeats,
        availableVehicles: data.availableVehicles,
        adultPrice: data.adultPrice,
        childPrice: data.childPrice,
        vehiclePrice: data.vehiclePrice,
        currency: data.currency || 'EUR',
        status: data.status || ScheduleStatus.SCHEDULED,
        operatingDays: data.operatingDays,
        seasonStart: data.seasonStart,
        seasonEnd: data.seasonEnd,
        externalId: data.externalId,
        amenities: data.amenities || [],
        notes: data.notes,
        lastSyncedAt: new Date(),
      },
      create: {
        operator: data.operator,
        vesselName: data.vesselName,
        routeName: data.routeName,
        departurePortId: data.departurePortId,
        arrivalPortId: data.arrivalPortId,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        duration: data.duration,
        totalCapacity: data.totalCapacity,
        vehicleCapacity: data.vehicleCapacity,
        availableSeats: data.availableSeats,
        availableVehicles: data.availableVehicles,
        adultPrice: data.adultPrice,
        childPrice: data.childPrice,
        vehiclePrice: data.vehiclePrice,
        currency: data.currency || 'EUR',
        status: data.status || ScheduleStatus.SCHEDULED,
        operatingDays: data.operatingDays,
        seasonStart: data.seasonStart,
        seasonEnd: data.seasonEnd,
        externalId: data.externalId,
        amenities: data.amenities || [],
        notes: data.notes,
        lastSyncedAt: new Date(),
      },
      include: {
        departurePort: true,
        arrivalPort: true,
      },
    });

    return this.mapToResponse(schedule);
  }

  /**
   * Book ferry ticket through external API
   */
  async bookFerry(
    dto: BookFerryDto,
    userId: number,
  ): Promise<{
    ferryBookingId: number;
    operatorReference: string;
    totalPrice: number;
    status: string;
  }> {
    this.logger.log(
      `Booking ferry schedule ${dto.ferryScheduleId} for user ${userId}`,
    );

    // Get ferry schedule
    const schedule = await this.prisma.ferrySchedule.findUnique({
      where: { id: dto.ferryScheduleId },
      include: {
        departurePort: true,
        arrivalPort: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException(
        `Ferry schedule ${dto.ferryScheduleId} not found`,
      );
    }

    // Check availability
    const totalPassengers = dto.adults + dto.children;
    if (schedule.availableSeats < totalPassengers) {
      throw new BadRequestException(
        `Not enough seats available. Requested: ${totalPassengers}, Available: ${schedule.availableSeats}`,
      );
    }

    if (dto.vehicles > 0) {
      if (!schedule.availableVehicles || schedule.availableVehicles < dto.vehicles) {
        throw new BadRequestException(
          `Not enough vehicle spots available. Requested: ${dto.vehicles}, Available: ${schedule.availableVehicles || 0}`,
        );
      }
    }

    // Calculate price
    const adultPrice = parseFloat(schedule.adultPrice.toString()) * dto.adults;
    const childPrice = schedule.childPrice
      ? parseFloat(schedule.childPrice.toString()) * dto.children
      : 0;
    const vehiclePrice = schedule.vehiclePrice && dto.vehicles > 0
      ? parseFloat(schedule.vehiclePrice.toString()) * dto.vehicles
      : 0;
    const totalPrice = adultPrice + childPrice + vehiclePrice;

    // Book with external ferry API based on operator
    let operatorReference: string;
    try {
      operatorReference = await this.bookWithOperatorAPI(schedule, dto, userId);
    } catch (error) {
      this.logger.error(`Failed to book with operator API: ${error.message}`);
      throw new BadRequestException(
        `Failed to book ferry: ${error.message}`,
      );
    }

    // Create booking in our database
    const ferryBooking = await this.prisma.ferryBooking.create({
      data: {
        ferryScheduleId: dto.ferryScheduleId,
        bookingId: 0, // Will be updated when main booking is created
        adults: dto.adults,
        children: dto.children,
        vehicles: dto.vehicles,
        totalPrice,
        currency: schedule.currency,
        operatorRef: operatorReference,
        isConfirmed: true,
      },
    });

    // Update ferry availability
    await this.prisma.ferrySchedule.update({
      where: { id: dto.ferryScheduleId },
      data: {
        availableSeats: {
          decrement: totalPassengers,
        },
        availableVehicles: dto.vehicles > 0
          ? {
              decrement: dto.vehicles,
            }
          : undefined,
      },
    });

    this.logger.log(
      `Ferry booked successfully. Booking ID: ${ferryBooking.id}, Operator Ref: ${operatorReference}`,
    );

    return {
      ferryBookingId: ferryBooking.id,
      operatorReference,
      totalPrice,
      status: 'CONFIRMED',
    };
  }

  /**
   * Book with external ferry operator API
   */
  private async bookWithOperatorAPI(
    schedule: any,
    dto: BookFerryDto,
    userId: number,
  ): Promise<string> {
    const operator = schedule.operator;

    switch (operator) {
      case FerryOperator.JADROLINIJA:
        return this.bookWithJadrolinija(schedule, dto, userId);
      case FerryOperator.KRILO:
        return this.bookWithKrilo(schedule, dto, userId);
      case FerryOperator.TP_LINE:
        return this.bookWithTPLine(schedule, dto, userId);
      case FerryOperator.KAPETAN_LUKA:
        return this.bookWithKapetanLuka(schedule, dto, userId);
      default:
        throw new BadRequestException(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Book with Jadrolinija API
   * Documentation: https://www.jadrolinija.hr/en/api
   */
  private async bookWithJadrolinija(
    schedule: any,
    dto: BookFerryDto,
    userId: number,
  ): Promise<string> {
    this.logger.log('Booking with Jadrolinija API');

    // TODO: Implement actual Jadrolinija API integration
    // Example flow:
    // 1. POST to Jadrolinija booking endpoint
    // 2. Include: schedule ID, passenger count, vehicle count, payment details
    // 3. Receive booking reference and confirmation

    // For now, return a mock reference
    const mockReference = `JAD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    this.logger.log(`Jadrolinija booking reference: ${mockReference}`);

    // In production:
    // const response = await fetch('https://api.jadrolinija.hr/bookings', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.JADROLINIJA_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     scheduleId: schedule.externalId,
    //     adults: dto.adults,
    //     children: dto.children,
    //     vehicles: dto.vehicles,
    //     departureDate: schedule.departureTime,
    //     route: schedule.routeName,
    //   }),
    // });
    // const data = await response.json();
    // return data.bookingReference;

    return mockReference;
  }

  /**
   * Book with Krilo API
   * Krilo operates fast catamarans
   */
  private async bookWithKrilo(
    schedule: any,
    dto: BookFerryDto,
    userId: number,
  ): Promise<string> {
    this.logger.log('Booking with Krilo API');

    // TODO: Implement Krilo API integration
    const mockReference = `KRL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    this.logger.log(`Krilo booking reference: ${mockReference}`);

    return mockReference;
  }

  /**
   * Book with TP Line API
   */
  private async bookWithTPLine(
    schedule: any,
    dto: BookFerryDto,
    userId: number,
  ): Promise<string> {
    this.logger.log('Booking with TP Line API');

    // TODO: Implement TP Line API integration
    const mockReference = `TPL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    this.logger.log(`TP Line booking reference: ${mockReference}`);

    return mockReference;
  }

  /**
   * Book with Kapetan Luka API
   */
  private async bookWithKapetanLuka(
    schedule: any,
    dto: BookFerryDto,
    userId: number,
  ): Promise<string> {
    this.logger.log('Booking with Kapetan Luka API');

    // TODO: Implement Kapetan Luka API integration
    const mockReference = `KPL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    this.logger.log(`Kapetan Luka booking reference: ${mockReference}`);

    return mockReference;
  }

  /**
   * Cancel ferry booking through external API
   */
  async cancelFerryBooking(
    ferryBookingId: number,
    userId: number,
  ): Promise<void> {
    this.logger.log(
      `Cancelling ferry booking ${ferryBookingId} for user ${userId}`,
    );

    const ferryBooking = await this.prisma.ferryBooking.findUnique({
      where: { id: ferryBookingId },
      include: {
        ferrySchedule: true,
      },
    });

    if (!ferryBooking) {
      throw new NotFoundException(
        `Ferry booking ${ferryBookingId} not found`,
      );
    }

    if (ferryBooking.isCancelled) {
      throw new BadRequestException('Ferry booking already cancelled');
    }

    // Cancel with external API
    try {
      await this.cancelWithOperatorAPI(
        ferryBooking.ferrySchedule.operator,
        ferryBooking.operatorRef,
      );
    } catch (error) {
      this.logger.error(`Failed to cancel with operator API: ${error.message}`);
      throw new BadRequestException(
        `Failed to cancel ferry booking: ${error.message}`,
      );
    }

    // Update booking status
    await this.prisma.ferryBooking.update({
      where: { id: ferryBookingId },
      data: {
        isCancelled: true,
      },
    });

    // Restore ferry availability
    await this.prisma.ferrySchedule.update({
      where: { id: ferryBooking.ferryScheduleId },
      data: {
        availableSeats: {
          increment: ferryBooking.adults + ferryBooking.children,
        },
        availableVehicles: ferryBooking.vehicles > 0
          ? {
              increment: ferryBooking.vehicles,
            }
          : undefined,
      },
    });

    this.logger.log(`Ferry booking ${ferryBookingId} cancelled successfully`);
  }

  /**
   * Cancel with external operator API
   */
  private async cancelWithOperatorAPI(
    operator: FerryOperator,
    operatorRef: string | null,
  ): Promise<void> {
    if (!operatorRef) {
      throw new BadRequestException('No operator reference found');
    }

    this.logger.log(`Cancelling booking ${operatorRef} with ${operator}`);

    // TODO: Implement actual cancellation API calls for each operator
    // In production, call the respective operator's cancellation endpoint
  }

  /**
   * Get ferry booking details
   */
  async getFerryBooking(
    ferryBookingId: number,
    userId: number,
  ): Promise<any> {
    const ferryBooking = await this.prisma.ferryBooking.findUnique({
      where: { id: ferryBookingId },
      include: {
        ferrySchedule: {
          include: {
            departurePort: true,
            arrivalPort: true,
          },
        },
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
          },
        },
      },
    });

    if (!ferryBooking) {
      throw new NotFoundException(
        `Ferry booking ${ferryBookingId} not found`,
      );
    }

    // Verify user has access to this booking
    if (ferryBooking.booking?.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this ferry booking',
      );
    }

    return ferryBooking;
  }

  /**
   * Get day of week from date
   */
  private getDayOfWeek(date: Date): string {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[date.getDay()];
  }

  /**
   * Map Prisma ferry schedule to response DTO
   */
  private mapToResponse(schedule: any): FerryScheduleResponseDto {
    return {
      id: schedule.id,
      operator: schedule.operator,
      vesselName: schedule.vesselName,
      routeName: schedule.routeName,
      departurePortId: schedule.departurePortId,
      arrivalPortId: schedule.arrivalPortId,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      duration: schedule.duration,
      totalCapacity: schedule.totalCapacity,
      vehicleCapacity: schedule.vehicleCapacity,
      availableSeats: schedule.availableSeats,
      availableVehicles: schedule.availableVehicles,
      adultPrice: parseFloat(schedule.adultPrice.toString()),
      childPrice: schedule.childPrice
        ? parseFloat(schedule.childPrice.toString())
        : undefined,
      vehiclePrice: schedule.vehiclePrice
        ? parseFloat(schedule.vehiclePrice.toString())
        : undefined,
      currency: schedule.currency,
      status: schedule.status,
      operatingDays: schedule.operatingDays,
      seasonStart: schedule.seasonStart,
      seasonEnd: schedule.seasonEnd,
      amenities: schedule.amenities,
      notes: schedule.notes,
      departurePort: schedule.departurePort
        ? {
            id: schedule.departurePort.id,
            name: schedule.departurePort.name,
            type: schedule.departurePort.type,
            latitude: schedule.departurePort.latitude,
            longitude: schedule.departurePort.longitude,
          }
        : undefined,
      arrivalPort: schedule.arrivalPort
        ? {
            id: schedule.arrivalPort.id,
            name: schedule.arrivalPort.name,
            type: schedule.arrivalPort.type,
            latitude: schedule.arrivalPort.latitude,
            longitude: schedule.arrivalPort.longitude,
          }
        : undefined,
    };
  }
}
