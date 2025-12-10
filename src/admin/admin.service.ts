import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PlatformAnalyticsQueryDto,
  ModerateReviewDto,
  ResolveDisputeDto,
  UpdateCommissionDto,
  AnalyticsPeriod,
  DisputeResolution,
} from './dto/index.js';
import {
  UserStatus,
  SupplierStatus,
  BookingStatus,
  ServiceStatus,
} from '../../generated/prisma/client/client.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // PLATFORM ANALYTICS
  // ============================================

  async getDashboardAnalytics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Revenue metrics
    const [
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      totalCommission,
    ] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.commission.aggregate({
        _sum: { amount: true },
      }),
    ]);

    // Booking metrics
    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
    ] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      this.prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
    ]);

    // User metrics
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      touristCount,
      supplierUserCount,
      adminCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { status: UserStatus.INACTIVE } }),
      this.prisma.user.count({ where: { role: 'TOURIST' } }),
      this.prisma.user.count({ where: { role: 'SUPPLIER' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    // Supplier metrics
    const [
      totalSuppliers,
      approvedSuppliers,
      pendingSuppliers,
      rejectedSuppliers,
    ] = await Promise.all([
      this.prisma.supplier.count(),
      this.prisma.supplier.count({ where: { status: SupplierStatus.APPROVED } }),
      this.prisma.supplier.count({ where: { status: SupplierStatus.PENDING } }),
      this.prisma.supplier.count({ where: { status: SupplierStatus.REJECTED } }),
    ]);

    // Review metrics
    const [totalReviews, pendingReviews, publishedReviews, avgTrustScore] =
      await Promise.all([
        this.prisma.review.count(),
        this.prisma.review.count({ where: { isPublished: false } }),
        this.prisma.review.count({ where: { isPublished: true } }),
        this.calculatePlatformTrustScore(),
      ]);

    // Service metrics
    const [totalServices, activeServices, inactiveServices] = await Promise.all([
      this.prisma.service.count(),
      this.prisma.service.count({ where: { isActive: true } }),
      this.prisma.service.count({ where: { isActive: false } }),
    ]);

    return {
      revenue: {
        total: Number(totalRevenue._sum.totalAmount || 0),
        thisMonth: Number(thisMonthRevenue._sum.totalAmount || 0),
        lastMonth: Number(lastMonthRevenue._sum.totalAmount || 0),
        commission: Number(totalCommission._sum.amount || 0),
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        tourists: touristCount,
        suppliers: supplierUserCount,
        admins: adminCount,
      },
      suppliers: {
        total: totalSuppliers,
        approved: approvedSuppliers,
        pending: pendingSuppliers,
        rejected: rejectedSuppliers,
      },
      reviews: {
        total: totalReviews,
        pending: pendingReviews,
        published: publishedReviews,
        avgTrustScore,
      },
      services: {
        total: totalServices,
        active: activeServices,
        inactive: inactiveServices,
      },
    };
  }

  async getPlatformStats() {
    const [totalUsers, totalServices, totalBookings, totalRevenue, activeSuppliers, pendingServices] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.service.count({ where: { isActive: true } }),
      this.prisma.booking.count(),
      this.prisma.booking.aggregate({
        where: { status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.supplier.count({ where: { status: SupplierStatus.APPROVED } }),
      this.prisma.service.count({ where: { status: 'DRAFT' } }),
    ]);

    // Calculate recommendation rate from reviews
    const [totalReviews, recommendedReviews] = await Promise.all([
      this.prisma.review.count(),
      this.prisma.review.count({ where: { wouldRecommend: true } }),
    ]);

    const recommendationRate = totalReviews > 0
      ? Math.round((recommendedReviews / totalReviews) * 100)
      : 0;

    // Calculate growth rate (simplified - compare current month to last month users)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [currentMonthUsers, lastMonthUsers] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
    ]);

    const growthRate = lastMonthUsers > 0
      ? Math.round(((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100)
      : 0;

    return {
      totalUsers,
      activeSuppliers,
      totalServices,
      pendingServices,
      totalBookings,
      revenue: Number(totalRevenue._sum.totalAmount || 0),
      growthRate,
      recommendationRate,
    };
  }

  async getAllUsers(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(user => ({
        ...user,
        bookings: user._count.bookings,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPendingServices() {
    const services = await this.prisma.service.findMany({
      where: { status: 'DRAFT' },
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: {
          select: {
            businessName: true,
          },
        },
      },
    });

    return services;
  }

  async getAllServices(status?: string) {
    const where: any = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    const services = await this.prisma.service.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    return services;
  }

  async getAllBookings(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          bookingItems: {
            include: {
              service: {
                select: {
                  name: true,
                  supplier: {
                    select: {
                      businessName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    // Transform bookings to match frontend expectations
    const transformedBookings = bookings.map(booking => {
      const firstItem = booking.bookingItems[0];
      const guestName = `${booking.user.firstName} ${booking.user.lastName}`;
      const supplierName = firstItem?.service?.supplier?.businessName || 'N/A';
      const serviceName = firstItem?.service?.name || 'N/A';

      return {
        id: booking.id,
        guest: guestName,
        supplier: supplierName,
        service: serviceName,
        amount: Number(booking.totalAmount || 0),
        status: booking.status,
        date: booking.serviceDate.toISOString().split('T')[0],
      };
    });

    return {
      data: transformedBookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRevenueAnalytics(query: PlatformAnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    // Total revenue in period
    const revenueData = await this.prisma.booking.aggregate({
      where: {
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { totalAmount: true, commission: true },
      _count: true,
    });

    // Revenue by service type
    const revenueByType = await this.prisma.booking.findMany({
      where: {
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        bookingItems: {
          include: {
            service: { select: { type: true, price: true } },
          },
        },
      },
    });

    const typeBreakdown = revenueByType.reduce((acc, booking) => {
      booking.bookingItems.forEach((item) => {
        const type = item.service.type;
        if (!acc[type]) {
          acc[type] = { revenue: 0, count: 0 };
        }
        acc[type].revenue += Number(item.totalPrice);
        acc[type].count += 1;
      });
      return acc;
    }, {} as Record<string, { revenue: number; count: number }>);

    // Top revenue-generating suppliers
    const topSuppliers = await this.prisma.booking.groupBy({
      by: ['supplierId'],
      where: {
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { totalAmount: true, commission: true },
      _count: true,
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10,
    });

    const topSuppliersWithDetails = await Promise.all(
      topSuppliers.map(async (s) => {
        const supplier = await this.prisma.supplier.findUnique({
          where: { id: s.supplierId },
          select: { id: true, businessName: true },
        });
        return {
          ...supplier,
          revenue: Number(s._sum.totalAmount || 0),
          commission: Number(s._sum.commission || 0),
          bookings: s._count,
        };
      }),
    );

    return {
      period: { startDate, endDate },
      totalRevenue: Number(revenueData._sum.totalAmount || 0),
      totalCommission: Number(revenueData._sum.commission || 0),
      bookingCount: revenueData._count,
      byServiceType: typeBreakdown,
      topSuppliers: topSuppliersWithDetails,
    };
  }

  async getBookingAnalytics(query: PlatformAnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    // Bookings over time (daily aggregation)
    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        status: true,
        totalAmount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyBookings = bookings.reduce((acc, booking) => {
      const date = booking.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          total: 0,
          confirmed: 0,
          cancelled: 0,
          revenue: 0,
        };
      }
      acc[date].total += 1;
      if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.COMPLETED) {
        acc[date].confirmed += 1;
        acc[date].revenue += Number(booking.totalAmount);
      }
      if (booking.status === BookingStatus.CANCELLED) {
        acc[date].cancelled += 1;
      }
      return acc;
    }, {} as Record<string, any>);

    // Conversion rate (confirmed / total)
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(
      (b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED,
    ).length;
    const conversionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

    // Average booking value
    const totalRevenue = bookings
      .filter((b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const avgBookingValue = confirmedBookings > 0 ? totalRevenue / confirmedBookings : 0;

    return {
      period: { startDate, endDate },
      summary: {
        totalBookings,
        confirmedBookings,
        cancelledBookings: bookings.filter((b) => b.status === BookingStatus.CANCELLED).length,
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgBookingValue: Math.round(avgBookingValue * 100) / 100,
        totalRevenue,
      },
      daily: Object.values(dailyBookings),
    };
  }

  async getTrustScoreAnalytics() {
    // All published reviews
    const reviews = await this.prisma.review.findMany({
      where: { isPublished: true, reviewType: 'GUEST_TO_SUPPLIER' },
      select: { wouldRecommend: true, serviceId: true, supplierId: true },
    });

    const totalReviews = reviews.length;
    const positiveReviews = reviews.filter((r) => r.wouldRecommend).length;
    const platformTrustScore = totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 0;

    // Distribution of trust scores
    const suppliers = await this.prisma.supplier.findMany({
      where: { status: SupplierStatus.APPROVED },
      include: {
        reviews: {
          where: { isPublished: true, reviewType: 'GUEST_TO_SUPPLIER' },
          select: { wouldRecommend: true },
        },
      },
    });

    const supplierTrustScores = suppliers.map((supplier) => {
      const supplierReviews = supplier.reviews;
      const positive = supplierReviews.filter((r) => r.wouldRecommend).length;
      const total = supplierReviews.length;
      const trustScore = total > 0 ? (positive / total) * 100 : 0;
      return {
        supplierId: supplier.id,
        businessName: supplier.businessName,
        trustScore: Math.round(trustScore),
        reviewCount: total,
      };
    });

    // Distribution buckets
    const distribution = {
      excellent: supplierTrustScores.filter((s) => s.trustScore >= 90).length, // 90-100%
      good: supplierTrustScores.filter((s) => s.trustScore >= 70 && s.trustScore < 90).length, // 70-89%
      average: supplierTrustScores.filter((s) => s.trustScore >= 50 && s.trustScore < 70).length, // 50-69%
      poor: supplierTrustScores.filter((s) => s.trustScore < 50).length, // <50%
      noReviews: suppliers.filter((s) => s.reviews.length === 0).length,
    };

    return {
      platformTrustScore: Math.round(platformTrustScore),
      totalReviews,
      positiveReviews,
      negativeReviews: totalReviews - positiveReviews,
      distribution,
      topSuppliers: supplierTrustScores
        .filter((s) => s.reviewCount >= 5) // At least 5 reviews
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, 10),
      lowestSuppliers: supplierTrustScores
        .filter((s) => s.reviewCount >= 5)
        .sort((a, b) => a.trustScore - b.trustScore)
        .slice(0, 10),
    };
  }

  // ============================================
  // SUPPLIER MANAGEMENT
  // ============================================

  async getPendingSuppliers() {
    return this.prisma.supplier.findMany({
      where: { status: SupplierStatus.PENDING },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          },
        },
        _count: {
          select: { services: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveSupplier(id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: { status: SupplierStatus.APPROVED },
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

  async rejectSupplier(id: number, reason: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        status: SupplierStatus.REJECTED,
        // Store rejection reason in metadata or create a separate table if needed
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

  async approveService(id: number) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return this.prisma.service.update({
      where: { id },
      data: { status: ServiceStatus.ACTIVE },
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

  async rejectService(id: number, reason: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return this.prisma.service.update({
      where: { id },
      data: {
        status: ServiceStatus.INACTIVE,
        // Store rejection reason in metadata or create a separate table if needed
      },
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

  // ============================================
  // REVIEW MODERATION
  // ============================================

  async getFlaggedReviews() {
    // For now, return all unpublished reviews
    // In future, add a "flagged" field to Review model
    return this.prisma.review.findMany({
      where: {
        isPublished: false,
        publishAt: { lte: new Date() }, // Should be published but isn't
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
        service: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        supplier: {
          select: {
            id: true,
            businessName: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingReference: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderateReview(id: number, dto: ModerateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return this.prisma.review.update({
      where: { id },
      data: {
        isPublished: dto.isPublished,
        // Store moderation reason in metadata if needed
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
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // ============================================
  // BOOKING DISPUTE RESOLUTION
  // ============================================

  async getDisputedBookings() {
    // Return cancelled bookings or those with refund status
    return this.prisma.booking.findMany({
      where: {
        OR: [
          { status: BookingStatus.CANCELLED },
          { status: BookingStatus.REFUNDED },
        ],
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
        supplier: {
          select: {
            id: true,
            businessName: true,
          },
        },
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
        payments: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async resolveDispute(id: number, dto: ResolveDisputeDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    let refundAmount = 0;

    // Calculate refund amount based on resolution
    switch (dto.resolution) {
      case DisputeResolution.FULL_REFUND:
        refundAmount = Number(booking.totalAmount);
        break;
      case DisputeResolution.PARTIAL_REFUND:
        refundAmount = Number(booking.totalAmount) * ((dto.refundPercentage || 0) / 100);
        break;
      case DisputeResolution.NO_REFUND:
      case DisputeResolution.FAVOR_SUPPLIER:
      case DisputeResolution.FAVOR_GUEST:
        refundAmount = 0;
        break;
    }

    // Update booking status
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: refundAmount > 0 ? BookingStatus.REFUNDED : booking.status,
        // Store admin notes in metadata or create separate DisputeResolution table
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        supplier: { select: { id: true, businessName: true } },
      },
    });

    return {
      booking: updatedBooking,
      resolution: {
        decision: dto.resolution,
        refundAmount,
        adminNotes: dto.adminNotes,
        resolvedAt: new Date(),
      },
    };
  }

  // ============================================
  // COMMISSION MANAGEMENT
  // ============================================

  async getCommissionSummary(query: PlatformAnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const [totalCommission, thisMonthCommission, pendingPayouts] =
      await Promise.all([
        this.prisma.commission.aggregate({
          _sum: { amount: true },
        }),
        this.prisma.commission.aggregate({
          where: { createdAt: { gte: startDate, lte: endDate } },
          _sum: { amount: true },
        }),
        this.prisma.commission.aggregate({
          where: { status: 'pending' },
          _sum: { amount: true },
        }),
      ]);

    // Top suppliers by commission
    const topSuppliers = await this.prisma.commission.groupBy({
      by: ['supplierId'],
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const topSuppliersWithDetails = await Promise.all(
      topSuppliers.map(async (s) => {
        const supplier = await this.prisma.supplier.findUnique({
          where: { id: s.supplierId },
          select: { id: true, businessName: true, commissionRate: true },
        });
        return {
          ...supplier,
          totalCommission: Number(s._sum.amount || 0),
          transactionCount: s._count,
        };
      }),
    );

    return {
      totalCommission: Number(totalCommission._sum.amount || 0),
      thisMonth: Number(thisMonthCommission._sum.amount || 0),
      pendingPayouts: Number(pendingPayouts._sum.amount || 0),
      topSuppliers: topSuppliersWithDetails,
    };
  }

  async updateSupplierCommission(id: number, dto: UpdateCommissionDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: { commissionRate: dto.commissionRate },
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

  // ============================================
  // USER MANAGEMENT
  // ============================================

  async getUserOverview() {
    const [
      totalUsers,
      activeUsers,
      recentRegistrations,
      usersByRole,
      topSpenders,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.user.findMany({
        orderBy: { profile: { totalSpent: 'desc' } },
        take: 10,
        include: {
          profile: { select: { totalSpent: true, loyaltyPoints: true } },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole,
      recentRegistrations,
      topSpenders: topSpenders.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        totalSpent: u.profile?.totalSpent || 0,
        loyaltyPoints: u.profile?.loyaltyPoints || 0,
      })),
    };
  }

  async suspendUser(id: number, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });
  }

  async activateUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getDateRange(query: PlatformAnalyticsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (query.period) {
      case AnalyticsPeriod.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case AnalyticsPeriod.WEEK:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsPeriod.MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case AnalyticsPeriod.YEAR:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case AnalyticsPeriod.CUSTOM:
        if (query.startDate && query.endDate) {
          startDate = new Date(query.startDate);
          endDate = new Date(query.endDate);
        } else {
          // Default to last 30 days if custom dates not provided
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        break;
      default:
        // Default to last 30 days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private async calculatePlatformTrustScore(): Promise<number> {
    const reviews = await this.prisma.review.findMany({
      where: { isPublished: true, reviewType: 'GUEST_TO_SUPPLIER' },
      select: { wouldRecommend: true },
    });

    if (reviews.length === 0) return 0;

    const positiveReviews = reviews.filter((r) => r.wouldRecommend).length;
    return Math.round((positiveReviews / reviews.length) * 100);
  }

  // Get real revenue and user growth data for charts
  async getChartAnalytics() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Get all bookings from last 6 months
    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get all users from last 6 months
    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        createdAt: true,
        role: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const monthlyData: Record<string, {
      month: string;
      revenue: number;
      bookings: number;
      users: number;
      suppliers: number;
    }> = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });

      monthlyData[monthKey] = {
        month: monthLabel,
        revenue: 0,
        bookings: 0,
        users: 0,
        suppliers: 0,
      };
    }

    // Aggregate bookings by month
    bookings.forEach((booking) => {
      const monthKey = `${booking.createdAt.getFullYear()}-${String(booking.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].revenue += Number(booking.totalAmount);
        monthlyData[monthKey].bookings += 1;
      }
    });

    // Aggregate users by month (cumulative)
    const userCounts = { total: 0, suppliers: 0 };
    users.forEach((user) => {
      const monthKey = `${user.createdAt.getFullYear()}-${String(user.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        userCounts.total += 1;
        monthlyData[monthKey].users = userCounts.total;

        if (user.role === 'SUPPLIER') {
          userCounts.suppliers += 1;
        }
        monthlyData[monthKey].suppliers = userCounts.suppliers;
      }
    });

    // Get total counts for cumulative calculation
    const [totalUsersBefore, totalSuppliersBefore] = await Promise.all([
      this.prisma.user.count({
        where: { createdAt: { lt: sixMonthsAgo } },
      }),
      this.prisma.user.count({
        where: {
          createdAt: { lt: sixMonthsAgo },
          role: 'SUPPLIER',
        },
      }),
    ]);

    // Apply baseline to make cumulative
    let cumulativeUsers = totalUsersBefore;
    let cumulativeSuppliers = totalSuppliersBefore;

    const chartData = Object.values(monthlyData).map((data) => {
      cumulativeUsers += data.users;
      cumulativeSuppliers += data.suppliers;

      return {
        month: data.month,
        revenue: Math.round(data.revenue),
        bookings: data.bookings,
        users: cumulativeUsers,
        suppliers: cumulativeSuppliers,
      };
    });

    return chartData;
  }
}
