import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  SearchEventsDto,
  EventResponseDto,
  EventListResponseDto,
  CreateEventDto,
  UpdateEventDto,
  SortBy,
} from './dto/index.js';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search and discover events
   */
  async searchEvents(dto: SearchEventsDto): Promise<EventListResponseDto> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    this.logger.log(`Searching events: ${JSON.stringify(dto)}`);

    // Build where clause
    const where: any = {
      isActive: true,
    };

    // Filter by location
    if (dto.locationId) {
      where.locationId = dto.locationId;
    }

    // Filter by category
    if (dto.category) {
      where.category = dto.category;
    }

    // Search by name or description
    if (dto.search) {
      where.OR = [
        {
          name: {
            contains: dto.search,
            mode: 'insensitive' as any,
          },
        },
        {
          description: {
            contains: dto.search,
            mode: 'insensitive' as any,
          },
        },
      ];
    }

    // Filter by date range
    if (dto.startDate || dto.endDate) {
      where.startDate = {};

      if (dto.startDate) {
        where.startDate.gte = new Date(dto.startDate);
      }

      if (dto.endDate) {
        where.startDate.lte = new Date(dto.endDate);
      }
    }

    // Filter by price range
    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      where.price = {};

      if (dto.minPrice !== undefined) {
        where.price.gte = dto.minPrice;
      }

      if (dto.maxPrice !== undefined) {
        where.price.lte = dto.maxPrice;
      }
    }

    // Determine sort order
    let orderBy: any = { startDate: 'asc' };

    switch (dto.sortBy) {
      case SortBy.DATE_ASC:
        orderBy = { startDate: 'asc' };
        break;
      case SortBy.DATE_DESC:
        orderBy = { startDate: 'desc' };
        break;
      case SortBy.PRICE_ASC:
        orderBy = { price: 'asc' };
        break;
      case SortBy.PRICE_DESC:
        orderBy = { price: 'desc' };
        break;
      case SortBy.POPULARITY:
        // In production, sort by booking count or ratings
        orderBy = { createdAt: 'desc' };
        break;
    }

    // Execute queries
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          location: true,
          photos: {
            orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    this.logger.log(`Found ${total} events`);

    return {
      events: events.map((event) => this.mapToResponse(event)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get event by ID
   */
  async getEvent(id: number): Promise<EventResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        location: true,
        photos: {
          orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return this.mapToResponse(event);
  }

  /**
   * Get events by location
   */
  async getEventsByLocation(
    locationId: number,
  ): Promise<EventResponseDto[]> {
    const events = await this.prisma.event.findMany({
      where: {
        locationId,
        isActive: true,
        startDate: {
          gte: new Date(), // Only future events
        },
      },
      include: {
        location: true,
        photos: {
          orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return events.map((event) => this.mapToResponse(event));
  }

  /**
   * Get featured/popular events
   */
  async getFeaturedEvents(limit = 10): Promise<EventResponseDto[]> {
    const events = await this.prisma.event.findMany({
      where: {
        isActive: true,
        startDate: {
          gte: new Date(),
        },
      },
      include: {
        location: true,
        photos: {
          orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
        },
      },
      orderBy: {
        startDate: 'asc',
      },
      take: limit,
    });

    return events.map((event) => this.mapToResponse(event));
  }

  /**
   * Get events happening today
   */
  async getTodayEvents(locationId?: number): Promise<EventResponseDto[]> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const where: any = {
      isActive: true,
      startDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const events = await this.prisma.event.findMany({
      where,
      include: {
        location: true,
        photos: {
          orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return events.map((event) => this.mapToResponse(event));
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(
    category: string,
    limit = 20,
  ): Promise<EventResponseDto[]> {
    const events = await this.prisma.event.findMany({
      where: {
        category,
        isActive: true,
        startDate: {
          gte: new Date(),
        },
      },
      include: {
        location: true,
        photos: {
          orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
        },
      },
      orderBy: {
        startDate: 'asc',
      },
      take: limit,
    });

    return events.map((event) => this.mapToResponse(event));
  }

  /**
   * Create event (admin/supplier only)
   */
  async createEvent(
    dto: CreateEventDto,
    userId: number,
  ): Promise<EventResponseDto> {
    // In production, verify user has permission to create events

    const event = await this.prisma.event.create({
      data: {
        locationId: dto.locationId,
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        price: dto.price,
        currency: dto.currency,
        maxAttendees: dto.maxAttendees,
        category: dto.category,
        organizer: dto.organizer,
        website: dto.website,
        ticketUrl: dto.ticketUrl,
        isActive: dto.isActive,
      },
      include: {
        location: true,
        photos: true,
      },
    });

    this.logger.log(`Event ${event.id} created by user ${userId}`);

    return this.mapToResponse(event);
  }

  /**
   * Update event (admin/supplier only)
   */
  async updateEvent(
    id: number,
    dto: UpdateEventDto,
    userId: number,
  ): Promise<EventResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // In production, verify user has permission to update this event

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        locationId: dto.locationId,
        name: dto.name,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        price: dto.price,
        currency: dto.currency,
        maxAttendees: dto.maxAttendees,
        category: dto.category,
        organizer: dto.organizer,
        website: dto.website,
        ticketUrl: dto.ticketUrl,
        isActive: dto.isActive,
      },
      include: {
        location: true,
        photos: true,
      },
    });

    this.logger.log(`Event ${id} updated by user ${userId}`);

    return this.mapToResponse(updated);
  }

  /**
   * Delete event (admin only)
   */
  async deleteEvent(id: number, userId: number): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // In production, verify user is admin

    await this.prisma.event.delete({ where: { id } });

    this.logger.log(`Event ${id} deleted by user ${userId}`);
  }

  /**
   * Map Prisma event to response DTO
   */
  private mapToResponse(event: any): EventResponseDto {
    return {
      id: event.id,
      locationId: event.locationId,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      price: event.price ? parseFloat(event.price.toString()) : undefined,
      currency: event.currency,
      maxAttendees: event.maxAttendees,
      category: event.category,
      organizer: event.organizer,
      website: event.website,
      ticketUrl: event.ticketUrl,
      isActive: event.isActive,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      location: event.location
        ? {
            id: event.location.id,
            name: event.location.name,
            type: event.location.type,
            latitude: event.location.latitude,
            longitude: event.location.longitude,
          }
        : undefined,
      photos: event.photos
        ? event.photos.map((photo: any) => ({
            id: photo.id,
            url: photo.url,
            altText: photo.altText,
            isMain: photo.isMain,
          }))
        : undefined,
    };
  }
}
