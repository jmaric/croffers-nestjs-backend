import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtGuard } from '../guard/jwt.guard.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { GroupBookingService } from './services/group-booking.service.js';
import { PackageService } from './services/package.service.js';
import { PriceAlertService } from './services/price-alert.service.js';
import { BookingModificationService } from './services/booking-modification.service.js';
import * as dto from './dto/index.js';

@ApiTags('Advanced Booking')
@Controller({ path: 'advanced-booking', version: '1' })
export class AdvancedBookingController {
  constructor(
    private readonly groupBookingService: GroupBookingService,
    private readonly packageService: PackageService,
    private readonly priceAlertService: PriceAlertService,
    private readonly bookingModificationService: BookingModificationService,
  ) {}

  // ============================================
  // GROUP BOOKING ENDPOINTS
  // ============================================

  @Post('group/quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get quote for group booking',
    description:
      'Calculate pricing and discounts for group booking (10+ people). Returns discount tiers: 10-19 (10%), 20-29 (15%), 30-49 (20%), 50+ (25%)',
  })
  @ApiResponse({
    status: 200,
    description: 'Quote calculated successfully',
    type: dto.GroupBookingQuoteResponseDto,
  })
  async getGroupQuote(@Body() quoteDto: dto.GroupBookingQuoteDto) {
    return this.groupBookingService.getGroupQuote(quoteDto);
  }

  @Post('group')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create group booking',
    description:
      'Create a group booking with automatic discounts based on group size',
  })
  @ApiResponse({
    status: 201,
    description: 'Group booking created successfully',
  })
  async createGroupBooking(
    @GetUser('sub') userId: number,
    @Body() bookingDto: dto.CreateGroupBookingDto,
  ) {
    return this.groupBookingService.createGroupBooking(bookingDto, userId);
  }

  @Get('group/my-bookings')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user group bookings',
    description: 'Retrieve all group bookings for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Group bookings retrieved successfully',
  })
  async getUserGroupBookings(@GetUser('sub') userId: number) {
    return this.groupBookingService.getUserGroupBookings(userId);
  }

  // ============================================
  // PACKAGE ENDPOINTS
  // ============================================

  @Post('packages')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create service package',
    description:
      'Create a multi-service package (e.g., accommodation + ferry + tour). Suppliers only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Package created successfully',
    type: dto.PackageResponseDto,
  })
  async createPackage(
    @GetUser('sub') userId: number,
    @Body() packageDto: dto.CreatePackageDto,
  ) {
    return this.packageService.createPackage(packageDto, userId);
  }

  @Get('packages/search')
  @ApiOperation({
    summary: 'Search packages',
    description: 'Search for service packages with filters',
  })
  @ApiQuery({ name: 'tags', required: false, example: 'summer,adventure' })
  @ApiQuery({ name: 'minPrice', required: false, example: 100 })
  @ApiQuery({ name: 'maxPrice', required: false, example: 500 })
  @ApiQuery({ name: 'guests', required: false, example: 4 })
  @ApiQuery({ name: 'supplierId', required: false, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Packages found',
    type: [dto.PackageResponseDto],
  })
  async searchPackages(
    @Query('tags') tags?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('guests') guests?: number,
    @Query('supplierId') supplierId?: number,
  ) {
    return this.packageService.searchPackages({
      tags: tags ? tags.split(',') : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      guests: guests ? Number(guests) : undefined,
      supplierId: supplierId ? Number(supplierId) : undefined,
    });
  }

  @Get('packages/:id')
  @ApiOperation({
    summary: 'Get package by ID',
    description: 'Retrieve detailed information about a package',
  })
  @ApiParam({ name: 'id', description: 'Package ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Package found',
    type: dto.PackageResponseDto,
  })
  async getPackage(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.getPackage(id);
  }

  @Post('packages/book')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Book a package',
    description: 'Book a service package with optional add-ons',
  })
  @ApiResponse({
    status: 201,
    description: 'Package booked successfully',
  })
  async bookPackage(
    @GetUser('sub') userId: number,
    @Body() bookDto: dto.BookPackageDto,
  ) {
    return this.packageService.bookPackage(bookDto, userId);
  }

  @Put('packages/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update package',
    description: 'Update package details (supplier only)',
  })
  @ApiParam({ name: 'id', description: 'Package ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Package updated successfully',
  })
  async updatePackage(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Partial<dto.CreatePackageDto>,
  ) {
    return this.packageService.updatePackage(id, updateDto, userId);
  }

  @Delete('packages/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete package',
    description: 'Delete a package (supplier only)',
  })
  @ApiParam({ name: 'id', description: 'Package ID', example: 1 })
  @ApiResponse({
    status: 204,
    description: 'Package deleted successfully',
  })
  async deletePackage(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.packageService.deletePackage(id, userId);
  }

  // ============================================
  // PRICE ALERT & FLEXIBLE SEARCH ENDPOINTS
  // ============================================

  @Post('price-alerts')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create price alert',
    description:
      'Set up a price alert to be notified when prices drop below a target or by a percentage',
  })
  @ApiResponse({
    status: 201,
    description: 'Price alert created successfully',
  })
  async createPriceAlert(
    @GetUser('sub') userId: number,
    @Body() alertDto: dto.CreatePriceAlertDto,
  ) {
    return this.priceAlertService.createPriceAlert(alertDto, userId);
  }

  @Get('price-alerts')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user price alerts',
    description: 'Retrieve all price alerts for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Price alerts retrieved successfully',
  })
  async getUserAlerts(@GetUser('sub') userId: number) {
    return this.priceAlertService.getUserAlerts(userId);
  }

  @Delete('price-alerts/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete price alert',
    description: 'Remove a price alert',
  })
  @ApiParam({ name: 'id', description: 'Alert ID', example: 1 })
  @ApiResponse({
    status: 204,
    description: 'Price alert deleted successfully',
  })
  async deleteAlert(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.priceAlertService.deleteAlert(id, userId);
  }

  @Post('flexible-search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Flexible date search',
    description:
      'Search for best prices across a date range. Returns cheapest dates, price comparison, and crowd levels.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    type: dto.FlexibleDateSearchResponseDto,
  })
  async flexibleDateSearch(@Body() searchDto: dto.FlexibleDateSearchDto) {
    return this.priceAlertService.flexibleDateSearch(searchDto);
  }

  // ============================================
  // BOOKING MODIFICATION ENDPOINTS
  // ============================================

  @Post('modifications/change-date')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Modify booking date',
    description: 'Request to change booking date (requires approval if price changes)',
  })
  @ApiResponse({
    status: 201,
    description: 'Modification request created',
  })
  async modifyDate(
    @GetUser('sub') userId: number,
    @Body() modifyDto: dto.ModifyBookingDateDto,
  ) {
    return this.bookingModificationService.modifyDate(modifyDto, userId);
  }

  @Post('modifications/change-guests')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Modify guest count',
    description: 'Request to change number of guests',
  })
  @ApiResponse({
    status: 201,
    description: 'Modification request created',
  })
  async modifyGuestCount(
    @GetUser('sub') userId: number,
    @Body() modifyDto: dto.ModifyBookingGuestsDto,
  ) {
    return this.bookingModificationService.modifyGuestCount(modifyDto, userId);
  }

  @Post('modifications/upgrade')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upgrade service',
    description: 'Request to upgrade to a better service',
  })
  @ApiResponse({
    status: 201,
    description: 'Upgrade request created',
  })
  async upgradeService(
    @GetUser('sub') userId: number,
    @Body() upgradeDto: dto.UpgradeServiceDto,
  ) {
    return this.bookingModificationService.upgradeService(upgradeDto, userId);
  }

  @Post('modifications/add-services')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add services to booking',
    description: 'Add additional services to an existing booking',
  })
  @ApiResponse({
    status: 201,
    description: 'Services added successfully',
  })
  async addServices(
    @GetUser('sub') userId: number,
    @Body() addDto: dto.AddServiceToBookingDto,
  ) {
    return this.bookingModificationService.addServices(addDto, userId);
  }

  @Post('modifications/remove-service')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove service from booking',
    description: 'Remove a service from an existing booking',
  })
  @ApiResponse({
    status: 201,
    description: 'Service removed successfully',
  })
  async removeService(
    @GetUser('sub') userId: number,
    @Body() removeDto: dto.RemoveServiceFromBookingDto,
  ) {
    return this.bookingModificationService.removeService(removeDto, userId);
  }

  @Get('modifications/booking/:bookingId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get booking modifications',
    description: 'Retrieve all modifications for a booking',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Modifications retrieved successfully',
  })
  async getBookingModifications(
    @GetUser('sub') userId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
  ) {
    return this.bookingModificationService.getBookingModifications(bookingId, userId);
  }

  @Post('modifications/:id/approve')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Approve modification',
    description: 'Approve and apply a booking modification (supplier or admin)',
  })
  @ApiParam({ name: 'id', description: 'Modification ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Modification approved and applied',
  })
  async approveModification(@Param('id', ParseIntPipe) id: number) {
    return this.bookingModificationService.approveModification(id);
  }
}
