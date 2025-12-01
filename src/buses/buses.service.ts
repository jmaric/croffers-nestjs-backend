import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  BusOperator,
  ScheduleStatus,
} from '../../generated/prisma/client/client.js';
import {
  SearchBusesDto,
  BusScheduleResponseDto,
  BusSearchResultDto,
  BookBusDto,
} from './dto/index.js';

@Injectable()
export class BusesService {
  private readonly logger = new Logger(BusesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search bus schedules
   */
  async searchBuses(dto: SearchBusesDto): Promise<BusSearchResultDto> {
    this.logger.log(
      `Searching buses from ${dto.departureStopId} to ${dto.arrivalStopId} on ${dto.departureDate}`,
    );

    const departureDate = new Date(dto.departureDate);
    const dayOfWeek = this.getDayOfWeek(departureDate);

    const whereClause: any = {
      departureStopId: dto.departureStopId,
      arrivalStopId: dto.arrivalStopId,
      status: { not: ScheduleStatus.CANCELLED },
      operatingDays: { has: dayOfWeek },
      departureTime: {
        gte: departureDate,
        lt: new Date(departureDate.getTime() + 24 * 60 * 60 * 1000),
      },
    };

    if (dto.operator) {
      whereClause.operator = dto.operator;
    }

    if (dto.availableOnly !== false) {
      const totalPassengers = (dto.adults || 1) + (dto.children || 0) + (dto.seniors || 0);
      whereClause.availableSeats = { gte: totalPassengers };
    }

    const outbound = await this.prisma.busSchedule.findMany({
      where: whereClause,
      include: { departureStop: true, arrivalStop: true },
      orderBy: { departureTime: 'asc' },
    });

    const result: BusSearchResultDto = {
      outbound: outbound.map((s) => this.mapToResponse(s)),
      total: outbound.length,
    };

    if (dto.returnDate) {
      const returnDate = new Date(dto.returnDate);
      const returnDayOfWeek = this.getDayOfWeek(returnDate);

      const returnSchedules = await this.prisma.busSchedule.findMany({
        where: {
          ...whereClause,
          departureStopId: dto.arrivalStopId,
          arrivalStopId: dto.departureStopId,
          operatingDays: { has: returnDayOfWeek },
          departureTime: {
            gte: returnDate,
            lt: new Date(returnDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        include: { departureStop: true, arrivalStop: true },
        orderBy: { departureTime: 'asc' },
      });

      result.return = returnSchedules.map((s) => this.mapToResponse(s));
      result.total += returnSchedules.length;
    }

    this.logger.log(`Found ${result.total} bus schedules`);
    return result;
  }

  /**
   * Get bus schedule by ID
   */
  async getBusSchedule(id: number): Promise<BusScheduleResponseDto> {
    const schedule = await this.prisma.busSchedule.findUnique({
      where: { id },
      include: { departureStop: true, arrivalStop: true },
    });

    if (!schedule) {
      throw new NotFoundException(`Bus schedule with ID ${id} not found`);
    }

    return this.mapToResponse(schedule);
  }

  /**
   * Book bus ticket through external API
   */
  async bookBus(
    dto: BookBusDto,
    userId: number,
  ): Promise<{
    busBookingId: number;
    operatorReference: string;
    totalPrice: number;
    status: string;
  }> {
    this.logger.log(`Booking bus schedule ${dto.busScheduleId} for user ${userId}`);

    const schedule = await this.prisma.busSchedule.findUnique({
      where: { id: dto.busScheduleId },
      include: { departureStop: true, arrivalStop: true },
    });

    if (!schedule) {
      throw new NotFoundException(`Bus schedule ${dto.busScheduleId} not found`);
    }

    // Check availability
    const totalPassengers = dto.adults + dto.children + dto.seniors;
    if (schedule.availableSeats < totalPassengers) {
      throw new BadRequestException(
        `Not enough seats available. Requested: ${totalPassengers}, Available: ${schedule.availableSeats}`,
      );
    }

    // Calculate price
    const adultPrice = parseFloat(schedule.adultPrice.toString()) * dto.adults;
    const childPrice = schedule.childPrice
      ? parseFloat(schedule.childPrice.toString()) * dto.children
      : 0;
    const seniorPrice = schedule.seniorPrice
      ? parseFloat(schedule.seniorPrice.toString()) * dto.seniors
      : 0;
    const totalPrice = adultPrice + childPrice + seniorPrice;

    // Book with external bus API
    let operatorReference: string;
    try {
      operatorReference = await this.bookWithOperatorAPI(schedule, dto, userId);
    } catch (error) {
      this.logger.error(`Failed to book with operator API: ${error.message}`);
      throw new BadRequestException(`Failed to book bus: ${error.message}`);
    }

    // Create booking in database
    const busBooking = await this.prisma.busBooking.create({
      data: {
        busScheduleId: dto.busScheduleId,
        bookingId: 0, // Will be updated when main booking is created
        adults: dto.adults,
        children: dto.children,
        seniors: dto.seniors,
        seatNumbers: dto.seatNumbers || [],
        totalPrice,
        currency: schedule.currency,
        operatorRef: operatorReference,
        isConfirmed: true,
      },
    });

    // Update availability
    await this.prisma.busSchedule.update({
      where: { id: dto.busScheduleId },
      data: { availableSeats: { decrement: totalPassengers } },
    });

    this.logger.log(
      `Bus booked successfully. Booking ID: ${busBooking.id}, Operator Ref: ${operatorReference}`,
    );

    return {
      busBookingId: busBooking.id,
      operatorReference,
      totalPrice,
      status: 'CONFIRMED',
    };
  }

  /**
   * Book with external bus operator API
   */
  private async bookWithOperatorAPI(
    schedule: any,
    dto: BookBusDto,
    userId: number,
  ): Promise<string> {
    switch (schedule.operator) {
      case BusOperator.FLIXBUS:
        return this.bookWithFlixBus(schedule, dto, userId);
      case BusOperator.GETBYBUS:
        return this.bookWithGetByBus(schedule, dto, userId);
      case BusOperator.ARRIVA:
        return this.bookWithArriva(schedule, dto, userId);
      case BusOperator.BRIONI_PULA:
        return this.bookWithBrioniPula(schedule, dto, userId);
      case BusOperator.CROATIABUS:
        return this.bookWithCroatiaBus(schedule, dto, userId);
      case BusOperator.PROMET_SPLIT:
        return this.bookWithPrometSplit(schedule, dto, userId);
      default:
        throw new BadRequestException(`Unsupported operator: ${schedule.operator}`);
    }
  }

  /**
   * FlixBus API Integration
   * Documentation: https://api.flixbus.com/docs
   */
  private async bookWithFlixBus(
    schedule: any,
    dto: BookBusDto,
    userId: number,
  ): Promise<string> {
    this.logger.log('Booking with FlixBus API');

    // TODO: Implement FlixBus API integration
    // FlixBus has a comprehensive API for international routes
    const mockReference = `FLX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // In production:
    // const response = await fetch('https://api.flixbus.com/v1/bookings', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.FLIXBUS_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     tripId: schedule.externalId,
    //     passengers: {
    //       adults: dto.adults,
    //       children: dto.children,
    //       seniors: dto.seniors,
    //     },
    //     seats: dto.seatNumbers,
    //   }),
    // });

    return mockReference;
  }

  /**
   * GetByBus API Integration
   * Documentation: https://www.getbybus.com/api
   */
  private async bookWithGetByBus(
    schedule: any,
    dto: BookBusDto,
    userId: number,
  ): Promise<string> {
    this.logger.log('Booking with GetByBus API');

    // TODO: Implement GetByBus API integration
    // GetByBus is a Croatian bus aggregator with API access
    const mockReference = `GBB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return mockReference;
  }

  /**
   * Arriva API Integration
   */
  private async bookWithArriva(
    schedule: any,
    dto: BookBusDto,
    userId: number,
  ): Promise<string> {
    this.logger.log('Booking with Arriva API');

    // TODO: Implement Arriva API integration
    const mockReference = `ARR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return mockReference;
  }

  /**
   * Brioni Pula API Integration
   */
  private async bookWithBrioniPula(
    schedule: any,
    dto: BookBusDto,
    userId: number,
  ): Promise<string> {
    this.logger.log('Booking with Brioni Pula API');

    // TODO: Implement Brioni Pula API integration
    const mockReference = `BRP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return mockReference;
  }

  /**
   * Croatia Bus API Integration
   */
  private async bookWithCroatiaBus(
    schedule: any,
    dto: BookBusDto,
    userId: number,
  ): Promise<string> {
    this.logger.log('Booking with Croatia Bus API');

    // TODO: Implement Croatia Bus API integration
    const mockReference = `CRB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return mockReference;
  }

  /**
   * Promet Split API Integration
   */
  private async bookWithPrometSplit(
    schedule: any,
    dto: BookBusDto,
    userId: number,
  ): Promise<string> {
    this.logger.log('Booking with Promet Split API');

    // TODO: Implement Promet Split API integration
    const mockReference = `PRS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return mockReference;
  }

  /**
   * Cancel bus booking
   */
  async cancelBusBooking(busBookingId: number, userId: number): Promise<void> {
    this.logger.log(`Cancelling bus booking ${busBookingId} for user ${userId}`);

    const busBooking = await this.prisma.busBooking.findUnique({
      where: { id: busBookingId },
      include: { busSchedule: true },
    });

    if (!busBooking) {
      throw new NotFoundException(`Bus booking ${busBookingId} not found`);
    }

    if (busBooking.isCancelled) {
      throw new BadRequestException('Bus booking already cancelled');
    }

    // Cancel with external API
    await this.cancelWithOperatorAPI(
      busBooking.busSchedule.operator,
      busBooking.operatorRef,
    );

    // Update booking status
    await this.prisma.busBooking.update({
      where: { id: busBookingId },
      data: { isCancelled: true },
    });

    // Restore availability
    const totalPassengers = busBooking.adults + busBooking.children + busBooking.seniors;
    await this.prisma.busSchedule.update({
      where: { id: busBooking.busScheduleId },
      data: { availableSeats: { increment: totalPassengers } },
    });

    this.logger.log(`Bus booking ${busBookingId} cancelled successfully`);
  }

  /**
   * Cancel with operator API
   */
  private async cancelWithOperatorAPI(
    operator: BusOperator,
    operatorRef: string | null,
  ): Promise<void> {
    if (!operatorRef) {
      throw new BadRequestException('No operator reference found');
    }

    this.logger.log(`Cancelling booking ${operatorRef} with ${operator}`);
    // TODO: Implement actual cancellation API calls
  }

  /**
   * Get bus booking details
   */
  async getBusBooking(busBookingId: number, userId: number): Promise<any> {
    const busBooking = await this.prisma.busBooking.findUnique({
      where: { id: busBookingId },
      include: {
        busSchedule: {
          include: { departureStop: true, arrivalStop: true },
        },
        booking: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!busBooking) {
      throw new NotFoundException(`Bus booking ${busBookingId} not found`);
    }

    if (busBooking.booking?.userId !== userId) {
      throw new ForbiddenException('You do not have access to this bus booking');
    }

    return busBooking;
  }

  /**
   * Sync schedules from operator API
   */
  async syncSchedules(operator: BusOperator): Promise<number> {
    this.logger.log(`Syncing schedules for operator: ${operator}`);

    switch (operator) {
      case BusOperator.FLIXBUS:
        return this.syncFlixBus();
      case BusOperator.GETBYBUS:
        return this.syncGetByBus();
      case BusOperator.ARRIVA:
        return this.syncArriva();
      default:
        throw new BadRequestException(`Unsupported operator: ${operator}`);
    }
  }

  private async syncFlixBus(): Promise<number> {
    this.logger.log('Syncing FlixBus schedules (placeholder)');
    return 0;
  }

  private async syncGetByBus(): Promise<number> {
    this.logger.log('Syncing GetByBus schedules (placeholder)');
    return 0;
  }

  private async syncArriva(): Promise<number> {
    this.logger.log('Syncing Arriva schedules (placeholder)');
    return 0;
  }

  private getDayOfWeek(date: Date): string {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[date.getDay()];
  }

  private mapToResponse(schedule: any): BusScheduleResponseDto {
    return {
      id: schedule.id,
      operator: schedule.operator,
      busNumber: schedule.busNumber,
      routeName: schedule.routeName,
      departureStopId: schedule.departureStopId,
      arrivalStopId: schedule.arrivalStopId,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      duration: schedule.duration,
      totalCapacity: schedule.totalCapacity,
      availableSeats: schedule.availableSeats,
      adultPrice: parseFloat(schedule.adultPrice.toString()),
      childPrice: schedule.childPrice ? parseFloat(schedule.childPrice.toString()) : undefined,
      seniorPrice: schedule.seniorPrice ? parseFloat(schedule.seniorPrice.toString()) : undefined,
      currency: schedule.currency,
      status: schedule.status,
      operatingDays: schedule.operatingDays,
      seasonStart: schedule.seasonStart,
      seasonEnd: schedule.seasonEnd,
      amenities: schedule.amenities,
      busType: schedule.busType,
      notes: schedule.notes,
      departureStop: schedule.departureStop ? {
        id: schedule.departureStop.id,
        name: schedule.departureStop.name,
        type: schedule.departureStop.type,
        latitude: schedule.departureStop.latitude,
        longitude: schedule.departureStop.longitude,
      } : undefined,
      arrivalStop: schedule.arrivalStop ? {
        id: schedule.arrivalStop.id,
        name: schedule.arrivalStop.name,
        type: schedule.arrivalStop.type,
        latitude: schedule.arrivalStop.latitude,
        longitude: schedule.arrivalStop.longitude,
      } : undefined,
    };
  }
}
