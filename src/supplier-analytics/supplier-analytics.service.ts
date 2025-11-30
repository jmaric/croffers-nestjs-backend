import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AnalyticsQueryDto, AnalyticsPeriod } from './dto/index.js';
import { BookingStatus } from '../../generated/prisma/client/client.js';

@Injectable()
export class SupplierAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // DASHBOARD OVERVIEW
  // ============================================

  async getDashboard(userId: number, supplierId: number) {
    await this.verifySupplierAccess(userId, supplierId);

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Revenue metrics
    const [
      totalRevenue,
      last30DaysRevenue,
      previous30DaysRevenue,
      totalCommission,
    ] = await Promise.all([
      this.prisma.booking.aggregate({
        where: {
          supplierId,
          status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
        },
        _sum: { totalAmount: true, commission: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          supplierId,
          status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
          createdAt: { gte: last30Days },
        },
        _sum: { totalAmount: true, commission: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          supplierId,
          status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
          createdAt: { gte: last60Days, lt: last30Days },
        },
        _sum: { totalAmount: true, commission: true },
      }),
      this.prisma.commission.aggregate({
        where: { supplierId },
        _sum: { amount: true },
      }),
    ]);

    // Booking metrics
    const [
      totalBookings,
      last30DaysBookings,
      upcomingBookings,
      pendingBookings,
    ] = await Promise.all([
      this.prisma.booking.count({ where: { supplierId } }),
      this.prisma.booking.count({
        where: { supplierId, createdAt: { gte: last30Days } },
      }),
      this.prisma.booking.count({
        where: {
          supplierId,
          status: BookingStatus.CONFIRMED,
          serviceDate: { gte: now },
        },
      }),
      this.prisma.booking.count({
        where: { supplierId, status: BookingStatus.PENDING },
      }),
    ]);

    // Service metrics
    const [totalServices, activeServices, totalReviews, avgTrustScore] =
      await Promise.all([
        this.prisma.service.count({ where: { supplierId } }),
        this.prisma.service.count({ where: { supplierId, isActive: true } }),
        this.prisma.review.count({
          where: {
            supplierId,
            reviewType: 'GUEST_TO_SUPPLIER',
            isPublished: true,
          },
        }),
        this.calculateSupplierTrustScore(supplierId),
      ]);

    // Calculate growth percentages
    const revenueGrowth = this.calculateGrowth(
      Number(last30DaysRevenue._sum.totalAmount || 0),
      Number(previous30DaysRevenue._sum.totalAmount || 0),
    );

    return {
      revenue: {
        total: Number(totalRevenue._sum.totalAmount || 0),
        last30Days: Number(last30DaysRevenue._sum.totalAmount || 0),
        growth: revenueGrowth,
        commission: Number(totalCommission._sum.amount || 0),
        netRevenue:
          Number(totalRevenue._sum.totalAmount || 0) -
          Number(totalCommission._sum.amount || 0),
      },
      bookings: {
        total: totalBookings,
        last30Days: last30DaysBookings,
        upcoming: upcomingBookings,
        pending: pendingBookings,
      },
      services: {
        total: totalServices,
        active: activeServices,
      },
      reviews: {
        total: totalReviews,
        avgTrustScore,
      },
    };
  }

  // ============================================
  // REVENUE ANALYTICS
  // ============================================

  async getRevenueAnalytics(
    userId: number,
    supplierId: number,
    query: AnalyticsQueryDto,
  ) {
    await this.verifySupplierAccess(userId, supplierId);

    const { startDate, endDate } = this.getDateRange(query);

    // Total revenue in period
    const revenueData = await this.prisma.booking.aggregate({
      where: {
        supplierId,
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { totalAmount: true, commission: true },
      _count: true,
    });

    // Revenue by service
    const revenueByService = await this.prisma.bookingItem.groupBy({
      by: ['serviceId'],
      where: {
        booking: {
          supplierId,
          status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      _sum: { totalPrice: true, quantity: true },
      _count: true,
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 10,
    });

    const topServices = await Promise.all(
      revenueByService.map(async (item) => {
        const service = await this.prisma.service.findUnique({
          where: { id: item.serviceId },
          select: { id: true, name: true, type: true },
        });
        return {
          service,
          revenue: Number(item._sum.totalPrice || 0),
          bookings: item._count,
          quantity: Number(item._sum.quantity || 0),
        };
      }),
    );

    // Daily revenue trend
    const dailyRevenue = await this.getDailyRevenue(
      supplierId,
      startDate,
      endDate,
    );

    return {
      period: { startDate, endDate },
      totalRevenue: Number(revenueData._sum.totalAmount || 0),
      totalCommission: Number(revenueData._sum.commission || 0),
      netRevenue:
        Number(revenueData._sum.totalAmount || 0) -
        Number(revenueData._sum.commission || 0),
      bookingCount: revenueData._count,
      avgBookingValue:
        revenueData._count > 0
          ? Number(revenueData._sum.totalAmount || 0) / revenueData._count
          : 0,
      topServices,
      dailyRevenue,
    };
  }

  // ============================================
  // BOOKING ANALYTICS
  // ============================================

  async getBookingAnalytics(
    userId: number,
    supplierId: number,
    query: AnalyticsQueryDto,
  ) {
    await this.verifySupplierAccess(userId, supplierId);

    const { startDate, endDate } = this.getDateRange(query);

    // Bookings by status
    const bookingsByStatus = await this.prisma.booking.groupBy({
      by: ['status'],
      where: {
        supplierId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    const statusBreakdown = bookingsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Cancellation rate
    const totalBookings = bookingsByStatus.reduce(
      (sum, item) => sum + item._count,
      0,
    );
    const cancelledBookings = statusBreakdown[BookingStatus.CANCELLED] || 0;
    const cancellationRate =
      totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

    // Bookings by service type
    const bookingsByServiceType = await this.prisma.booking.findMany({
      where: {
        supplierId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        bookingItems: {
          include: {
            service: { select: { type: true } },
          },
        },
      },
    });

    const serviceTypeBreakdown = bookingsByServiceType.reduce(
      (acc, booking) => {
        booking.bookingItems.forEach((item) => {
          const type = item.service.type;
          if (!acc[type]) {
            acc[type] = 0;
          }
          acc[type] += 1;
        });
        return acc;
      },
      {} as Record<string, number>,
    );

    // Average booking lead time (days between booking creation and service date)
    const confirmedBookings = await this.prisma.booking.findMany({
      where: {
        supplierId,
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, serviceDate: true },
    });

    const avgLeadTime =
      confirmedBookings.length > 0
        ? confirmedBookings.reduce((sum, booking) => {
            const leadTime =
              (booking.serviceDate.getTime() - booking.createdAt.getTime()) /
              (1000 * 60 * 60 * 24);
            return sum + leadTime;
          }, 0) / confirmedBookings.length
        : 0;

    return {
      period: { startDate, endDate },
      totalBookings,
      statusBreakdown,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      serviceTypeBreakdown,
      avgLeadTimeDays: Math.round(avgLeadTime * 10) / 10,
    };
  }

  // ============================================
  // SERVICE PERFORMANCE
  // ============================================

  async getServicePerformance(userId: number, supplierId: number) {
    await this.verifySupplierAccess(userId, supplierId);

    const services = await this.prisma.service.findMany({
      where: { supplierId },
      include: {
        reviews: {
          where: { isPublished: true, reviewType: 'GUEST_TO_SUPPLIER' },
          select: { wouldRecommend: true },
        },
        bookingItems: {
          include: {
            booking: {
              select: { status: true },
            },
          },
        },
      },
    });

    const servicePerformance = services.map((service) => {
      // Filter booking items to only completed/confirmed bookings
      const confirmedBookingItems = service.bookingItems.filter(
        (item) =>
          item.booking.status === BookingStatus.COMPLETED ||
          item.booking.status === BookingStatus.CONFIRMED,
      );

      const totalBookings = confirmedBookingItems.length;
      const totalRevenue = confirmedBookingItems.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0,
      );
      const positiveReviews = service.reviews.filter(
        (r) => r.wouldRecommend,
      ).length;
      const totalReviews = service.reviews.length;
      const trustScore =
        totalReviews > 0
          ? Math.round((positiveReviews / totalReviews) * 100)
          : 0;

      return {
        id: service.id,
        name: service.name,
        type: service.type,
        isActive: service.isActive,
        price: Number(service.price),
        bookings: totalBookings,
        revenue: totalRevenue,
        reviews: totalReviews,
        trustScore,
      };
    });

    // Sort by revenue descending
    servicePerformance.sort((a, b) => b.revenue - a.revenue);

    return {
      services: servicePerformance,
      summary: {
        totalServices: services.length,
        activeServices: services.filter((s) => s.isActive).length,
        totalRevenue: servicePerformance.reduce((sum, s) => sum + s.revenue, 0),
        avgTrustScore:
          servicePerformance.length > 0
            ? Math.round(
                servicePerformance.reduce((sum, s) => sum + s.trustScore, 0) /
                  servicePerformance.length,
              )
            : 0,
      },
    };
  }

  // ============================================
  // REVIEW ANALYTICS
  // ============================================

  async getReviewAnalytics(
    userId: number,
    supplierId: number,
    query: AnalyticsQueryDto,
  ) {
    await this.verifySupplierAccess(userId, supplierId);

    const { startDate, endDate } = this.getDateRange(query);

    const reviews = await this.prisma.review.findMany({
      where: {
        supplierId,
        reviewType: 'GUEST_TO_SUPPLIER',
        isPublished: true,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        service: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReviews = reviews.length;
    const positiveReviews = reviews.filter((r) => r.wouldRecommend).length;
    const negativeReviews = totalReviews - positiveReviews;
    const trustScore =
      totalReviews > 0
        ? Math.round((positiveReviews / totalReviews) * 100)
        : 0;

    // Reviews by tag
    const tagBreakdown = reviews.reduce(
      (acc, review) => {
        const tag = review.tag;
        if (!acc[tag]) {
          acc[tag] = { positive: 0, negative: 0 };
        }
        if (review.wouldRecommend) {
          acc[tag].positive += 1;
        } else {
          acc[tag].negative += 1;
        }
        return acc;
      },
      {} as Record<string, { positive: number; negative: number }>,
    );

    // Reviews over time (monthly)
    const reviewsByMonth = this.groupByMonth(reviews, startDate, endDate);

    return {
      period: { startDate, endDate },
      summary: {
        totalReviews,
        positiveReviews,
        negativeReviews,
        trustScore,
      },
      tagBreakdown,
      reviewsByMonth,
      recentReviews: reviews.slice(0, 10),
    };
  }

  // ============================================
  // CUSTOMER INSIGHTS
  // ============================================

  async getCustomerInsights(userId: number, supplierId: number) {
    await this.verifySupplierAccess(userId, supplierId);

    // Top customers by spending
    const topCustomers = await this.prisma.booking.groupBy({
      by: ['userId'],
      where: {
        supplierId,
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10,
    });

    const topCustomersWithDetails = await Promise.all(
      topCustomers.map(async (customer) => {
        const user = await this.prisma.user.findUnique({
          where: { id: customer.userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });
        return {
          user,
          totalSpent: Number(customer._sum.totalAmount || 0),
          bookingCount: customer._count,
        };
      }),
    );

    // Customer retention (repeat customers)
    const allCustomers = await this.prisma.booking.groupBy({
      by: ['userId'],
      where: { supplierId },
      _count: true,
    });

    const repeatCustomers = allCustomers.filter((c) => c._count > 1).length;
    const totalCustomers = allCustomers.length;
    const retentionRate =
      totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    return {
      topCustomers: topCustomersWithDetails,
      summary: {
        totalCustomers,
        repeatCustomers,
        retentionRate: Math.round(retentionRate * 100) / 100,
        avgCustomerValue:
          totalCustomers > 0
            ? topCustomersWithDetails.reduce(
                (sum, c) => sum + c.totalSpent,
                0,
              ) / totalCustomers
            : 0,
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async verifySupplierAccess(
    userId: number,
    supplierId: number,
  ): Promise<void> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { userId: true },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    if (supplier.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this supplier analytics',
      );
    }
  }

  private getDateRange(query: AnalyticsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (query.period) {
      case AnalyticsPeriod.LAST_7_DAYS:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsPeriod.LAST_30_DAYS:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsPeriod.LAST_90_DAYS:
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsPeriod.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case AnalyticsPeriod.LAST_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case AnalyticsPeriod.THIS_YEAR:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case AnalyticsPeriod.CUSTOM:
        if (query.startDate && query.endDate) {
          startDate = new Date(query.startDate);
          endDate = new Date(query.endDate);
        } else {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }

  private async calculateSupplierTrustScore(
    supplierId: number,
  ): Promise<number> {
    const reviews = await this.prisma.review.findMany({
      where: {
        supplierId,
        reviewType: 'GUEST_TO_SUPPLIER',
        isPublished: true,
      },
      select: { wouldRecommend: true },
    });

    if (reviews.length === 0) return 0;

    const positiveReviews = reviews.filter((r) => r.wouldRecommend).length;
    return Math.round((positiveReviews / reviews.length) * 100);
  }

  private async getDailyRevenue(
    supplierId: number,
    startDate: Date,
    endDate: Date,
  ) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        supplierId,
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyData = bookings.reduce(
      (acc, booking) => {
        const date = booking.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, bookings: 0 };
        }
        acc[date].revenue += Number(booking.totalAmount);
        acc[date].bookings += 1;
        return acc;
      },
      {} as Record<string, { date: string; revenue: number; bookings: number }>,
    );

    return Object.values(dailyData);
  }

  private groupByMonth(reviews: any[], startDate: Date, endDate: Date) {
    const monthlyData: Record<
      string,
      { month: string; positive: number; negative: number; total: number }
    > = {};

    reviews.forEach((review) => {
      const month = review.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { month, positive: 0, negative: 0, total: 0 };
      }
      monthlyData[month].total += 1;
      if (review.wouldRecommend) {
        monthlyData[month].positive += 1;
      } else {
        monthlyData[month].negative += 1;
      }
    });

    return Object.values(monthlyData).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }
}
