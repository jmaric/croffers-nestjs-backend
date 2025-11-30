import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  FilterSupplierDto,
  ApproveSupplierDto,
} from './dto/index.js';
import { SupplierStatus, UserRole } from '../../generated/prisma/client/client.js';

@Injectable()
export class SuppliersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async create(userId: number, createSupplierDto: CreateSupplierDto) {
    // Check if user exists and has SUPPLIER role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.SUPPLIER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only users with SUPPLIER role can create supplier profiles');
    }

    // Check if user already has a supplier profile
    const existingSupplier = await this.prisma.supplier.findFirst({
      where: { userId },
    });

    if (existingSupplier) {
      throw new BadRequestException('User already has a supplier profile');
    }

    return this.prisma.supplier.create({
      data: {
        userId,
        ...createSupplierDto,
        status: SupplierStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(filterDto: FilterSupplierDto) {
    const { status, subscriptionTier, search, page = 1, limit = 10 } = filterDto;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (subscriptionTier) {
      where.subscriptionTier = subscriptionTier;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { registrationNum: { contains: search, mode: 'insensitive' } },
        { vatNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              services: true,
              bookings: true,
              reviews: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
          },
        },
        services: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            type: true,
            name: true,
            price: true,
            currency: true,
            status: true,
            isActive: true,
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
            services: true,
            bookings: true,
            reviews: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async findByUserId(userId: number) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            services: true,
            bookings: true,
            reviews: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier profile not found for this user');
    }

    return supplier;
  }

  async update(id: number, userId: number, userRole: UserRole, updateSupplierDto: UpdateSupplierDto) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Only the owner or admin can update
    if (supplier.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this supplier profile');
    }

    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async updateStatus(id: number, approveSupplierDto: ApproveSupplierDto) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        status: approveSupplierDto.status,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Send email notification
    if (approveSupplierDto.status === SupplierStatus.APPROVED) {
      await this.mailService.sendSupplierApproval(updated);
    } else if (approveSupplierDto.status === SupplierStatus.REJECTED) {
      await this.mailService.sendSupplierRejection(
        updated,
        approveSupplierDto.notes || 'Your application did not meet our requirements',
      );
    }

    return updated;
  }

  async remove(id: number, userId: number, userRole: UserRole) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            services: true,
            bookings: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Only the owner or admin can delete
    if (supplier.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this supplier profile');
    }

    // Check if supplier has active services
    if (supplier._count.services > 0) {
      throw new BadRequestException(
        'Cannot delete supplier with active services. Delete services first.',
      );
    }

    // Check if supplier has bookings
    if (supplier._count.bookings > 0) {
      throw new BadRequestException(
        'Cannot delete supplier with existing bookings.',
      );
    }

    await this.prisma.supplier.delete({
      where: { id },
    });

    return {
      message: 'Supplier profile deleted successfully',
    };
  }

  async getDashboard(userId: number) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier profile not found');
    }

    const [
      totalServices,
      activeServices,
      totalBookings,
      pendingBookings,
      completedBookings,
      totalRevenue,
      totalCommission,
      reviewCount,
      positiveReviews,
    ] = await Promise.all([
      this.prisma.service.count({
        where: { supplierId: supplier.id },
      }),
      this.prisma.service.count({
        where: { supplierId: supplier.id, isActive: true },
      }),
      this.prisma.booking.count({
        where: { supplierId: supplier.id },
      }),
      this.prisma.booking.count({
        where: { supplierId: supplier.id, status: 'PENDING' },
      }),
      this.prisma.booking.count({
        where: { supplierId: supplier.id, status: 'COMPLETED' },
      }),
      this.prisma.booking.aggregate({
        where: { supplierId: supplier.id, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      this.prisma.booking.aggregate({
        where: { supplierId: supplier.id, status: 'COMPLETED' },
        _sum: { commission: true },
      }),
      this.prisma.review.count({
        where: { supplierId: supplier.id, isPublished: true },
      }),
      this.prisma.review.count({
        where: { supplierId: supplier.id, isPublished: true, wouldRecommend: true },
      }),
    ]);

    // Calculate trust score (% of guests who would stay again)
    const trustScore = reviewCount > 0 ? Math.round((positiveReviews / reviewCount) * 100) : null;

    return {
      supplier: {
        id: supplier.id,
        businessName: supplier.businessName,
        status: supplier.status,
        subscriptionTier: supplier.subscriptionTier,
        commissionRate: supplier.commissionRate,
      },
      stats: {
        services: {
          total: totalServices,
          active: activeServices,
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          completed: completedBookings,
        },
        revenue: {
          total: Number(totalRevenue._sum.totalAmount || 0),
          commission: Number(totalCommission._sum.commission || 0),
          net: Number(totalRevenue._sum.totalAmount || 0) - Number(totalCommission._sum.commission || 0),
        },
        reviews: {
          count: reviewCount,
          trustScore,
          positiveReviews,
        },
      },
    };
  }
}