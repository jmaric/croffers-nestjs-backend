import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtGuard } from '../guard/jwt.guard.js';
import { SubscriptionService } from './services/subscription.service.js';
import { StripeWebhookService } from './services/stripe-webhook.service.js';
import {
  CreateSubscriptionDto,
  SubscriptionResponseDto,
  SubscriptionPlansDto,
  SubscriptionPlan,
} from './dto/subscription.dto.js';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly webhookService: StripeWebhookService,
  ) {}

  /**
   * Get available subscription plans
   */
  @Get('plans')
  @ApiOperation({
    summary: 'Get available subscription plans',
    description: 'Returns FREE and PREMIUM subscription plans with features',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available plans',
    type: [SubscriptionPlansDto],
  })
  async getPlans(): Promise<SubscriptionPlansDto[]> {
    return this.subscriptionService.getPlans();
  }

  /**
   * Get user's current subscription
   */
  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user subscription',
    description: 'Returns the authenticated user subscription details',
  })
  @ApiResponse({
    status: 200,
    description: 'User subscription details',
    type: SubscriptionResponseDto,
  })
  async getMySubscription(@Req() req: any): Promise<SubscriptionResponseDto> {
    const userId = req.user.sub;
    return this.subscriptionService.getUserSubscription(userId);
  }

  /**
   * Create premium subscription
   */
  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create premium subscription',
    description:
      'Subscribe to premium plan with 7-day free trial. Requires payment method.',
  })
  @ApiBody({ type: CreateSubscriptionDto })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.subscriptionService.createSubscription(dto, userId);
  }

  /**
   * Cancel subscription
   */
  @Delete()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel subscription',
    description:
      'Cancel subscription at period end (default) or immediately. Immediate cancellation provides prorated refund.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription canceled successfully',
  })
  async cancelSubscription(
    @Req() req: any,
    @Body() body?: { immediate?: boolean },
  ) {
    const userId = req.user.sub;
    const immediate = body?.immediate || false;
    return this.subscriptionService.cancelSubscription(userId, immediate);
  }

  /**
   * Resume canceled subscription
   */
  @Post('resume')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resume canceled subscription',
    description:
      'Resume a subscription that is scheduled to be canceled at period end',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription resumed successfully',
  })
  async resumeSubscription(@Req() req: any) {
    const userId = req.user.sub;
    return this.subscriptionService.resumeSubscription(userId);
  }

  /**
   * Change subscription plan
   */
  @Put('plan')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change subscription plan',
    description:
      'Switch between monthly and yearly plans. Changes take effect immediately with prorated billing.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newPlan: {
          type: 'string',
          enum: ['monthly', 'yearly'],
          example: 'yearly',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan changed successfully',
  })
  async changeSubscriptionPlan(
    @Req() req: any,
    @Body() body: { newPlan: SubscriptionPlan },
  ) {
    const userId = req.user.sub;
    return this.subscriptionService.changeSubscriptionPlan(
      userId,
      body.newPlan,
    );
  }

  /**
   * Get subscription history
   */
  @Get('history')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscription history',
    description: 'Returns last 50 subscription events for the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription event history',
  })
  async getSubscriptionHistory(@Req() req: any) {
    const userId = req.user.sub;
    return this.subscriptionService.getSubscriptionHistory(userId);
  }

  /**
   * Stripe webhook endpoint
   */
  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description:
      'Handles Stripe webhook events for subscription lifecycle management',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    return this.webhookService.handleWebhook(rawBody, signature);
  }
}
