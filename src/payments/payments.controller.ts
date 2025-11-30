import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Headers,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import {
  CreatePaymentIntentDto,
  ProcessPaymentDto,
  RefundPaymentDto,
  FilterPaymentDto,
} from './dto/index.js';
import { JwtGuard } from '../guard/index.js';
import { RolesGuard } from '../guard/roles.guard.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { UserRole } from '../../generated/prisma/client/client.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  @UseGuards(JwtGuard)
  createPaymentIntent(
    @GetUser('id') userId: number,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(userId, createPaymentIntentDto);
  }

  @Post('process')
  @UseGuards(JwtGuard)
  processPayment(
    @GetUser('id') userId: number,
    @Body() processPaymentDto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processPayment(userId, processPaymentDto);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body not available');
    }
    return this.paymentsService.handleWebhook(signature, rawBody);
  }

  @Post(':id/refund')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  refund(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @Body() refundPaymentDto: RefundPaymentDto,
  ) {
    return this.paymentsService.refund(id, userId, refundPaymentDto);
  }

  @Get()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query() filterDto: FilterPaymentDto) {
    return this.paymentsService.findAll(filterDto);
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtGuard)
  findByBooking(@Param('bookingId', ParseIntPipe) bookingId: number) {
    return this.paymentsService.findByBooking(bookingId);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }
}