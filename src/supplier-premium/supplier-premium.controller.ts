import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtGuard } from '../guard/jwt.guard.js';
import { RolesGuard } from '../guard/roles.guard.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { UserRole } from '../../generated/prisma/client/client.js';

// Services
import { SupplierAddonService } from './services/supplier-addon.service.js';
import { ApiKeyService } from './services/api-key.service.js';
import { MarketingService } from './services/marketing.service.js';
import { SupportService } from './services/support.service.js';
import { AnalyticsProService } from './services/analytics-pro.service.js';

// DTOs
import {
  SubscribeToAddonDto,
  CreateApiKeyDto,
  UpdateApiKeyDto,
  CreatePromotedListingDto,
  UpdatePromotedListingDto,
  CreateSupportTicketDto,
  AddTicketMessageDto,
  UpdateTicketStatusDto,
} from './dto/index.js';

@ApiTags('Supplier Premium')
@Controller({ path: 'supplier-premium', version: '1' })
export class SupplierPremiumController {
  constructor(
    private readonly addonService: SupplierAddonService,
    private readonly apiKeyService: ApiKeyService,
    private readonly marketingService: MarketingService,
    private readonly supportService: SupportService,
    private readonly analyticsProService: AnalyticsProService,
  ) {}

  // ============================================
  // ADD-ON MANAGEMENT
  // ============================================

  @Get('addons/available')
  @ApiOperation({
    summary: 'Get available add-ons',
    description: 'Returns all available premium add-ons with pricing and features',
  })
  @ApiResponse({ status: 200, description: 'Available add-ons retrieved' })
  async getAvailableAddons() {
    return this.addonService.getAvailableAddons();
  }

  @Get('addons')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my add-ons',
    description: 'Returns supplier\'s active add-on subscriptions',
  })
  @ApiResponse({ status: 200, description: 'Add-ons retrieved' })
  async getMyAddons(@Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.addonService.getSupplierAddons(supplierId);
  }

  @Post('addons/subscribe')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Subscribe to add-on',
    description: 'Subscribe to a premium add-on (Analytics Pro, API Access, Marketing Suite, Commission Reduction, or Priority Support)',
  })
  @ApiResponse({ status: 201, description: 'Successfully subscribed' })
  @ApiResponse({ status: 403, description: 'Already subscribed or not a supplier' })
  async subscribeToAddon(@Body() dto: SubscribeToAddonDto, @Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.addonService.subscribeToAddon(dto, supplierId);
  }

  @Delete('addons/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel add-on',
    description: 'Cancel add-on subscription (immediate or at period end)',
  })
  @ApiParam({ name: 'id', description: 'Add-on ID' })
  @ApiResponse({ status: 200, description: 'Add-on canceled' })
  async cancelAddon(
    @Param('id', ParseIntPipe) addonId: number,
    @Body() body: { immediate?: boolean },
    @Req() req: any,
  ) {
    const supplierId = req.user.supplierId;
    return this.addonService.cancelAddon(addonId, supplierId, body.immediate);
  }

  @Get('commission-rate')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get effective commission rate',
    description: 'Returns current commission rate (15% or 10% with Commission Reduction add-on)',
  })
  @ApiResponse({ status: 200, description: 'Commission rate retrieved' })
  async getCommissionRate(@Req() req: any) {
    const supplierId = req.user.supplierId;
    const rate = await this.addonService.getEffectiveCommissionRate(supplierId);
    return { commissionRate: rate, percentage: `${(rate * 100).toFixed(0)}%` };
  }

  // ============================================
  // API KEY MANAGEMENT
  // ============================================

  @Get('api-keys')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get API keys',
    description: 'Returns supplier\'s API keys (requires API Access add-on)',
  })
  @ApiResponse({ status: 200, description: 'API keys retrieved' })
  async getApiKeys(@Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.apiKeyService.getSupplierApiKeys(supplierId);
  }

  @Post('api-keys')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create API key',
    description: 'Create new API key (requires API Access add-on)',
  })
  @ApiResponse({
    status: 201,
    description: 'API key created (returned only once!)',
  })
  @ApiResponse({ status: 403, description: 'API Access add-on required' })
  async createApiKey(@Body() dto: CreateApiKeyDto, @Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.apiKeyService.createApiKey(dto, supplierId);
  }

  @Put('api-keys/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update API key', description: 'Update API key settings' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key updated' })
  async updateApiKey(
    @Param('id', ParseIntPipe) keyId: number,
    @Body() dto: UpdateApiKeyDto,
    @Req() req: any,
  ) {
    const supplierId = req.user.supplierId;
    return this.apiKeyService.updateApiKey(keyId, dto, supplierId);
  }

  @Delete('api-keys/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete API key', description: 'Permanently delete API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 204, description: 'API key deleted' })
  async deleteApiKey(@Param('id', ParseIntPipe) keyId: number, @Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.apiKeyService.deleteApiKey(keyId, supplierId);
  }

  // ============================================
  // MARKETING SUITE (PROMOTED LISTINGS)
  // ============================================

  @Get('promotions')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get promoted listings',
    description: 'Returns supplier\'s promoted listings with performance metrics',
  })
  @ApiResponse({ status: 200, description: 'Promotions retrieved' })
  async getPromotions(@Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.marketingService.getSupplierPromotions(supplierId);
  }

  @Post('promotions')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create promoted listing',
    description: 'Promote a service with featured badge and boosted search ranking (requires Marketing Suite add-on)',
  })
  @ApiResponse({ status: 201, description: 'Promotion created' })
  @ApiResponse({ status: 403, description: 'Marketing Suite add-on required' })
  async createPromotion(@Body() dto: CreatePromotedListingDto, @Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.marketingService.createPromotedListing(dto, supplierId);
  }

  @Put('promotions/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update promotion', description: 'Update promoted listing settings' })
  @ApiParam({ name: 'id', description: 'Promotion ID' })
  @ApiResponse({ status: 200, description: 'Promotion updated' })
  async updatePromotion(
    @Param('id', ParseIntPipe) promotionId: number,
    @Body() dto: UpdatePromotedListingDto,
    @Req() req: any,
  ) {
    const supplierId = req.user.supplierId;
    return this.marketingService.updatePromotedListing(promotionId, dto, supplierId);
  }

  @Delete('promotions/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete promotion', description: 'Stop promoting a listing' })
  @ApiParam({ name: 'id', description: 'Promotion ID' })
  @ApiResponse({ status: 204, description: 'Promotion deleted' })
  async deletePromotion(@Param('id', ParseIntPipe) promotionId: number, @Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.marketingService.deletePromotedListing(promotionId, supplierId);
  }

  // ============================================
  // PRIORITY SUPPORT
  // ============================================

  @Get('support/tickets')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get support tickets',
    description: 'Returns supplier\'s support tickets',
  })
  @ApiResponse({ status: 200, description: 'Tickets retrieved' })
  async getSupportTickets(@Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.supportService.getSupplierTickets(supplierId);
  }

  @Post('support/tickets')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create support ticket',
    description: 'Create new support ticket (priority if Priority Support add-on active)',
  })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  async createSupportTicket(@Body() dto: CreateSupportTicketDto, @Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.supportService.createTicket(dto, supplierId);
  }

  @Get('support/tickets/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get ticket details', description: 'Get ticket with messages' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket retrieved' })
  async getSupportTicket(@Param('id', ParseIntPipe) ticketId: number, @Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.supportService.getTicket(ticketId, supplierId);
  }

  @Post('support/tickets/:id/messages')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add ticket message', description: 'Reply to support ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 201, description: 'Message added' })
  async addTicketMessage(
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() dto: AddTicketMessageDto,
    @Req() req: any,
  ) {
    const supplierId = req.user.supplierId;
    const userId = req.user.sub;
    return this.supportService.addMessage(ticketId, dto, supplierId, userId);
  }

  @Get('support/stats')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get support statistics',
    description: 'Returns ticket statistics by status',
  })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getSupportStats(@Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.supportService.getTicketStats(supplierId);
  }

  // ============================================
  // ANALYTICS PRO
  // ============================================

  @Get('analytics/revenue')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get revenue analytics',
    description: 'Revenue metrics, forecasting, and breakdown by service (requires Analytics Pro add-on)',
  })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved' })
  @ApiResponse({ status: 403, description: 'Analytics Pro add-on required' })
  async getRevenueAnalytics(@Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.analyticsProService.getRevenueMetrics(supplierId);
  }

  @Get('analytics/customers')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get customer analytics',
    description: 'Customer insights, behavior, and lifetime value (requires Analytics Pro add-on)',
  })
  @ApiResponse({ status: 200, description: 'Customer analytics retrieved' })
  @ApiResponse({ status: 403, description: 'Analytics Pro add-on required' })
  async getCustomerAnalytics(@Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.analyticsProService.getCustomerInsights(supplierId);
  }

  @Get('analytics/bookings')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get booking analytics',
    description: 'Booking patterns, peak times, and cancellation analysis (requires Analytics Pro add-on)',
  })
  @ApiResponse({ status: 200, description: 'Booking analytics retrieved' })
  @ApiResponse({ status: 403, description: 'Analytics Pro add-on required' })
  async getBookingAnalytics(@Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.analyticsProService.getBookingPatterns(supplierId);
  }

  @Get('analytics/benchmarks')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get competitor benchmarks',
    description: 'Compare your performance against category averages (requires Analytics Pro add-on)',
  })
  @ApiResponse({ status: 200, description: 'Benchmarks retrieved' })
  @ApiResponse({ status: 403, description: 'Analytics Pro add-on required' })
  async getCompetitorBenchmarks(@Req() req: any) {
    const supplierId = req.user.supplierId;
    return this.analyticsProService.getCompetitorBenchmarks(supplierId);
  }
}
