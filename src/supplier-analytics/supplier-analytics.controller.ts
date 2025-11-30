import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SupplierAnalyticsService } from './supplier-analytics.service.js';
import { JwtGuard } from '../guard/index.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { AnalyticsQueryDto } from './dto/index.js';

@ApiTags('Supplier Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtGuard)
@Controller('supplier-analytics')
export class SupplierAnalyticsController {
  constructor(
    private readonly supplierAnalyticsService: SupplierAnalyticsService,
  ) {}

  @Get(':supplierId/dashboard')
  @ApiOperation({
    summary: 'Get supplier dashboard overview',
    description:
      'Returns comprehensive dashboard analytics including revenue, bookings, services, and reviews for the supplier.',
  })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Dashboard analytics retrieved successfully',
    schema: {
      example: {
        revenue: {
          total: 85000,
          last30Days: 12000,
          growth: 15.5,
          commission: 12750,
          netRevenue: 72250,
        },
        bookings: {
          total: 156,
          last30Days: 23,
          upcoming: 8,
          pending: 3,
        },
        services: {
          total: 12,
          active: 10,
        },
        reviews: {
          total: 89,
          avgTrustScore: 92,
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  getDashboard(
    @GetUser('id') userId: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
  ) {
    return this.supplierAnalyticsService.getDashboard(userId, supplierId);
  }

  @Get(':supplierId/revenue')
  @ApiOperation({
    summary: 'Get revenue analytics',
    description:
      'Returns detailed revenue analytics including total revenue, net revenue, top services, and daily trends.',
  })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Revenue analytics retrieved',
  })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  getRevenueAnalytics(
    @GetUser('id') userId: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.supplierAnalyticsService.getRevenueAnalytics(
      userId,
      supplierId,
      query,
    );
  }

  @Get(':supplierId/bookings')
  @ApiOperation({
    summary: 'Get booking analytics',
    description:
      'Returns booking statistics including status breakdown, cancellation rate, and service type distribution.',
  })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Booking analytics retrieved',
  })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  getBookingAnalytics(
    @GetUser('id') userId: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.supplierAnalyticsService.getBookingAnalytics(
      userId,
      supplierId,
      query,
    );
  }

  @Get(':supplierId/services')
  @ApiOperation({
    summary: 'Get service performance analytics',
    description:
      'Returns performance metrics for all services including bookings, revenue, and trust scores.',
  })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Service performance retrieved',
    schema: {
      example: {
        services: [
          {
            id: 1,
            name: 'Boat Tour - Blue Cave',
            type: 'TOUR',
            isActive: true,
            price: 120,
            bookings: 45,
            revenue: 5400,
            reviews: 38,
            trustScore: 95,
          },
        ],
        summary: {
          totalServices: 12,
          activeServices: 10,
          totalRevenue: 85000,
          avgTrustScore: 92,
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  getServicePerformance(
    @GetUser('id') userId: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
  ) {
    return this.supplierAnalyticsService.getServicePerformance(
      userId,
      supplierId,
    );
  }

  @Get(':supplierId/reviews')
  @ApiOperation({
    summary: 'Get review analytics',
    description:
      'Returns review statistics including trust score, tag breakdown, and review trends over time.',
  })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Review analytics retrieved',
  })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  getReviewAnalytics(
    @GetUser('id') userId: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.supplierAnalyticsService.getReviewAnalytics(
      userId,
      supplierId,
      query,
    );
  }

  @Get(':supplierId/customers')
  @ApiOperation({
    summary: 'Get customer insights',
    description:
      'Returns customer analytics including top customers, retention rate, and customer lifetime value.',
  })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Customer insights retrieved',
    schema: {
      example: {
        topCustomers: [
          {
            user: {
              id: 5,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
            totalSpent: 2500,
            bookingCount: 8,
          },
        ],
        summary: {
          totalCustomers: 124,
          repeatCustomers: 45,
          retentionRate: 36.29,
          avgCustomerValue: 685.48,
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  getCustomerInsights(
    @GetUser('id') userId: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
  ) {
    return this.supplierAnalyticsService.getCustomerInsights(
      userId,
      supplierId,
    );
  }
}
