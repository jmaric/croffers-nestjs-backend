import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreatePhotoDto,
  UpdatePhotoDto,
  FilterPhotoDto,
  UploadPhotoDto,
} from './dto/index.js';
import { UserRole } from '../../generated/prisma/client/client.js';

@Injectable()
export class PhotosService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: number,
    userRole: UserRole,
    createPhotoDto: CreatePhotoDto,
  ) {
    // Validate that at least one parent is provided
    if (
      !createPhotoDto.serviceId &&
      !createPhotoDto.locationId &&
      !createPhotoDto.eventId
    ) {
      throw new BadRequestException(
        'Photo must be associated with a service, location, or event',
      );
    }

    // Validate only one parent is provided
    const parentCount = [
      createPhotoDto.serviceId,
      createPhotoDto.locationId,
      createPhotoDto.eventId,
    ].filter(Boolean).length;

    if (parentCount > 1) {
      throw new BadRequestException(
        'Photo can only be associated with one entity (service, location, or event)',
      );
    }

    // Validate parent exists and check permissions
    if (createPhotoDto.serviceId) {
      await this.validateServiceAccess(userId, userRole, createPhotoDto.serviceId);
    } else if (createPhotoDto.locationId) {
      await this.validateLocationAccess(userRole, createPhotoDto.locationId);
    } else if (createPhotoDto.eventId) {
      await this.validateEventAccess(userRole, createPhotoDto.eventId);
    }

    // If isMain is true, unset other main photos for the same parent
    if (createPhotoDto.isMain) {
      await this.unsetMainPhotos(
        createPhotoDto.serviceId,
        createPhotoDto.locationId,
        createPhotoDto.eventId,
      );
    }

    return this.prisma.photo.create({
      data: createPhotoDto,
    });
  }

  async uploadPhoto(
    userId: number,
    userRole: UserRole,
    file: Express.Multer.File,
    uploadPhotoDto: UploadPhotoDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed',
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    // TODO: Upload to cloud storage (S3, Cloudinary, etc.)
    // For now, we'll just create a placeholder URL
    // In production, you would upload the file and get the URL
    const url = `/uploads/${Date.now()}-${file.originalname}`;

    const createPhotoDto: CreatePhotoDto = {
      ...uploadPhotoDto,
      url,
    };

    return this.create(userId, userRole, createPhotoDto);
  }

  async findAll(filterDto: FilterPhotoDto) {
    const { serviceId, locationId, eventId, isMain, page = 1, limit = 50 } = filterDto;

    const where: any = {};

    if (serviceId) where.serviceId = serviceId;
    if (locationId) where.locationId = locationId;
    if (eventId) where.eventId = eventId;
    if (isMain !== undefined) where.isMain = isMain;

    const skip = (page - 1) * limit;

    const [photos, total] = await Promise.all([
      this.prisma.photo.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.photo.count({ where }),
    ]);

    return {
      data: photos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${id} not found`);
    }

    return photo;
  }

  async update(
    id: number,
    userId: number,
    userRole: UserRole,
    updatePhotoDto: UpdatePhotoDto,
  ) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
    });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${id} not found`);
    }

    // Check permissions
    if (photo.serviceId) {
      await this.validateServiceAccess(userId, userRole, photo.serviceId);
    } else if (photo.locationId) {
      await this.validateLocationAccess(userRole, photo.locationId);
    } else if (photo.eventId) {
      await this.validateEventAccess(userRole, photo.eventId);
    }

    // If setting as main, unset other main photos
    if (updatePhotoDto.isMain && !photo.isMain) {
      await this.unsetMainPhotos(photo.serviceId, photo.locationId, photo.eventId);
    }

    return this.prisma.photo.update({
      where: { id },
      data: updatePhotoDto,
    });
  }

  async setAsMain(id: number, userId: number, userRole: UserRole) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
    });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${id} not found`);
    }

    // Check permissions
    if (photo.serviceId) {
      await this.validateServiceAccess(userId, userRole, photo.serviceId);
    } else if (photo.locationId) {
      await this.validateLocationAccess(userRole, photo.locationId);
    } else if (photo.eventId) {
      await this.validateEventAccess(userRole, photo.eventId);
    }

    // Unset other main photos
    await this.unsetMainPhotos(photo.serviceId, photo.locationId, photo.eventId);

    return this.prisma.photo.update({
      where: { id },
      data: { isMain: true },
    });
  }

  async remove(id: number, userId: number, userRole: UserRole) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
    });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${id} not found`);
    }

    // Check permissions
    if (photo.serviceId) {
      await this.validateServiceAccess(userId, userRole, photo.serviceId);
    } else if (photo.locationId) {
      await this.validateLocationAccess(userRole, photo.locationId);
    } else if (photo.eventId) {
      await this.validateEventAccess(userRole, photo.eventId);
    }

    // TODO: Delete from cloud storage
    // await this.deleteFromStorage(photo.url);

    await this.prisma.photo.delete({
      where: { id },
    });

    return {
      message: 'Photo deleted successfully',
    };
  }

  // Helper methods

  private async validateServiceAccess(
    userId: number,
    userRole: UserRole,
    serviceId: number,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        supplier: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.supplier.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to manage this service');
    }

    return service;
  }

  private async validateLocationAccess(userRole: UserRole, locationId: number) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage location photos');
    }

    return location;
  }

  private async validateEventAccess(userRole: UserRole, eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage event photos');
    }

    return event;
  }

  private async unsetMainPhotos(
    serviceId?: number | null,
    locationId?: number | null,
    eventId?: number | null,
  ) {
    const where: any = { isMain: true };

    if (serviceId) {
      where.serviceId = serviceId;
    } else if (locationId) {
      where.locationId = locationId;
    } else if (eventId) {
      where.eventId = eventId;
    }

    await this.prisma.photo.updateMany({
      where,
      data: { isMain: false },
    });
  }
}