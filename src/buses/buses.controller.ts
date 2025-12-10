import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BusesService } from './buses.service.js';
import {
  SearchBusesDto,
  BusScheduleResponseDto,
  BusSearchResultDto,
  BookBusDto,
} from './dto/index.js';
import { JwtGuard } from '../guard/jwt.guard.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { BusOperator } from '../../generated/prisma/client/client.js';

@ApiTags('Buses')
@Controller({ path: 'buses', version: '1' })
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search bus schedules',
    description:
      'Search for available bus schedules between two stops on a specific date. Supports round trip searches and filtering by operator and passengers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bus schedules found',
    type: BusSearchResultDto,
  })
  async searchBuses(@Body() dto: SearchBusesDto): Promise<BusSearchResultDto> {
    return this.busesService.searchBuses(dto);
  }

  @Get('schedule/:id')
  @ApiOperation({
    summary: 'Get bus schedule by ID',
    description: 'Retrieve detailed information about a specific bus schedule',
  })
  @ApiParam({ name: 'id', description: 'Bus schedule ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Bus schedule found',
    type: BusScheduleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Bus schedule not found' })
  async getBusSchedule(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BusScheduleResponseDto> {
    return this.busesService.getBusSchedule(id);
  }

  @Post('book')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Book bus ticket',
    description:
      'Book a bus ticket directly with the bus operator API (FlixBus, GetByBus, Arriva, etc.). Supports seat selection and creates a booking with the operator.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bus booked successfully',
    schema: {
      type: 'object',
      properties: {
        busBookingId: { type: 'number', example: 42 },
        operatorReference: { type: 'string', example: 'FLX-1234567890-ABC123' },
        totalPrice: { type: 'number', example: 15.0 },
        status: { type: 'string', example: 'CONFIRMED' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - insufficient availability or booking failed',
  })
  @ApiResponse({ status: 404, description: 'Bus schedule not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async bookBus(
    @GetUser('id') userId: number,
    @Body() dto: BookBusDto,
  ): Promise<{
    busBookingId: number;
    operatorReference: string;
    totalPrice: number;
    status: string;
  }> {
    return this.busesService.bookBus(dto, userId);
  }

  @Get('booking/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get bus booking details',
    description: 'Retrieve detailed information about a specific bus booking',
  })
  @ApiParam({ name: 'id', description: 'Bus booking ID', example: 42 })
  @ApiResponse({
    status: 200,
    description: 'Bus booking details retrieved',
  })
  @ApiResponse({ status: 404, description: 'Bus booking not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not have access to this booking',
  })
  async getBusBooking(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any> {
    return this.busesService.getBusBooking(id, userId);
  }

  @Delete('booking/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel bus booking',
    description:
      'Cancel a bus booking. This cancels the booking with the bus operator API and restores availability.',
  })
  @ApiParam({ name: 'id', description: 'Bus booking ID', example: 42 })
  @ApiResponse({
    status: 204,
    description: 'Bus booking cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - booking already cancelled or cancellation failed',
  })
  @ApiResponse({ status: 404, description: 'Bus booking not found' })
  async cancelBusBooking(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.busesService.cancelBusBooking(id, userId);
  }

  @Post('sync/:operator')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Sync bus schedules from external API',
    description:
      'Admin endpoint to sync bus schedules from external bus operator APIs.',
  })
  @ApiParam({
    name: 'operator',
    description: 'Bus operator to sync',
    enum: BusOperator,
    example: BusOperator.FLIXBUS,
  })
  @ApiResponse({
    status: 200,
    description: 'Schedules synced successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - unsupported operator' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async syncSchedules(
    @Param('operator') operator: BusOperator,
  ): Promise<{ operator: string; synced: number; message: string }> {
    const synced = await this.busesService.syncSchedules(operator);
    return {
      operator,
      synced,
      message: `Successfully synced ${synced} schedules`,
    };
  }
}
