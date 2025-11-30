import {
  Controller,
  Get,
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
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service.js';
import {
  CreateReviewDto,
  CreateGuestReviewDto,
  FilterReviewDto,
} from './dto/index.js';
import { JwtGuard } from '../guard/index.js';
import { RolesGuard } from '../guard/roles.guard.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { UserRole } from '../../generated/prisma/client/client.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Guest creates review for supplier/service',
    description:
      'Creates a binary review (👍/👎) with one required tag for a completed booking. Review will be automatically published after 72 hours to prevent manipulation and blackmail attempts. Anti-fraud: only completed bookings, one review per booking, no cancellations allowed.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Review created successfully. Will be published in 72 hours.',
    schema: {
      example: {
        id: 1,
        userId: 1,
        bookingId: 1,
        serviceId: 1,
        supplierId: 1,
        reviewType: 'GUEST_TO_SUPPLIER',
        wouldRecommend: true,
        tag: 'Super clean',
        isPublished: false,
        publishAt: '2024-12-04T10:00:00.000Z',
        createdAt: '2024-12-01T10:00:00.000Z',
        message: 'Review submitted successfully. It will be published in 72 hours.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid booking, already reviewed, or booking not completed' })
  @ApiResponse({ status: 403, description: 'Not authorized to review this booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  createReview(
    @GetUser('id') userId: number,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(userId, createReviewDto);
  }

  @Post('guest')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Supplier creates review for guest (bidirectional reviews)',
    description:
      'Allows suppliers to review guests with binary rating (👍/👎 would host again) and one required tag. Review will be published after 72 hours. Only suppliers can review guests from their completed bookings.',
  })
  @ApiResponse({
    status: 201,
    description: 'Guest review created successfully. Will be published in 72 hours.',
    schema: {
      example: {
        id: 1,
        userId: 2,
        bookingId: 1,
        reviewType: 'SUPPLIER_TO_GUEST',
        wouldRecommend: true,
        tag: 'Respectful guest',
        isPublished: false,
        publishAt: '2024-12-04T10:00:00.000Z',
        createdAt: '2024-12-01T10:00:00.000Z',
        message: 'Guest review submitted successfully. It will be published in 72 hours.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid booking, already reviewed, or booking not completed' })
  @ApiResponse({ status: 403, description: 'Not authorized or not a supplier' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  createGuestReview(
    @GetUser('id') userId: number,
    @Body() createGuestReviewDto: CreateGuestReviewDto,
  ) {
    return this.reviewsService.createGuestReview(userId, createGuestReviewDto);
  }

  @Get('supplier/:supplierId/trust-score')
  @ApiOperation({
    summary: 'Get supplier trust score',
    description:
      'Returns the trust score percentage (% of guests who would stay again) with quality label, total reviews, and top 5 most common tags. Trust score is calculated from published reviews only.',
  })
  @ApiParam({
    name: 'supplierId',
    type: 'number',
    description: 'Supplier ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Supplier trust score retrieved successfully',
    schema: {
      example: {
        trustScore: 92,
        quality: 'Excellent',
        totalReviews: 50,
        positiveReviews: 46,
        negativeReviews: 4,
        topTags: [
          { tag: 'Super clean', count: 25 },
          { tag: 'Amazing host', count: 18 },
          { tag: 'Great location', count: 15 },
          { tag: 'Good value', count: 12 },
          { tag: 'Excellent communication', count: 10 },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  getSupplierTrustScore(@Param('supplierId', ParseIntPipe) supplierId: number) {
    return this.reviewsService.getSupplierTrustScore(supplierId);
  }

  @Get('supplier/:supplierId')
  @ApiOperation({
    summary: 'Get all reviews for a supplier',
    description:
      'Returns paginated list of published reviews for a supplier with optional filters. Includes AI-generated summary from tag frequency analysis.',
  })
  @ApiParam({
    name: 'supplierId',
    type: 'number',
    description: 'Supplier ID',
    example: 1,
  })
  @ApiQuery({ name: 'wouldStayAgain', required: false, type: 'boolean', description: 'Filter by positive/negative reviews' })
  @ApiQuery({ name: 'isPublished', required: false, type: 'boolean', description: 'Filter by publication status (default: true)' })
  @ApiQuery({ name: 'page', required: false, type: 'number', description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Items per page (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            userId: 1,
            bookingId: 1,
            reviewType: 'GUEST_TO_SUPPLIER',
            wouldRecommend: true,
            tag: 'Super clean',
            isPublished: true,
            createdAt: '2024-12-01T10:00:00.000Z',
            user: { firstName: 'John', lastName: 'Doe' },
          },
        ],
        summary: 'Most guests praised super clean, amazing host, great location. A minority mentioned too noisy.',
        meta: { total: 50, page: 1, limit: 10, totalPages: 5 },
      },
    },
  })
  findSupplierReviews(
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Query() filterDto: FilterReviewDto,
  ) {
    return this.reviewsService.findSupplierReviews(supplierId, filterDto);
  }

  @Get('guest/:userId/trust-score')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get guest trust score (suppliers only)',
    description:
      'Returns the guest trust score percentage (% of suppliers who would host again) with quality label and top tags. Only suppliers and admins can access this endpoint.',
  })
  @ApiParam({
    name: 'userId',
    type: 'number',
    description: 'Guest user ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Guest trust score retrieved successfully',
    schema: {
      example: {
        trustScore: 88,
        quality: 'Excellent',
        totalReviews: 20,
        positiveReviews: 18,
        negativeReviews: 2,
        topTags: [
          { tag: 'Respectful guest', count: 10 },
          { tag: 'Clean and tidy', count: 8 },
          { tag: 'Good communication', count: 7 },
        ],
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Not authorized (suppliers only)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getGuestTrustScore(@Param('userId', ParseIntPipe) userId: number) {
    return this.reviewsService.getGuestTrustScore(userId);
  }

  @Get('tags')
  @ApiOperation({
    summary: 'Get available review tags',
    description:
      'Returns all available predefined tags for service reviews and guest reviews. Guests use service tags, suppliers use guest tags.',
  })
  @ApiResponse({
    status: 200,
    description: 'Available tags retrieved successfully',
    schema: {
      example: {
        serviceTags: {
          positive: [
            'Super clean',
            'Amazing host',
            'Great location',
            'Good value',
            'Quiet area',
            'Perfect for families',
            'Excellent communication',
            'As described',
            'Highly recommend',
            'Professional service',
          ],
          negative: [
            'Not clean',
            'Poor communication',
            'Too noisy',
            'Bad location',
            'Price too high',
            'Not as described',
            'Unprofessional',
            'Cancelled last minute',
            'Safety concerns',
            'Misleading photos',
          ],
        },
        guestTags: {
          positive: [
            'Respectful guest',
            'Clean and tidy',
            'Good communication',
            'Followed rules',
            'Easy guest',
            'On time',
          ],
          negative: [
            'Disrespectful',
            'Left mess',
            'Poor communication',
            'Broke rules',
            'Difficult guest',
            'Late/no show',
            'Damaged property',
          ],
        },
      },
    },
  })
  getAvailableTags() {
    return this.reviewsService.getAvailableTags();
  }
}