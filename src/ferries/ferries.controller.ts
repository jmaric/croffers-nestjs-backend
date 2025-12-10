import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { FerriesService } from './ferries.service.js';
import {
  SearchFerriesDto,
  FerryScheduleResponseDto,
  FerrySearchResultDto,
  BookFerryDto,
} from './dto/index.js';
import { JwtGuard } from '../guard/jwt.guard.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { FerryOperator } from '../../generated/prisma/client/client.js';

@ApiTags('Ferries')
@Controller({ path: 'ferries', version: '1' })
export class FerriesController {
  constructor(private readonly ferriesService: FerriesService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search ferry schedules',
    description:
      'Search for available ferry schedules between two ports on a specific date. Supports round trip searches and filtering by operator, passengers, and vehicles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ferry schedules found',
    type: FerrySearchResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid search parameters',
  })
  async searchFerries(
    @Body() dto: SearchFerriesDto,
  ): Promise<FerrySearchResultDto> {
    return this.ferriesService.searchFerries(dto);
  }

  @Get('schedule/:id')
  @ApiOperation({
    summary: 'Get ferry schedule by ID',
    description: 'Retrieve detailed information about a specific ferry schedule',
  })
  @ApiParam({
    name: 'id',
    description: 'Ferry schedule ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Ferry schedule found',
    type: FerryScheduleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ferry schedule not found',
  })
  async getFerrySchedule(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FerryScheduleResponseDto> {
    return this.ferriesService.getFerrySchedule(id);
  }

  @Get('route')
  @ApiOperation({
    summary: 'Get all schedules for a route',
    description:
      'Retrieve all ferry schedules for a specific route (departure to arrival port)',
  })
  @ApiQuery({
    name: 'departurePortId',
    description: 'Departure port location ID',
    example: 1,
  })
  @ApiQuery({
    name: 'arrivalPortId',
    description: 'Arrival port location ID',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Ferry schedules found',
    type: [FerryScheduleResponseDto],
  })
  async getRouteSchedules(
    @Query('departurePortId', ParseIntPipe) departurePortId: number,
    @Query('arrivalPortId', ParseIntPipe) arrivalPortId: number,
  ): Promise<FerryScheduleResponseDto[]> {
    return this.ferriesService.getRouteSchedules(
      departurePortId,
      arrivalPortId,
    );
  }

  @Get('operators')
  @ApiOperation({
    summary: 'Get available ferry operators',
    description: 'Retrieve list of all ferry operators with available schedules',
  })
  @ApiResponse({
    status: 200,
    description: 'Ferry operators retrieved',
    type: [String],
  })
  async getOperators(): Promise<FerryOperator[]> {
    return this.ferriesService.getOperators();
  }

  @Post('book')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Book ferry ticket',
    description:
      'Book a ferry ticket directly with the ferry operator API (Jadrolinija, Krilo, TP Line, etc.). This creates a booking with the operator and stores the reference in our system. Payment is processed through the operator\'s API.',
  })
  @ApiResponse({
    status: 201,
    description: 'Ferry booked successfully',
    schema: {
      type: 'object',
      properties: {
        ferryBookingId: { type: 'number', example: 42 },
        operatorReference: { type: 'string', example: 'JAD-1234567890-ABC123' },
        totalPrice: { type: 'number', example: 135.50 },
        status: { type: 'string', example: 'CONFIRMED' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - insufficient availability or booking failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Ferry schedule not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async bookFerry(
    @GetUser('id') userId: number,
    @Body() dto: BookFerryDto,
  ): Promise<{
    ferryBookingId: number;
    operatorReference: string;
    totalPrice: number;
    status: string;
  }> {
    return this.ferriesService.bookFerry(dto, userId);
  }

  @Get('booking/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get ferry booking details',
    description: 'Retrieve detailed information about a specific ferry booking',
  })
  @ApiParam({
    name: 'id',
    description: 'Ferry booking ID',
    example: 42,
  })
  @ApiResponse({
    status: 200,
    description: 'Ferry booking details retrieved',
  })
  @ApiResponse({
    status: 404,
    description: 'Ferry booking not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not have access to this booking',
  })
  async getFerryBooking(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any> {
    return this.ferriesService.getFerryBooking(id, userId);
  }

  @Delete('booking/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel ferry booking',
    description:
      'Cancel a ferry booking. This cancels the booking with the ferry operator API and restores availability. Cancellation policies vary by operator.',
  })
  @ApiParam({
    name: 'id',
    description: 'Ferry booking ID',
    example: 42,
  })
  @ApiResponse({
    status: 204,
    description: 'Ferry booking cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - booking already cancelled or cancellation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Ferry booking not found',
  })
  async cancelFerryBooking(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.ferriesService.cancelFerryBooking(id, userId);
  }

  @Post('sync/:operator')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Sync ferry schedules from external API',
    description:
      'Admin endpoint to sync ferry schedules from external ferry operator APIs (Jadrolinija, Krilo, TP Line). This updates the database with latest schedules and availability.',
  })
  @ApiParam({
    name: 'operator',
    description: 'Ferry operator to sync',
    enum: FerryOperator,
    example: FerryOperator.JADROLINIJA,
  })
  @ApiResponse({
    status: 200,
    description: 'Schedules synced successfully',
    schema: {
      type: 'object',
      properties: {
        operator: { type: 'string', example: 'JADROLINIJA' },
        synced: { type: 'number', example: 15 },
        message: { type: 'string', example: 'Successfully synced 15 schedules' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - unsupported operator',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async syncSchedules(
    @Param('operator') operator: FerryOperator,
  ): Promise<{ operator: string; synced: number; message: string }> {
    const synced = await this.ferriesService.syncSchedules(operator);
    return {
      operator,
      synced,
      message: `Successfully synced ${synced} schedules`,
    };
  }
}
