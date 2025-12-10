import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  CreateServiceDto,
  UpdateServiceDto,
  FilterServiceDto,
  CreateTransportServiceDto,
  UpdateTransportServiceDto,
  CreateAccommodationServiceDto,
  UpdateAccommodationServiceDto,
  CreateTourServiceDto,
  UpdateTourServiceDto,
  CreateActivityServiceDto,
  UpdateActivityServiceDto,
} from './dto/index.js';
import {
  ServiceType,
  UserRole,
  SupplierStatus,
} from '../../generated/prisma/client/client.js';
import { getTranslatedContent, getTranslatedArray } from '../common/helpers/translation.helper.js';

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Apply translations to a service object based on requested language
   */
  private applyTranslations(service: any, lang: string = 'en'): any {
    return getTranslatedContent(service, lang);
  }

  /**
   * Apply translations to an array of services
   */
  private applyTranslationsToArray(services: any[], lang: string = 'en'): any[] {
    return getTranslatedArray(services, lang);
  }

  async create(
    userId: number,
    serviceType: ServiceType,
    dto:
      | CreateTransportServiceDto
      | CreateAccommodationServiceDto
      | CreateTourServiceDto
      | CreateActivityServiceDto,
  ) {
    // Get supplier for this user
    const supplier = await this.prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier profile not found');
    }

    if (supplier.status !== SupplierStatus.APPROVED) {
      throw new ForbiddenException('Supplier must be approved to create services');
    }

    // Check slug uniqueness
    const existingService = await this.prisma.service.findUnique({
      where: { slug: dto.service.slug },
    });

    if (existingService) {
      throw new BadRequestException('Service with this slug already exists');
    }

    // Create service based on type
    let createdService;
    switch (serviceType) {
      case ServiceType.TRANSPORT:
        createdService = await this.createTransportService(supplier.id, dto as CreateTransportServiceDto);
        break;
      case ServiceType.ACCOMMODATION:
        createdService = await this.createAccommodationService(supplier.id, dto as CreateAccommodationServiceDto);
        break;
      case ServiceType.TOUR:
        createdService = await this.createTourService(supplier.id, dto as CreateTourServiceDto);
        break;
      case ServiceType.ACTIVITY:
        createdService = await this.createActivityService(supplier.id, dto as CreateActivityServiceDto);
        break;
      default:
        throw new BadRequestException('Invalid service type');
    }

    // Invalidate cache for services list so the new service appears immediately
    await this.invalidateServicesCache(userId, supplier.id);

    // Notify all admins about new service pending approval
    await this.notificationsService.notifyAllAdmins(
      'SYSTEM_ALERT' as any, // Using SYSTEM_ALERT for admin notifications
      'New Service Pending Approval',
      `A new ${serviceType.toLowerCase()} service "${dto.service.name}" has been submitted by ${supplier.businessName} and requires approval.`,
      `/admin/dashboard?tab=services`,
      { serviceId: createdService.id, serviceName: dto.service.name, supplierId: supplier.id },
    );

    return createdService;
  }

  private async createTransportService(
    supplierId: number,
    dto: CreateTransportServiceDto,
  ) {
    // Validate locations exist
    const [departureLocation, arrivalLocation] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: dto.departureLocationId } }),
      this.prisma.location.findUnique({ where: { id: dto.arrivalLocationId } }),
    ]);

    if (!departureLocation || !arrivalLocation) {
      throw new NotFoundException('Departure or arrival location not found');
    }

    return this.prisma.service.create({
      data: {
        supplierId,
        ...dto.service,
        type: ServiceType.TRANSPORT,
        transportService: {
          create: {
            transportType: dto.transportType,
            departureLocationId: dto.departureLocationId,
            arrivalLocationId: dto.arrivalLocationId,
            departureTime: dto.departureTime ? new Date(dto.departureTime) : null,
            arrivalTime: dto.arrivalTime ? new Date(dto.arrivalTime) : null,
            isScheduled: dto.isScheduled ?? false,
            vehicleCapacity: dto.vehicleCapacity,
            vehicleType: dto.vehicleType,
            amenities: dto.amenities ?? [],
          },
        },
      },
      include: {
        transportService: {
          include: {
            departureLocation: true,
            arrivalLocation: true,
          },
        },
      },
    });
  }

  private async createAccommodationService(
    supplierId: number,
    dto: CreateAccommodationServiceDto,
  ) {
    // Validate location exists
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return this.prisma.service.create({
      data: {
        supplierId,
        ...dto.service,
        type: ServiceType.ACCOMMODATION,
        accommodationService: {
          create: {
            locationId: dto.locationId,
            accommodationType: dto.accommodationType,
            bedrooms: dto.bedrooms,
            bathrooms: dto.bathrooms,
            maxGuests: dto.maxGuests,
            amenities: dto.amenities ?? [],
            checkInTime: dto.checkInTime,
            checkOutTime: dto.checkOutTime,
            minimumStay: dto.minimumStay,
            instantBook: dto.instantBook ?? false,
          },
        },
      },
      include: {
        accommodationService: {
          include: {
            location: true,
          },
        },
      },
    });
  }

  private async createTourService(supplierId: number, dto: CreateTourServiceDto) {
    // Validate location exists
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return this.prisma.service.create({
      data: {
        supplierId,
        ...dto.service,
        type: ServiceType.TOUR,
        tourService: {
          create: {
            locationId: dto.locationId,
            tourType: dto.tourType,
            meetingPoint: dto.meetingPoint,
            includes: dto.includes ?? [],
            excludes: dto.excludes ?? [],
            difficulty: dto.difficulty,
            languages: dto.languages ?? ['en'],
            groupSizeMax: dto.groupSizeMax,
            cancellationPolicy: dto.cancellationPolicy,
          },
        },
      },
      include: {
        tourService: {
          include: {
            location: true,
          },
        },
      },
    });
  }

  private async createActivityService(supplierId: number, dto: CreateActivityServiceDto) {
    // Validate location exists
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return this.prisma.service.create({
      data: {
        supplierId,
        ...dto.service,
        type: ServiceType.ACTIVITY,
        activityService: {
          create: {
            locationId: dto.locationId,
            activityType: dto.activityType,
            ageRestriction: dto.ageRestriction,
            equipment: dto.equipment ?? [],
            skillLevel: dto.skillLevel,
            seasonality: dto.seasonality ?? [],
          },
        },
      },
      include: {
        activityService: {
          include: {
            location: true,
          },
        },
      },
    });
  }

  async findAll(filterDto: FilterServiceDto, lang: string = 'en') {
    const {
      type,
      status,
      isActive,
      supplierId,
      search,
      minPrice,
      maxPrice,
      latitude,
      longitude,
      radius,
      locationId,
      locationName,
      minCapacity,
      startDate,
      endDate,
      amenities,
      minTrustScore,
      sortBy = 'newest',
      page = 1,
      limit = 10,
    } = filterDto;

    const where: any = {};

    // Basic filters
    if (type) where.type = type;
    if (status) where.status = status;
    if (isActive !== undefined) where.isActive = isActive;
    if (supplierId) where.supplierId = supplierId;

    // Build AND conditions for complex OR queries
    const andConditions: any[] = [];

    // Full-text search
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
          { tags: { hasSome: search.split(' ') } },
        ],
      });
    }

    // Location filtering (by ID or name)
    if (locationId || locationName) {
      const locationCondition = locationId
        ? { id: locationId }
        : { name: { contains: locationName, mode: 'insensitive' } };

      andConditions.push({
        OR: [
          // Accommodation services
          {
            accommodationService: {
              location: locationCondition,
            },
          },
          // Tour services
          {
            tourService: {
              location: locationCondition,
            },
          },
          // Activity services
          {
            activityService: {
              location: locationCondition,
            },
          },
          // Transport services (departure OR arrival location)
          {
            transportService: {
              OR: [
                { departureLocation: locationCondition },
                { arrivalLocation: locationCondition },
              ],
            },
          },
        ],
      });
    }

    // Apply AND conditions if any exist
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    // Capacity filter
    if (minCapacity) {
      where.capacity = { gte: minCapacity };
    }

    // Amenities filter (tags)
    if (amenities && amenities.length > 0) {
      where.tags = { hasEvery: amenities };
    }

    const skip = (page - 1) * limit;

    // Determine sort order
    const orderBy = this.buildOrderBy(sortBy);

    // Execute query
    let services = await this.prisma.service.findMany({
      where,
      skip,
      take: limit,
      include: {
        supplier: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
        photos: {
          where: { isMain: true },
          take: 1,
        },
        _count: {
          select: {
            reviews: true,
            bookingItems: true,
          },
        },
        bookingItems: supplierId
          ? {
              select: {
                totalPrice: true,
                booking: {
                  select: {
                    status: true,
                  },
                },
              },
            }
          : false,
        accommodationService: {
          select: {
            locationId: true,
            location: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
        tourService: {
          select: {
            locationId: true,
            location: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
        activityService: {
          select: {
            locationId: true,
            location: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
        transportService: {
          select: {
            departureLocationId: true,
            arrivalLocationId: true,
            departureLocation: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            },
            arrivalLocation: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
      orderBy,
    });

    // Location-based filtering (post-query due to Prisma limitations)
    if (latitude && longitude && radius) {
      services = services.filter((service) => {
        const serviceLocation = this.getServiceLocation(service);
        if (!serviceLocation) return false;

        const distance = this.calculateDistance(
          latitude,
          longitude,
          serviceLocation.latitude,
          serviceLocation.longitude,
        );

        return distance <= radius;
      });
    }

    // Trust score filtering (post-query)
    if (minTrustScore) {
      const servicesWithTrustScore = await Promise.all(
        services.map(async (service) => {
          const trustScore = await this.calculateServiceTrustScore(service.id);
          return { service, trustScore };
        }),
      );

      services = servicesWithTrustScore
        .filter(({ trustScore }) => trustScore >= minTrustScore)
        .map(({ service }) => service);
    }

    // Date availability filtering (post-query)
    if (startDate && endDate) {
      const availableServiceIds = await this.filterByAvailability(
        services.map((s) => s.id),
        new Date(startDate),
        new Date(endDate),
      );

      services = services.filter((service) =>
        availableServiceIds.includes(service.id),
      );
    }

    // Re-sort if needed after post-query filtering
    if (sortBy === 'trust_score' && minTrustScore) {
      services = await this.sortByTrustScore(services);
    }

    const total = await this.prisma.service.count({ where });
    const filteredTotal = services.length;

    // Calculate bookings count, revenue, and trust score
    if (supplierId) {
      services = await Promise.all(
        services.map(async (service) => {
          const bookingsCount = service._count.bookingItems;
          const revenue = service.bookingItems
            ? service.bookingItems.reduce((sum, item) => {
                // Use the item's totalPrice (converted from Decimal to number)
                return sum + Number(item.totalPrice || 0);
              }, 0)
            : 0;

          // Calculate trust score
          const trustScoreData = await this.calculateServiceTrustScore(
            service.id,
          );

          // Remove bookingItems from response and add calculated fields
          const { bookingItems, ...serviceWithoutItems } = service;
          return {
            ...serviceWithoutItems,
            bookings: bookingsCount,
            revenue,
            trustScore: trustScoreData,
          } as any;
        }),
      ) as any;
    }

    // Apply translations to all services
    const translatedServices = this.applyTranslationsToArray(services, lang);

    return {
      data: translatedServices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private buildOrderBy(sortBy: string): any {
    switch (sortBy) {
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'newest':
        return { createdAt: 'desc' };
      case 'popularity':
        return {
          bookingItems: {
            _count: 'desc',
          },
        };
      case 'relevance':
      case 'trust_score':
      default:
        return { createdAt: 'desc' };
    }
  }

  private getServiceLocation(service: any): { latitude: number; longitude: number } | null {
    if (service.accommodationService?.location) {
      return service.accommodationService.location;
    }
    if (service.tourService?.location) {
      return service.tourService.location;
    }
    if (service.activityService?.location) {
      return service.activityService.location;
    }
    return null;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    // Haversine formula for calculating distance between two coordinates
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async calculateServiceTrustScore(serviceId: number): Promise<number> {
    const reviews = await this.prisma.review.findMany({
      where: {
        serviceId,
        isPublished: true,
        reviewType: 'GUEST_TO_SUPPLIER',
      },
      select: { wouldRecommend: true },
    });

    if (reviews.length === 0) return 0;

    const positiveReviews = reviews.filter((r) => r.wouldRecommend).length;
    return Math.round((positiveReviews / reviews.length) * 100);
  }

  private async filterByAvailability(
    serviceIds: number[],
    startDate: Date,
    endDate: Date,
  ): Promise<number[]> {
    // Get all bookings that overlap with the requested date range
    const conflictingBookings = await this.prisma.booking.findMany({
      where: {
        bookingItems: {
          some: {
            serviceId: { in: serviceIds },
          },
        },
        serviceDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
      include: {
        bookingItems: {
          select: { serviceId: true },
        },
      },
    });

    const bookedServiceIds = new Set(
      conflictingBookings.flatMap((booking) =>
        booking.bookingItems.map((item) => item.serviceId),
      ),
    );

    return serviceIds.filter((id) => !bookedServiceIds.has(id));
  }

  private async sortByTrustScore(services: any[]): Promise<any[]> {
    const servicesWithScores = await Promise.all(
      services.map(async (service) => {
        const trustScore = await this.calculateServiceTrustScore(service.id);
        return { service, trustScore };
      }),
    );

    return servicesWithScores
      .sort((a, b) => b.trustScore - a.trustScore)
      .map(({ service }) => service);
  }

  async findOne(id: number) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            businessName: true,
            status: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        transportService: {
          include: {
            departureLocation: true,
            arrivalLocation: true,
          },
        },
        accommodationService: {
          include: {
            location: true,
          },
        },
        tourService: {
          include: {
            location: true,
          },
        },
        activityService: {
          include: {
            location: true,
          },
        },
        photos: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        reviews: {
          where: {
            isPublished: true,
          },
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: {
              select: {
                firstName: true,
              },
            },
          },
        },
        _count: {
          select: {
            reviews: true,
            bookingItems: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async findBySlug(slug: string) {
    const service = await this.prisma.service.findUnique({
      where: { slug },
      include: {
        supplier: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
        transportService: {
          include: {
            departureLocation: true,
            arrivalLocation: true,
          },
        },
        accommodationService: {
          include: {
            location: true,
          },
        },
        tourService: {
          include: {
            location: true,
          },
        },
        activityService: {
          include: {
            location: true,
          },
        },
        photos: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with slug "${slug}" not found`);
    }

    return service;
  }

  async update(
    id: number,
    userId: number,
    userRole: UserRole,
    updateServiceDto: UpdateServiceDto,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        supplier: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    // Check permissions
    if (service.supplier.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this service');
    }

    // Check slug uniqueness if being updated
    if (updateServiceDto.slug && updateServiceDto.slug !== service.slug) {
      const existingService = await this.prisma.service.findUnique({
        where: { slug: updateServiceDto.slug },
      });

      if (existingService) {
        throw new BadRequestException('Service with this slug already exists');
      }
    }

    return this.prisma.service.update({
      where: { id },
      data: updateServiceDto,
      include: {
        supplier: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });
  }

  async updateSpecialized(
    id: number,
    userId: number,
    userRole: UserRole,
    updateDto:
      | UpdateTransportServiceDto
      | UpdateAccommodationServiceDto
      | UpdateTourServiceDto
      | UpdateActivityServiceDto,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        supplier: true,
        transportService: true,
        accommodationService: true,
        tourService: true,
        activityService: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    // Check permissions
    if (service.supplier.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this service');
    }

    // Update based on type
    switch (service.type) {
      case ServiceType.TRANSPORT:
        if (!service.transportService) {
          throw new BadRequestException('Transport service data not found');
        }
        return this.prisma.transportService.update({
          where: { serviceId: id },
          data: updateDto as UpdateTransportServiceDto,
          include: {
            departureLocation: true,
            arrivalLocation: true,
            service: true,
          },
        });

      case ServiceType.ACCOMMODATION:
        if (!service.accommodationService) {
          throw new BadRequestException('Accommodation service data not found');
        }
        return this.prisma.accommodationService.update({
          where: { serviceId: id },
          data: updateDto as UpdateAccommodationServiceDto,
          include: {
            location: true,
            service: true,
          },
        });

      case ServiceType.TOUR:
        if (!service.tourService) {
          throw new BadRequestException('Tour service data not found');
        }
        return this.prisma.tourService.update({
          where: { serviceId: id },
          data: updateDto as UpdateTourServiceDto,
          include: {
            location: true,
            service: true,
          },
        });

      case ServiceType.ACTIVITY:
        if (!service.activityService) {
          throw new BadRequestException('Activity service data not found');
        }
        return this.prisma.activityService.update({
          where: { serviceId: id },
          data: updateDto as UpdateActivityServiceDto,
          include: {
            location: true,
            service: true,
          },
        });

      default:
        throw new BadRequestException('Invalid service type');
    }
  }

  async remove(id: number, userId: number, userRole: UserRole) {
    console.log('[DELETE] Attempting to delete service:', { id, userId, userRole });

    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        supplier: true,
        _count: {
          select: {
            bookingItems: true,
          },
        },
      },
    });

    console.log('[DELETE] Service found:', service ? {
      id: service.id,
      supplierId: service.supplierId,
      supplierUserId: service.supplier?.userId,
      status: service.status
    } : null);

    if (!service) {
      console.log('[DELETE] Service not found, throwing 404');
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    // Check permissions
    if (service.supplier.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this service');
    }

    // Check if service has bookings
    if (service._count.bookingItems > 0) {
      throw new BadRequestException(
        'Cannot delete service with existing bookings. Set as inactive instead.',
      );
    }

    await this.prisma.service.delete({
      where: { id },
    });

    // Invalidate cache for services list
    await this.invalidateServicesCache(userId, service.supplierId);

    return {
      message: 'Service deleted successfully',
    };
  }

  /**
   * Invalidate HTTP cache for services endpoints
   * This clears cached GET /services responses so they reflect the latest data
   */
  private async invalidateServicesCache(userId: number, supplierId: number) {
    try {
      // Get all cache keys that start with http-cache and contain /services
      // Since in-memory cache doesn't support pattern deletion, we'll clear specific known patterns
      const cacheKeys = [
        `http-cache:${userId}:/api/v1/services`,
        `http-cache:${userId}:/services`,
      ];

      // Try all common query parameter combinations
      const queryVariations = [
        '',
        `?supplierId=${supplierId}`,
        `?supplierId=${supplierId}&page=1`,
        `?supplierId=${supplierId}&page=1&limit=10`,
        `?supplierId=${supplierId}&page=1&limit=20`,
        `?supplierId=${supplierId}&limit=10`,
        `?supplierId=${supplierId}&limit=20`,
        `?page=1&limit=10`,
        `?page=1&limit=20`,
      ];

      // Add page 2, 3, 4, 5 variations
      for (let page = 2; page <= 5; page++) {
        queryVariations.push(`?supplierId=${supplierId}&page=${page}&limit=10`);
        queryVariations.push(`?page=${page}&limit=10`);
      }

      for (const baseKey of cacheKeys) {
        for (const query of queryVariations) {
          await this.cacheManager.del(`${baseKey}${query}`);
        }
      }

      console.log(`[Cache] Invalidated services cache for user ${userId}, supplier ${supplierId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate cache:', error);
      // Don't throw - cache invalidation failure shouldn't break the operation
    }
  }

  async checkAvailability(serviceId: number, date: string, requestedQuantity: number) {
    // Get service details
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        name: true,
        capacity: true,
        isActive: true,
        status: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    if (!service.isActive) {
      return {
        available: false,
        reason: 'Service is not active',
        service: {
          id: service.id,
          name: service.name,
        },
      };
    }

    // If no capacity is set, assume unlimited availability
    if (!service.capacity) {
      return {
        available: true,
        unlimited: true,
        requestedQuantity,
        service: {
          id: service.id,
          name: service.name,
        },
      };
    }

    // Parse the date and get start and end of day
    const serviceDate = new Date(date);
    const startOfDay = new Date(serviceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(serviceDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find all bookings for this service on this date (excluding cancelled bookings)
    const bookings = await this.prisma.booking.findMany({
      where: {
        serviceDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          notIn: ['CANCELLED', 'REFUNDED'],
        },
        bookingItems: {
          some: {
            serviceId,
          },
        },
      },
      include: {
        bookingItems: {
          where: {
            serviceId,
          },
          select: {
            quantity: true,
          },
        },
      },
    });

    // Calculate total booked quantity
    const bookedQuantity = bookings.reduce((total, booking) => {
      const itemQuantity = booking.bookingItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      return total + itemQuantity;
    }, 0);

    const availableCapacity = service.capacity - bookedQuantity;
    const isAvailable = availableCapacity >= requestedQuantity;

    return {
      available: isAvailable,
      requestedQuantity,
      totalCapacity: service.capacity,
      bookedQuantity,
      availableCapacity,
      service: {
        id: service.id,
        name: service.name,
      },
    };
  }
}