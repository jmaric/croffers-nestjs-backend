import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreatePackageDto,
  BookPackageDto,
  PackageResponseDto,
} from '../dto/package.dto.js';
import { PackageStatus } from '../../../generated/prisma/client/client.js';

@Injectable()
export class PackageService {
  private readonly logger = new Logger(PackageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new service package
   */
  async createPackage(dto: CreatePackageDto, userId: number): Promise<PackageResponseDto> {
    this.logger.log(`Creating package: ${dto.name}`);

    // Get user's supplier profile
    const supplier = await this.prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier) {
      throw new ForbiddenException('Only suppliers can create packages');
    }

    // Verify all services belong to the supplier
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: dto.services.map((s) => s.serviceId) },
      },
    });

    if (services.length !== dto.services.length) {
      throw new NotFoundException('One or more services not found');
    }

    const invalidServices = services.filter((s) => s.supplierId !== supplier.id);
    if (invalidServices.length > 0) {
      throw new BadRequestException(
        'All services must belong to your supplier account',
      );
    }

    // Calculate regular price (sum of individual services)
    const regularPrice = services.reduce((sum, service) => {
      const quantity =
        dto.services.find((s) => s.serviceId === service.id)?.quantity || 1;
      return sum + parseFloat(service.price.toString()) * quantity;
    }, 0);

    const savings = regularPrice - dto.packagePrice;

    if (savings < 0) {
      throw new BadRequestException(
        'Package price cannot be higher than regular price',
      );
    }

    // Create package
    const servicePackage = await this.prisma.servicePackage.create({
      data: {
        supplierId: supplier.id,
        name: dto.name,
        description: dto.description,
        packagePrice: dto.packagePrice,
        regularPrice,
        savings,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        maxGuests: dto.maxGuests,
        minGuests: dto.minGuests || 1,
        tags: dto.tags || [],
        imageUrl: dto.imageUrl,
        items: {
          create: dto.services.map((s, index) => ({
            serviceId: s.serviceId,
            quantity: s.quantity,
            sortOrder: index,
            isOptional: s.isOptional || false,
          })),
        },
      },
      include: {
        items: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.mapToResponseDto(servicePackage);
  }

  /**
   * Get package by ID
   */
  async getPackage(id: number): Promise<PackageResponseDto> {
    const servicePackage = await this.prisma.servicePackage.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
                price: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!servicePackage) {
      throw new NotFoundException(`Package ${id} not found`);
    }

    return this.mapToResponseDto(servicePackage);
  }

  /**
   * Search packages
   */
  async searchPackages(query?: {
    tags?: string[];
    minPrice?: number;
    maxPrice?: number;
    guests?: number;
    supplierId?: number;
  }) {
    const packages = await this.prisma.servicePackage.findMany({
      where: {
        status: PackageStatus.ACTIVE,
        ...(query?.tags && { tags: { hasSome: query.tags } }),
        ...(query?.minPrice && {
          packagePrice: { gte: query.minPrice },
        }),
        ...(query?.maxPrice && {
          packagePrice: { lte: query.maxPrice },
        }),
        ...(query?.guests && {
          minGuests: { lte: query.guests },
          OR: [{ maxGuests: { gte: query.guests } }, { maxGuests: null }],
        }),
        ...(query?.supplierId && { supplierId: query.supplierId }),
      },
      include: {
        items: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        supplier: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
      orderBy: {
        packagePrice: 'asc',
      },
    });

    return packages.map((pkg) => this.mapToResponseDto(pkg));
  }

  /**
   * Book a package
   */
  async bookPackage(dto: BookPackageDto, userId: number) {
    this.logger.log(`Booking package ${dto.packageId} for user ${userId}`);

    // Get package details
    const servicePackage = await this.prisma.servicePackage.findUnique({
      where: { id: dto.packageId },
      include: {
        items: {
          include: {
            service: true,
          },
        },
        supplier: true,
      },
    });

    if (!servicePackage) {
      throw new NotFoundException(`Package ${dto.packageId} not found`);
    }

    if (servicePackage.status !== PackageStatus.ACTIVE) {
      throw new BadRequestException('Package is not currently available');
    }

    // Check guest count
    if (dto.guests < servicePackage.minGuests) {
      throw new BadRequestException(
        `Minimum ${servicePackage.minGuests} guests required`,
      );
    }

    if (servicePackage.maxGuests && dto.guests > servicePackage.maxGuests) {
      throw new BadRequestException(
        `Maximum ${servicePackage.maxGuests} guests allowed`,
      );
    }

    // Check validity period
    const serviceDate = new Date(dto.serviceDate);
    if (servicePackage.validFrom && serviceDate < servicePackage.validFrom) {
      throw new BadRequestException(
        'Package is not valid for the selected date (too early)',
      );
    }
    if (servicePackage.validUntil && serviceDate > servicePackage.validUntil) {
      throw new BadRequestException(
        'Package is not valid for the selected date (too late)',
      );
    }

    // Calculate total amount
    let totalAmount = parseFloat(servicePackage.packagePrice.toString());

    // Add optional services if selected
    if (dto.optionalServices && dto.optionalServices.length > 0) {
      const optionalItems = servicePackage.items.filter(
        (item) => item.isOptional && dto.optionalServices!.includes(item.serviceId),
      );

      const optionalTotal = optionalItems.reduce(
        (sum, item) =>
          sum + parseFloat(item.service.price.toString()) * item.quantity,
        0,
      );

      totalAmount += optionalTotal;
    }

    // Calculate commission
    const commissionRate = servicePackage.supplier.commissionRate || 0.15;
    const commission = totalAmount * commissionRate;

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        supplierId: servicePackage.supplierId,
        packageId: servicePackage.id,
        totalAmount,
        currency: servicePackage.currency,
        commission,
        serviceDate,
        notes: dto.notes,
        bookingItems: {
          create: servicePackage.items
            .filter(
              (item) =>
                !item.isOptional ||
                (dto.optionalServices &&
                  dto.optionalServices.includes(item.serviceId)),
            )
            .map((item) => ({
              serviceId: item.serviceId,
              quantity: item.quantity,
              unitPrice: item.service.price,
              totalPrice: parseFloat(item.service.price.toString()) * item.quantity,
            })),
        },
      },
      include: {
        bookingItems: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Package booking created: ${booking.bookingReference}`);

    return {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      packageName: servicePackage.name,
      totalAmount: parseFloat(booking.totalAmount.toString()),
      currency: booking.currency,
      savings: parseFloat(servicePackage.savings.toString()),
      serviceDate: booking.serviceDate,
      services: booking.bookingItems.map((item) => ({
        id: item.service.id,
        name: item.service.name,
        type: item.service.type,
        quantity: item.quantity,
      })),
    };
  }

  /**
   * Update package
   */
  async updatePackage(id: number, dto: Partial<CreatePackageDto>, userId: number) {
    // Get package
    const servicePackage = await this.prisma.servicePackage.findUnique({
      where: { id },
      include: { supplier: true },
    });

    if (!servicePackage) {
      throw new NotFoundException(`Package ${id} not found`);
    }

    // Check ownership
    if (servicePackage.supplier.userId !== userId) {
      throw new ForbiddenException('You can only update your own packages');
    }

    // Update package
    const updated = await this.prisma.servicePackage.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.packagePrice !== undefined && {
          packagePrice: dto.packagePrice,
          savings: parseFloat(servicePackage.regularPrice.toString()) - dto.packagePrice,
        }),
        ...(dto.validFrom !== undefined && {
          validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        }),
        ...(dto.validUntil !== undefined && {
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        }),
        ...(dto.maxGuests !== undefined && { maxGuests: dto.maxGuests }),
        ...(dto.minGuests !== undefined && { minGuests: dto.minGuests }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      },
      include: {
        items: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete package
   */
  async deletePackage(id: number, userId: number) {
    const servicePackage = await this.prisma.servicePackage.findUnique({
      where: { id },
      include: { supplier: true },
    });

    if (!servicePackage) {
      throw new NotFoundException(`Package ${id} not found`);
    }

    if (servicePackage.supplier.userId !== userId) {
      throw new ForbiddenException('You can only delete your own packages');
    }

    await this.prisma.servicePackage.delete({
      where: { id },
    });

    this.logger.log(`Package ${id} deleted`);
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(pkg: any): PackageResponseDto {
    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      packagePrice: parseFloat(pkg.packagePrice.toString()),
      regularPrice: parseFloat(pkg.regularPrice.toString()),
      savings: parseFloat(pkg.savings.toString()),
      currency: pkg.currency,
      status: pkg.status,
      services: pkg.items.map((item: any) => ({
        id: item.service.id,
        name: item.service.name,
        type: item.service.type,
        quantity: item.quantity,
        isOptional: item.isOptional,
      })),
      validFrom: pkg.validFrom,
      validUntil: pkg.validUntil,
      minGuests: pkg.minGuests,
      maxGuests: pkg.maxGuests,
      tags: pkg.tags,
      imageUrl: pkg.imageUrl,
    };
  }
}
