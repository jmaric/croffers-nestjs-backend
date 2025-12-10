import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransportService } from './transport.service.js';
import { SearchFerrySchedulesDto, SearchBusSchedulesDto } from './dto/search-transport.dto.js';

@ApiTags('Transport')
@Controller({ path: 'transport', version: '1' })
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  @Get('ferries/search')
  @ApiOperation({
    summary: 'Search ferry schedules',
    description: 'Search for available ferry departures between two ports on a specific date. Currently using mock data from Jadrolinija, Krilo, and Kapetan Luka.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ferry schedules retrieved successfully',
  })
  async searchFerries(@Query() dto: SearchFerrySchedulesDto) {
    const searchParams = {
      departurePortId: dto.departurePortId,
      arrivalPortId: dto.arrivalPortId,
      date: new Date(dto.date),
      passengers: dto.passengers,
    };

    return this.transportService.searchFerrySchedules(searchParams);
  }

  @Get('buses/search')
  @ApiOperation({
    summary: 'Search bus schedules',
    description: 'Search for available bus departures between two stops on a specific date. Currently using mock data from FlixBus and Arriva.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bus schedules retrieved successfully',
  })
  async searchBuses(@Query() dto: SearchBusSchedulesDto) {
    const searchParams = {
      departureStopId: dto.departureStopId,
      arrivalStopId: dto.arrivalStopId,
      date: new Date(dto.date),
      passengers: dto.passengers,
    };

    return this.transportService.searchBusSchedules(searchParams);
  }
}
