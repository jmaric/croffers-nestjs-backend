import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EventsService } from './events.service.js';
import {
  SearchEventsDto,
  EventResponseDto,
  EventListResponseDto,
  CreateEventDto,
  UpdateEventDto,
} from './dto/index.js';
import { JwtGuard } from '../guard/jwt.guard.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';

@ApiTags('Events')
@Controller({ path: 'events', version: '1' })
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search and discover events',
    description:
      'Search for events with flexible filtering by location, category, date range, price, and more. Supports pagination and sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'Events found',
    type: EventListResponseDto,
  })
  async searchEvents(
    @Body() dto: SearchEventsDto,
  ): Promise<EventListResponseDto> {
    return this.eventsService.searchEvents(dto);
  }

  @Get('featured')
  @ApiOperation({
    summary: 'Get featured events',
    description: 'Retrieve featured/popular upcoming events',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of events to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Featured events retrieved',
    type: [EventResponseDto],
  })
  async getFeaturedEvents(
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ): Promise<EventResponseDto[]> {
    return this.eventsService.getFeaturedEvents(limit);
  }

  @Get('today')
  @ApiOperation({
    summary: 'Get events happening today',
    description: 'Retrieve all events happening today, optionally filtered by location',
  })
  @ApiQuery({
    name: 'locationId',
    required: false,
    description: 'Filter by location ID',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Today\'s events retrieved',
    type: [EventResponseDto],
  })
  async getTodayEvents(
    @Query('locationId', new ParseIntPipe({ optional: true })) locationId?: number,
  ): Promise<EventResponseDto[]> {
    return this.eventsService.getTodayEvents(locationId);
  }

  @Get('category/:category')
  @ApiOperation({
    summary: 'Get events by category',
    description: 'Retrieve upcoming events in a specific category',
  })
  @ApiParam({
    name: 'category',
    description: 'Event category',
    example: 'BEACH_PARTY',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of events to return',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved',
    type: [EventResponseDto],
  })
  async getEventsByCategory(
    @Param('category') category: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<EventResponseDto[]> {
    return this.eventsService.getEventsByCategory(category, limit);
  }

  @Get('location/:locationId')
  @ApiOperation({
    summary: 'Get events by location',
    description: 'Retrieve all upcoming events at a specific location',
  })
  @ApiParam({
    name: 'locationId',
    description: 'Location ID',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved',
    type: [EventResponseDto],
  })
  async getEventsByLocation(
    @Param('locationId', ParseIntPipe) locationId: number,
  ): Promise<EventResponseDto[]> {
    return this.eventsService.getEventsByLocation(locationId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get event by ID',
    description: 'Retrieve detailed information about a specific event',
  })
  @ApiParam({
    name: 'id',
    description: 'Event ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Event retrieved',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  async getEvent(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EventResponseDto> {
    return this.eventsService.getEvent(id);
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create event',
    description:
      'Create a new event (Admin/Supplier only). Used for adding concerts, festivals, parties, and other events to the platform.',
  })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid event data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async createEvent(
    @GetUser('id') userId: number,
    @Body() dto: CreateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventsService.createEvent(dto, userId);
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update event',
    description: 'Update event details (Admin/Supplier only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Event ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async updateEvent(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventsService.updateEvent(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete event',
    description: 'Delete an event (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Event ID',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Event deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async deleteEvent(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.eventsService.deleteEvent(id, userId);
  }
}
