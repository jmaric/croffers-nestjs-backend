import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateLocationDto,
  UpdateLocationDto,
  FilterLocationDto,
} from './dto/index.js';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async create(createLocationDto: CreateLocationDto) {
    // Check if slug already exists
    const existingLocation = await this.prisma.location.findUnique({
      where: { slug: createLocationDto.slug },
    });

    if (existingLocation) {
      throw new BadRequestException('Location with this slug already exists');
    }

    // If parentId is provided, verify parent exists
    if (createLocationDto.parentId) {
      const parentExists = await this.prisma.location.findUnique({
        where: { id: createLocationDto.parentId },
      });

      if (!parentExists) {
        throw new NotFoundException('Parent location not found');
      }
    }

    return this.prisma.location.create({
      data: createLocationDto,
      include: {
        parent: true,
      },
    });
  }

  async findAll(filterDto: FilterLocationDto) {
    const { type, parentId, isActive, search, serviceLocationsOnly, page = 1, limit = 10 } = filterDto;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    // Handle parentId filter explicitly
    // If serviceLocationsOnly is true, get only parent locations (no parentId)
    if (serviceLocationsOnly === true) {
      where.parentId = null;
    } else if (parentId !== undefined) {
      // null = get only top-level locations (service locations)
      // number = get children of specific location
      // undefined = no filter (get all)
      where.parentId = parentId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [locations, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        skip,
        take: limit,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.location.count({ where }),
    ]);

    return {
      data: locations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        accommodations: {
          take: 5,
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
                currency: true,
              },
            },
          },
        },
        tours: {
          take: 5,
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
                currency: true,
              },
            },
          },
        },
        activities: {
          take: 5,
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
                currency: true,
              },
            },
          },
        },
        events: {
          where: {
            isActive: true,
            startDate: {
              gte: new Date(),
            },
          },
          take: 5,
          orderBy: {
            startDate: 'asc',
          },
        },
        photos: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  async getServiceLocations(page = 1, limit = 100) {
    // Only get top-level locations (islands & cities) - no child locations
    const where = {
      parentId: null,
      isActive: true,
    };

    // Ensure page and limit are numbers
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [locations, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { type: 'asc' }, // CITY before ISLAND
          { name: 'asc' },
        ],
      }),
      this.prisma.location.count({ where }),
    ]);

    return {
      data: locations,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async findBySlug(slug: string) {
    const location = await this.prisma.location.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: true,
        photos: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Location with slug "${slug}" not found`);
    }

    return location;
  }

  async update(id: number, updateLocationDto: UpdateLocationDto) {
    // Check if location exists
    const location = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    // If slug is being updated, check it doesn't conflict
    if ('slug' in updateLocationDto && updateLocationDto.slug) {
      const newSlug = updateLocationDto.slug;
      if (newSlug !== location.slug) {
        const existingLocation = await this.prisma.location.findUnique({
          where: { slug: newSlug },
        });

        if (existingLocation) {
          throw new BadRequestException('Location with this slug already exists');
        }
      }
    }

    // If parentId is being updated, verify parent exists and prevent circular reference
    if ('parentId' in updateLocationDto) {
      const newParentId = updateLocationDto.parentId;
      if (newParentId === id) {
        throw new BadRequestException('Location cannot be its own parent');
      }

      if (newParentId !== null && newParentId !== undefined) {
        const parentExists = await this.prisma.location.findUnique({
          where: { id: newParentId },
        });

        if (!parentExists) {
          throw new NotFoundException('Parent location not found');
        }
      }
    }

    return this.prisma.location.update({
      where: { id },
      data: updateLocationDto,
      include: {
        parent: true,
      },
    });
  }

  async remove(id: number) {
    // Check if location exists
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    // Check if location has children
    if (location.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete location with child locations. Delete children first or reassign them.',
      );
    }

    await this.prisma.location.delete({
      where: { id },
    });

    return {
      message: 'Location deleted successfully',
    };
  }
}