import { Injectable } from '@nestjs/common';
import { FerryApiClient, FerryDeparture, FerrySearchParams } from './api-clients/ferry-api.client.js';
import { BusApiClient, BusDeparture, BusSearchParams } from './api-clients/bus-api.client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TransportService {
  private ferryClient: FerryApiClient;
  private busClient: BusApiClient;

  constructor(private prisma: PrismaService) {
    this.ferryClient = new FerryApiClient();
    this.busClient = new BusApiClient();
  }

  /**
   * Search for ferry schedules
   */
  async searchFerrySchedules(params: FerrySearchParams) {
    // Get schedules from API (currently mock data)
    const schedules = await this.ferryClient.searchSchedules(params);

    // Get location names for the response
    const [departureLocation, arrivalLocation] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: params.departurePortId } }),
      this.prisma.location.findUnique({ where: { id: params.arrivalPortId } }),
    ]);

    return {
      schedules: schedules.map(schedule => this.transformFerrySchedule(schedule)),
      route: {
        departure: departureLocation?.name || 'Unknown',
        arrival: arrivalLocation?.name || 'Unknown',
      },
      date: params.date.toISOString().split('T')[0],
    };
  }

  /**
   * Search for bus schedules
   */
  async searchBusSchedules(params: BusSearchParams) {
    // Get schedules from API (currently mock data)
    const schedules = await this.busClient.searchSchedules(params);

    // Get location names for the response
    const [departureLocation, arrivalLocation] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: params.departureStopId } }),
      this.prisma.location.findUnique({ where: { id: params.arrivalStopId } }),
    ]);

    return {
      schedules: schedules.map(schedule => this.transformBusSchedule(schedule)),
      route: {
        departure: departureLocation?.name || 'Unknown',
        arrival: arrivalLocation?.name || 'Unknown',
      },
      date: params.date.toISOString().split('T')[0],
    };
  }

  /**
   * Check real-time availability for a ferry
   */
  async checkFerryAvailability(scheduleId: string) {
    return this.ferryClient.checkAvailability(scheduleId);
  }

  /**
   * Check real-time availability for a bus
   */
  async checkBusAvailability(scheduleId: string) {
    return this.busClient.checkAvailability(scheduleId);
  }

  /**
   * Book a ferry ticket (future implementation)
   */
  async bookFerryTicket(scheduleId: string, passengers: number) {
    return this.ferryClient.bookTicket(scheduleId, passengers);
  }

  /**
   * Book a bus ticket (future implementation)
   */
  async bookBusTicket(scheduleId: string, passengers: number) {
    return this.busClient.bookTicket(scheduleId, passengers);
  }

  // ========== PRIVATE HELPERS ==========

  private transformFerrySchedule(schedule: FerryDeparture) {
    return {
      scheduleId: schedule.scheduleId,
      operator: schedule.operator,
      vesselName: schedule.vesselName,
      routeName: schedule.routeName,
      departureLocationId: schedule.departurePortId,
      arrivalLocationId: schedule.arrivalPortId,
      departureTime: schedule.departureTime.toISOString(),
      arrivalTime: schedule.arrivalTime.toISOString(),
      duration: schedule.duration,
      availableSeats: schedule.availableSeats,
      totalCapacity: schedule.totalCapacity,
      vehicleCapacity: schedule.vehicleCapacity,
      availableVehicles: schedule.availableVehicles,
      pricing: schedule.pricing,
      amenities: schedule.amenities,
      bookingUrl: schedule.bookingUrl,
    };
  }

  private transformBusSchedule(schedule: BusDeparture) {
    return {
      scheduleId: schedule.scheduleId,
      operator: schedule.operator,
      busNumber: schedule.busNumber,
      routeName: schedule.routeName,
      departureLocationId: schedule.departureStopId,
      arrivalLocationId: schedule.arrivalStopId,
      departureTime: schedule.departureTime.toISOString(),
      arrivalTime: schedule.arrivalTime.toISOString(),
      duration: schedule.duration,
      availableSeats: schedule.availableSeats,
      totalCapacity: schedule.totalCapacity,
      pricing: schedule.pricing,
      amenities: schedule.amenities,
      busType: schedule.busType,
      bookingUrl: schedule.bookingUrl,
    };
  }
}
