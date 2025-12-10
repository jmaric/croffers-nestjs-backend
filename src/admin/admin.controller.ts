import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
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
import { AdminService } from './admin.service.js';
import { JwtGuard } from '../guard/index.js';
import { RolesGuard } from '../guard/roles.guard.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { UserRole } from '../../generated/prisma/client/client.js';
import {
  PlatformAnalyticsQueryDto,
  ModerateReviewDto,
  ResolveDisputeDto,
  UpdateCommissionDto,
} from './dto/index.js';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============================================
  // PLATFORM ANALYTICS
  // ============================================

  @Get('stats')
  @ApiOperation({
    summary: 'Get platform statistics',
    description: 'Returns platform statistics for admin dashboard.',
  })
  @ApiResponse({ status: 200, description: 'Platform statistics retrieved' })
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('analytics/dashboard')
  @ApiOperation({
    summary: 'Get platform dashboard analytics',
    description:
      'Returns comprehensive platform statistics including revenue, bookings, users, suppliers, and trust scores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard analytics retrieved successfully',
    schema: {
      example: {
        revenue: {
          total: 125000,
          thisMonth: 15000,
          lastMonth: 12000,
          commission: 18750,
        },
        bookings: {
          total: 450,
          pending: 12,
          confirmed: 8,
          completed: 420,
          cancelled: 10,
        },
        users: {
          total: 850,
          active: 720,
          inactive: 130,
          tourists: 800,
          suppliers: 45,
          admins: 5,
        },
        suppliers: {
          total: 45,
          approved: 40,
          pending: 3,
          rejected: 2,
        },
        reviews: {
          total: 380,
          pending: 5,
          published: 375,
          avgTrustScore: 87,
        },
        services: {
          total: 120,
          active: 105,
          inactive: 15,
        },
      },
    },
  })
  getDashboardAnalytics() {
    return this.adminService.getDashboardAnalytics();
  }

  @Get('analytics/revenue')
  @ApiOperation({
    summary: 'Get revenue analytics',
    description:
      'Returns detailed revenue breakdown by period, service type, and commission.',
  })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved' })
  getRevenueAnalytics(@Query() query: PlatformAnalyticsQueryDto) {
    return this.adminService.getRevenueAnalytics(query);
  }

  @Get('analytics/bookings')
  @ApiOperation({
    summary: 'Get booking analytics',
    description: 'Returns booking trends over time with conversion rates.',
  })
  @ApiResponse({ status: 200, description: 'Booking analytics retrieved' })
  getBookingAnalytics(@Query() query: PlatformAnalyticsQueryDto) {
    return this.adminService.getBookingAnalytics(query);
  }

  @Get('analytics/trust-scores')
  @ApiOperation({
    summary: 'Get platform trust score analytics',
    description:
      'Returns average trust scores for suppliers and guests, distribution analysis.',
  })
  @ApiResponse({ status: 200, description: 'Trust score analytics retrieved' })
  getTrustScoreAnalytics() {
    return this.adminService.getTrustScoreAnalytics();
  }

  @Get('analytics/charts')
  @ApiOperation({
    summary: 'Get chart analytics data',
    description:
      'Returns revenue, bookings, and user growth data for the last 6 months.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chart analytics retrieved',
    schema: {
      example: [
        { month: 'Jul', revenue: 12000, bookings: 45, users: 650, suppliers: 32 },
        { month: 'Aug', revenue: 15000, bookings: 52, users: 720, suppliers: 38 },
        { month: 'Sep', revenue: 18000, bookings: 61, users: 800, suppliers: 42 },
      ],
    },
  })
  getChartAnalytics() {
    return this.adminService.getChartAnalytics();
  }

  // ============================================
  // SUPPLIER MANAGEMENT
  // ============================================

  @Get('suppliers/pending')
  @ApiOperation({
    summary: 'Get pending supplier applications',
    description: 'Returns list of suppliers awaiting approval.',
  })
  @ApiResponse({ status: 200, description: 'Pending suppliers retrieved' })
  getPendingSuppliers() {
    return this.adminService.getPendingSuppliers();
  }

  // ============================================
  // SERVICE MANAGEMENT
  // ============================================

  @Get('services/pending')
  @ApiOperation({
    summary: 'Get pending services',
    description: 'Returns list of services awaiting approval.',
  })
  @ApiResponse({ status: 200, description: 'Pending services retrieved' })
  getPendingServices() {
    return this.adminService.getPendingServices();
  }

  @Get('services')
  @ApiOperation({
    summary: 'Get all services with optional status filter',
    description: 'Returns list of all services, optionally filtered by status (DRAFT, APPROVED, REJECTED).',
  })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  getAllServices(@Query('status') status?: string) {
    return this.adminService.getAllServices(status);
  }

  @Post('services/:id/approve')
  @ApiOperation({
    summary: 'Approve service',
    description: 'Approves a service, making it active on the platform.',
  })
  @ApiParam({ name: 'id', description: 'Service ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Service approved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  approveService(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approveService(id);
  }

  @Post('services/:id/reject')
  @ApiOperation({
    summary: 'Reject service',
    description: 'Rejects a service with reason.',
  })
  @ApiParam({ name: 'id', description: 'Service ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Service rejected successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  rejectService(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
  ) {
    return this.adminService.rejectService(id, body.reason);
  }

  // ============================================
  // BOOKING MANAGEMENT
  // ============================================

  @Get('bookings')
  @ApiOperation({
    summary: 'Get all bookings with pagination',
    description: 'Returns paginated list of all bookings.',
  })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  getAllBookings(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllBookings(+page, +limit, status);
  }

  @Patch('suppliers/:id/approve')
  @ApiOperation({
    summary: 'Approve supplier application',
    description:
      'Approves a supplier application, allowing them to create services.',
  })
  @ApiParam({ name: 'id', description: 'Supplier ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Supplier approved successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  approveSupplier(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approveSupplier(id);
  }

  @Patch('suppliers/:id/reject')
  @ApiOperation({
    summary: 'Reject supplier application',
    description: 'Rejects a supplier application with reason.',
  })
  @ApiParam({ name: 'id', description: 'Supplier ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Supplier rejected successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  rejectSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
  ) {
    return this.adminService.rejectSupplier(id, body.reason);
  }

  // ============================================
  // REVIEW MODERATION
  // ============================================

  @Get('reviews/flagged')
  @ApiOperation({
    summary: 'Get flagged reviews for moderation',
    description: 'Returns list of reviews flagged for moderation (future feature).',
  })
  @ApiResponse({ status: 200, description: 'Flagged reviews retrieved' })
  getFlaggedReviews() {
    return this.adminService.getFlaggedReviews();
  }

  @Patch('reviews/:id/moderate')
  @ApiOperation({
    summary: 'Moderate a review',
    description:
      'Admin can hide/unhide reviews or mark them as inappropriate.',
  })
  @ApiParam({ name: 'id', description: 'Review ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Review moderated successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  moderateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.adminService.moderateReview(id, dto);
  }

  // ============================================
  // BOOKING DISPUTE RESOLUTION
  // ============================================

  @Get('bookings/disputes')
  @ApiOperation({
    summary: 'Get bookings with disputes',
    description:
      'Returns list of cancelled bookings or those flagged for dispute resolution.',
  })
  @ApiResponse({ status: 200, description: 'Disputed bookings retrieved' })
  getDisputedBookings() {
    return this.adminService.getDisputedBookings();
  }

  @Post('bookings/:id/resolve-dispute')
  @ApiOperation({
    summary: 'Resolve booking dispute',
    description:
      'Admin resolves a booking dispute by issuing refunds or taking other actions.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Dispute resolved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  resolveDispute(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.adminService.resolveDispute(id, dto);
  }

  // ============================================
  // COMMISSION MANAGEMENT
  // ============================================

  @Get('commissions/summary')
  @ApiOperation({
    summary: 'Get commission summary',
    description:
      'Returns total commissions earned, pending payouts, and supplier breakdowns.',
  })
  @ApiResponse({
    status: 200,
    description: 'Commission summary retrieved',
    schema: {
      example: {
        totalCommission: 18750,
        thisMonth: 2500,
        pendingPayouts: 5000,
        topSuppliers: [
          { id: 1, businessName: 'ABC Tours', commission: 3500 },
          { id: 2, businessName: 'XYZ Hotels', commission: 2800 },
        ],
      },
    },
  })
  getCommissionSummary(@Query() query: PlatformAnalyticsQueryDto) {
    return this.adminService.getCommissionSummary(query);
  }

  @Patch('suppliers/:id/commission')
  @ApiOperation({
    summary: 'Update supplier commission rate',
    description:
      'Updates the commission rate for a specific supplier (affects future bookings).',
  })
  @ApiParam({ name: 'id', description: 'Supplier ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Commission rate updated' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  updateSupplierCommission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommissionDto,
  ) {
    return this.adminService.updateSupplierCommission(id, dto);
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  @Get('users')
  @ApiOperation({
    summary: 'Get all users with pagination',
    description: 'Returns paginated list of all users.',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllUsers(+page, +limit, status);
  }

  @Get('users/overview')
  @ApiOperation({
    summary: 'Get user overview',
    description: 'Returns user statistics and recent registrations.',
  })
  @ApiResponse({ status: 200, description: 'User overview retrieved' })
  getUserOverview() {
    return this.adminService.getUserOverview();
  }

  @Patch('users/:id/suspend')
  @ApiOperation({
    summary: 'Suspend user account',
    description: 'Suspends a user account (sets status to INACTIVE).',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
  ) {
    return this.adminService.suspendUser(id, body.reason);
  }

  @Patch('users/:id/activate')
  @ApiOperation({
    summary: 'Activate user account',
    description: 'Reactivates a suspended user account.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  activateUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.activateUser(id);
  }
}
