import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { BookingsService } from './bookings.service.js';
import { InvoiceService } from './invoice.service.js';
import {
  CreateBookingDto,
  UpdateBookingDto,
  CancelBookingDto,
  FilterBookingDto,
} from './dto/index.js';
import { JwtGuard } from '../guard/index.js';
import { RolesGuard } from '../guard/roles.guard.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { UserRole } from '../../generated/prisma/client/client.js';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create new booking',
    description:
      'Creates a new booking for services. Validates availability, calculates total with commission, generates booking reference, and sends confirmation email. All services must be from the same supplier.',
  })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    schema: {
      example: {
        id: 1,
        bookingReference: 'BOOK-ABC123',
        userId: 1,
        supplierId: 1,
        status: 'PENDING',
        serviceDate: '2024-12-15T00:00:00.000Z',
        totalAmount: 250,
        commission: 37.5,
        notes: 'Special requests...',
        bookingItems: [
          {
            id: 1,
            serviceId: 1,
            quantity: 2,
            unitPrice: 100,
            totalPrice: 200,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid data, service unavailable, or past service date' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  create(
    @GetUser('id') userId: number,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(userId, createBookingDto);
  }

  @Get()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all bookings (admin only)',
    description: 'Returns paginated list of all bookings with filters. Admin only.',
  })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  findAll(@Query() filterDto: FilterBookingDto) {
    return this.bookingsService.findAll(filterDto);
  }

  @Get('my-bookings')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my bookings',
    description: 'Returns paginated list of bookings for the authenticated user with optional filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'My bookings retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            bookingReference: 'BOOK-ABC123',
            status: 'CONFIRMED',
            serviceDate: '2024-12-15T00:00:00.000Z',
            totalAmount: 250,
          },
        ],
        meta: { total: 10, page: 1, limit: 10, totalPages: 1 },
      },
    },
  })
  findMyBookings(
    @GetUser('id') userId: number,
    @Query() filterDto: FilterBookingDto,
  ) {
    return this.bookingsService.findMyBookings(userId, filterDto);
  }

  @Get('supplier-bookings')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get supplier bookings',
    description: 'Returns paginated list of bookings for the supplier services with optional filters. Supplier/Admin only.',
  })
  @ApiResponse({ status: 200, description: 'Supplier bookings retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Supplier/Admin only' })
  findSupplierBookings(
    @GetUser('id') userId: number,
    @Query() filterDto: FilterBookingDto,
  ) {
    return this.bookingsService.findSupplierBookings(userId, filterDto);
  }

  @Get('reference/:reference')
  @ApiOperation({
    summary: 'Get booking by reference',
    description: 'Retrieves a booking by its unique booking reference code (e.g., BOOK-ABC123). Public endpoint.',
  })
  @ApiParam({ name: 'reference', description: 'Booking reference code', example: 'BOOK-ABC123' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findByReference(@Param('reference') reference: string) {
    return this.bookingsService.findByReference(reference);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get booking by ID',
    description: 'Retrieves detailed booking information by ID including all booking items and related data.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update booking',
    description: 'Updates booking details (service date, notes). Only allowed for PENDING bookings by owner or admin.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or booking cannot be updated (not PENDING)' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not booking owner or admin' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, userId, userRole, updateBookingDto);
  }

  @Patch(':id/confirm')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Confirm booking (supplier only)',
    description: 'Changes booking status from PENDING to CONFIRMED. Only suppliers can confirm their bookings.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Booking confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Booking already confirmed or cancelled' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not booking supplier' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  confirm(@Param('id', ParseIntPipe) id: number, @GetUser('id') userId: number) {
    return this.bookingsService.confirm(id, userId);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cancel booking',
    description:
      'Cancels a booking with reason. Available to booking owner or supplier. Cannot cancel COMPLETED bookings.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Booking cannot be cancelled (already completed)' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not booking owner or supplier' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
    @Body() cancelBookingDto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, userId, userRole, cancelBookingDto);
  }

  @Patch(':id/complete')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mark booking as completed (supplier only)',
    description:
      'Changes booking status to COMPLETED after service delivery. Enables review creation. Supplier/Admin only.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Booking marked as completed' })
  @ApiResponse({ status: 400, description: 'Booking cannot be completed (cancelled or already completed)' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not booking supplier' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  complete(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
  ) {
    return this.bookingsService.complete(id, userId, userRole);
  }

  @Get(':id/invoice')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Download booking invoice PDF',
    description:
      'Generates and downloads a PDF invoice for the booking with all details, itemized costs, and commission breakdown.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Invoice PDF generated successfully',
    content: { 'application/pdf': {} },
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async downloadInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    // Get booking with all details
    const booking = await this.bookingsService.findOne(id);

    // Generate invoice PDF
    const pdfStream = await this.invoiceService.generateInvoice(booking);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${booking.bookingReference}.pdf`,
    );

    // Pipe the PDF stream to response
    pdfStream.pipe(res);
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete booking (admin only)',
    description: 'Permanently deletes a booking. Admin only. Use with caution.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Booking deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
  ) {
    return this.bookingsService.remove(id, userId, userRole);
  }
}