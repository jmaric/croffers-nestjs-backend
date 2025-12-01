import {
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SupplierAddonType } from '../../../generated/prisma/client/client.js';
import { SupplierAddonService } from './supplier-addon.service.js';

export interface RevenueMetrics {
  totalRevenue: number;
  projectedRevenue: number;
  revenueGrowth: number;
  averageBookingValue: number;
  revenueByService: {
    serviceId: number;
    serviceName: string;
    revenue: number;
    percentage: number;
  }[];
  monthlyRevenue: {
    month: string;
    revenue: number;
    bookings: number;
  }[];
}

export interface CustomerInsights {
  totalCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  averageCustomerLifetimeValue: number;
  topCustomers: {
    userId: number;
    userName: string;
    totalSpent: number;
    bookingCount: number;
  }[];
  customerAcquisitionByMonth: {
    month: string;
    newCustomers: number;
  }[];
}

export interface BookingPatterns {
  totalBookings: number;
  averageLeadTime: number; // Days between booking and service date
  peakBookingHours: {
    hour: number;
    bookings: number;
  }[];
  peakBookingDays: {
    dayOfWeek: string;
    bookings: number;
  }[];
  cancellationRate: number;
  averageGroupSize: number;
}

export interface CompetitorBenchmarks {
  yourAverageRating: number;
  categoryAverageRating: number;
  yourAveragePrice: number;
  categoryAveragePrice: number;
  yourBookingRate: number;
  categoryBookingRate: number;
  marketPosition: string; // "Above Average", "Average", "Below Average"
}

@Injectable()
export class AnalyticsProService {
  private readonly logger = new Logger(AnalyticsProService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly addonService: SupplierAddonService,
  ) {}

  /**
   * Check if supplier has Analytics Pro access
   */
  private async checkAccess(supplierId: number) {
    const hasAnalyticsPro = await this.addonService.hasAddon(
      supplierId,
      SupplierAddonType.ANALYTICS_PRO,
    );

    if (!hasAnalyticsPro) {
      throw new ForbiddenException(
        'Analytics Pro add-on required. Subscribe to Analytics Pro (€29/month) for advanced analytics.',
      );
    }
  }

  /**
   * Get revenue metrics and forecasting
   */
  async getRevenueMetrics(supplierId: number): Promise<RevenueMetrics> {
    await this.checkAccess(supplierId);

    this.logger.log(`Fetching revenue metrics for supplier ${supplierId}`);

    // Get all confirmed bookings
    const bookings = await this.prisma.booking.findMany({
      where: {
        supplierId,
        status: 'CONFIRMED',
      },
      include: {
        bookingItems: {
          include: {
            service: true,
          },
        },
      },
    });

    const totalRevenue = bookings.reduce(
      (sum, b) => sum + parseFloat(b.totalAmount.toString()),
      0,
    );

    const averageBookingValue =
      bookings.length > 0 ? totalRevenue / bookings.length : 0;

    // Calculate revenue by service
    const serviceRevenueMap = new Map<number, { name: string; revenue: number }>();

    bookings.forEach((booking) => {
      booking.bookingItems.forEach((item) => {
        const current = serviceRevenueMap.get(item.serviceId) || {
          name: item.service.name,
          revenue: 0,
        };
        current.revenue += parseFloat(item.unitPrice.toString()) * item.quantity;
        serviceRevenueMap.set(item.serviceId, current);
      });
    });

    const revenueByService = Array.from(serviceRevenueMap.entries()).map(
      ([serviceId, data]) => ({
        serviceId,
        serviceName: data.name,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }),
    );

    // Monthly revenue for last 12 months
    const monthlyRevenue = this.calculateMonthlyRevenue(bookings);

    // Simple revenue growth calculation (last month vs previous month)
    const revenueGrowth = this.calculateRevenueGrowth(monthlyRevenue);

    // Simple forecast (average of last 3 months)
    const projectedRevenue = this.forecastRevenue(monthlyRevenue);

    return {
      totalRevenue,
      projectedRevenue,
      revenueGrowth,
      averageBookingValue,
      revenueByService: revenueByService.sort((a, b) => b.revenue - a.revenue),
      monthlyRevenue: monthlyRevenue.slice(-12),
    };
  }

  /**
   * Get customer insights and behavior
   */
  async getCustomerInsights(supplierId: number): Promise<CustomerInsights> {
    await this.checkAccess(supplierId);

    this.logger.log(`Fetching customer insights for supplier ${supplierId}`);

    // Get all customers who booked with this supplier
    const bookings = await this.prisma.booking.findMany({
      where: {
        supplierId,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Calculate customer metrics
    const customerBookings = new Map<
      number,
      { name: string; totalSpent: number; count: number }
    >();

    bookings.forEach((booking) => {
      const userId = booking.userId;
      const current = customerBookings.get(userId) || {
        name: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim(),
        totalSpent: 0,
        count: 0,
      };

      current.totalSpent += parseFloat(booking.totalAmount.toString());
      current.count += 1;

      customerBookings.set(userId, current);
    });

    const totalCustomers = customerBookings.size;
    const repeatCustomers = Array.from(customerBookings.values()).filter(
      (c) => c.count > 1,
    ).length;
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    const totalSpent = Array.from(customerBookings.values()).reduce(
      (sum, c) => sum + c.totalSpent,
      0,
    );
    const averageCustomerLifetimeValue =
      totalCustomers > 0 ? totalSpent / totalCustomers : 0;

    const topCustomers = Array.from(customerBookings.entries())
      .map(([userId, data]) => ({
        userId,
        userName: data.name,
        totalSpent: data.totalSpent,
        bookingCount: data.count,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Customer acquisition by month
    const customerAcquisitionByMonth = this.calculateCustomerAcquisition(bookings);

    return {
      totalCustomers,
      repeatCustomers,
      repeatRate,
      averageCustomerLifetimeValue,
      topCustomers,
      customerAcquisitionByMonth: customerAcquisitionByMonth.slice(-12),
    };
  }

  /**
   * Get booking patterns analysis
   */
  async getBookingPatterns(supplierId: number): Promise<BookingPatterns> {
    await this.checkAccess(supplierId);

    this.logger.log(`Fetching booking patterns for supplier ${supplierId}`);

    const bookings = await this.prisma.booking.findMany({
      where: { supplierId },
    });

    const totalBookings = bookings.length;

    // Calculate average lead time
    const leadTimes = bookings
      .filter((b) => b.serviceDate)
      .map((b) => {
        const daysDiff = Math.floor(
          (b.serviceDate!.getTime() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysDiff;
      });
    const averageLeadTime =
      leadTimes.length > 0
        ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
        : 0;

    // Peak booking hours
    const hourCounts = new Map<number, number>();
    bookings.forEach((b) => {
      const hour = b.createdAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const peakBookingHours = Array.from(hourCounts.entries())
      .map(([hour, bookings]) => ({ hour, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    // Peak booking days
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Map<number, number>();
    bookings.forEach((b) => {
      const day = b.createdAt.getDay();
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    const peakBookingDays = Array.from(dayCounts.entries())
      .map(([day, bookings]) => ({ dayOfWeek: dayNames[day], bookings }))
      .sort((a, b) => b.bookings - a.bookings);

    // Cancellation rate
    const canceledBookings = bookings.filter((b) => b.status === 'CANCELLED').length;
    const cancellationRate =
      totalBookings > 0 ? (canceledBookings / totalBookings) * 100 : 0;

    // Average group size
    const totalGuests = bookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
    const averageGroupSize = totalBookings > 0 ? totalGuests / totalBookings : 0;

    return {
      totalBookings,
      averageLeadTime: Math.round(averageLeadTime),
      peakBookingHours,
      peakBookingDays,
      cancellationRate,
      averageGroupSize,
    };
  }

  /**
   * Get competitor benchmarks
   */
  async getCompetitorBenchmarks(supplierId: number): Promise<CompetitorBenchmarks> {
    await this.checkAccess(supplierId);

    this.logger.log(`Fetching competitor benchmarks for supplier ${supplierId}`);

    // Get supplier's services
    const supplierServices = await this.prisma.service.findMany({
      where: { supplierId },
      include: {
        reviews: true,
      },
    });

    if (supplierServices.length === 0) {
      throw new ForbiddenException('No services found for benchmarking');
    }

    // Calculate your average rating (using wouldRecommend as rating percentage)
    let totalRecommendations = 0;
    let ratingCount = 0;
    supplierServices.forEach((service) => {
      service.reviews.forEach((review) => {
        if (review.wouldRecommend) totalRecommendations++;
        ratingCount++;
      });
    });
    const yourAverageRating = ratingCount > 0 ? (totalRecommendations / ratingCount) * 5 : 0;

    // Calculate your average price
    const totalPrice = supplierServices.reduce(
      (sum, s) => sum + parseFloat(s.price.toString()),
      0,
    );
    const yourAveragePrice = totalPrice / supplierServices.length;

    // Get service type for comparison
    const serviceType = supplierServices[0].type;

    // Get category benchmarks (all services of same type)
    const categoryServices = await this.prisma.service.findMany({
      where: {
        type: serviceType,
        supplierId: { not: supplierId },
        isActive: true,
      },
      include: {
        reviews: true,
        bookingItems: true,
      },
    });

    // Calculate category averages (using wouldRecommend as rating percentage)
    let categoryTotalRecommendations = 0;
    let categoryRatingCount = 0;
    categoryServices.forEach((service) => {
      service.reviews.forEach((review) => {
        if (review.wouldRecommend) categoryTotalRecommendations++;
        categoryRatingCount++;
      });
    });
    const categoryAverageRating =
      categoryRatingCount > 0 ? (categoryTotalRecommendations / categoryRatingCount) * 5 : 0;

    const categoryTotalPrice = categoryServices.reduce(
      (sum, s) => sum + parseFloat(s.price.toString()),
      0,
    );
    const categoryAveragePrice =
      categoryServices.length > 0 ? categoryTotalPrice / categoryServices.length : 0;

    // Simplified booking rate calculation
    const yourBookings = await this.prisma.booking.count({
      where: { supplierId, status: 'CONFIRMED' },
    });
    const yourBookingRate = supplierServices.length > 0 ? yourBookings / supplierServices.length : 0;

    const categoryBookings = categoryServices.reduce(
      (sum, s) => sum + s.bookingItems.length,
      0,
    );
    const categoryBookingRate =
      categoryServices.length > 0 ? categoryBookings / categoryServices.length : 0;

    // Determine market position
    let marketPosition = 'Average';
    const score =
      (yourAverageRating > categoryAverageRating ? 1 : 0) +
      (yourBookingRate > categoryBookingRate ? 1 : 0);

    if (score >= 2) {
      marketPosition = 'Above Average';
    } else if (score === 0) {
      marketPosition = 'Below Average';
    }

    return {
      yourAverageRating: Math.round(yourAverageRating * 10) / 10,
      categoryAverageRating: Math.round(categoryAverageRating * 10) / 10,
      yourAveragePrice: Math.round(yourAveragePrice * 100) / 100,
      categoryAveragePrice: Math.round(categoryAveragePrice * 100) / 100,
      yourBookingRate: Math.round(yourBookingRate * 10) / 10,
      categoryBookingRate: Math.round(categoryBookingRate * 10) / 10,
      marketPosition,
    };
  }

  /**
   * Helper: Calculate monthly revenue
   */
  private calculateMonthlyRevenue(bookings: any[]) {
    const monthlyMap = new Map<string, { revenue: number; bookings: number }>();

    bookings.forEach((booking) => {
      const month = booking.createdAt.toISOString().slice(0, 7); // YYYY-MM
      const current = monthlyMap.get(month) || { revenue: 0, bookings: 0 };
      current.revenue += parseFloat(booking.totalAmount.toString());
      current.bookings += 1;
      monthlyMap.set(month, current);
    });

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        bookings: data.bookings,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Helper: Calculate revenue growth
   */
  private calculateRevenueGrowth(monthlyRevenue: any[]): number {
    if (monthlyRevenue.length < 2) return 0;

    const lastMonth = monthlyRevenue[monthlyRevenue.length - 1].revenue;
    const previousMonth = monthlyRevenue[monthlyRevenue.length - 2].revenue;

    if (previousMonth === 0) return 0;

    return ((lastMonth - previousMonth) / previousMonth) * 100;
  }

  /**
   * Helper: Forecast revenue (simple 3-month average)
   */
  private forecastRevenue(monthlyRevenue: any[]): number {
    if (monthlyRevenue.length === 0) return 0;

    const last3Months = monthlyRevenue.slice(-3);
    const avgRevenue =
      last3Months.reduce((sum, m) => sum + m.revenue, 0) / last3Months.length;

    return avgRevenue;
  }

  /**
   * Helper: Calculate customer acquisition by month
   */
  private calculateCustomerAcquisition(bookings: any[]) {
    const firstBookingMap = new Map<number, string>();

    bookings.forEach((booking) => {
      const userId = booking.userId;
      const month = booking.createdAt.toISOString().slice(0, 7);

      if (!firstBookingMap.has(userId)) {
        firstBookingMap.set(userId, month);
      }
    });

    const acquisitionMap = new Map<string, number>();
    firstBookingMap.forEach((month) => {
      acquisitionMap.set(month, (acquisitionMap.get(month) || 0) + 1);
    });

    return Array.from(acquisitionMap.entries())
      .map(([month, newCustomers]) => ({ month, newCustomers }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}
