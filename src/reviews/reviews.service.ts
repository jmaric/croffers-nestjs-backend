import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateReviewDto,
  CreateGuestReviewDto,
  FilterReviewDto,
  ReviewTag,
  GuestReviewTag,
} from './dto/index.js';
import {
  ReviewType,
  BookingStatus,
} from '../../generated/prisma/client/client.js';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  // Guest reviews supplier/service
  async createReview(userId: number, createReviewDto: CreateReviewDto) {
    const { bookingId, wouldStayAgain, tag } = createReviewDto;

    // Get booking with all details
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            service: true,
          },
        },
        review: true,
      },
    });

    // Anti-fraud validations
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only the guest who made the booking can review
    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only review your own bookings');
    }

    // Only completed bookings can be reviewed
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Only completed bookings can be reviewed');
    }

    // One review per booking
    if (booking.review) {
      throw new BadRequestException('You have already reviewed this booking');
    }

    // Get service and supplier IDs from booking
    const serviceId = booking.bookingItems[0]?.service.id;
    const supplierId = booking.supplierId;

    // Calculate publishAt (72 hours from now)
    const publishAt = new Date();
    publishAt.setHours(publishAt.getHours() + 72);

    // Create review
    const review = await this.prisma.review.create({
      data: {
        userId,
        bookingId,
        serviceId,
        supplierId,
        reviewType: ReviewType.GUEST_TO_SUPPLIER,
        wouldRecommend: wouldStayAgain,
        tag,
        publishAt,
        isPublished: false, // Hidden for 72h
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    return {
      ...review,
      message: 'Review submitted successfully. It will be published in 72 hours.',
    };
  }

  // Supplier reviews guest
  async createGuestReview(
    userId: number,
    createGuestReviewDto: CreateGuestReviewDto,
  ) {
    const { bookingId, wouldHostAgain, tag } = createGuestReviewDto;

    // Get booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        supplier: true,
        review: true,
      },
    });

    // Anti-fraud validations
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Get supplier for this user
    const supplier = await this.prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier || booking.supplierId !== supplier.id) {
      throw new ForbiddenException(
        'You can only review guests from your own bookings',
      );
    }

    // Only completed bookings can be reviewed
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Only completed bookings can be reviewed');
    }

    // Check if supplier has already reviewed this guest for this booking
    const existingReview = await this.prisma.review.findFirst({
      where: {
        bookingId,
        reviewType: ReviewType.SUPPLIER_TO_GUEST,
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this guest for this booking',
      );
    }

    // Calculate publishAt (72 hours from now)
    const publishAt = new Date();
    publishAt.setHours(publishAt.getHours() + 72);

    // Create guest review
    const review = await this.prisma.review.create({
      data: {
        userId: booking.userId, // The guest being reviewed
        bookingId,
        supplierId: supplier.id,
        reviewType: ReviewType.SUPPLIER_TO_GUEST,
        wouldRecommend: wouldHostAgain,
        tag,
        publishAt,
        isPublished: false,
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

    return {
      ...review,
      message: 'Guest review submitted successfully. It will be published in 72 hours.',
    };
  }

  // Calculate Trust Score for a supplier
  async getSupplierTrustScore(supplierId: number) {
    const reviews = await this.prisma.review.findMany({
      where: {
        supplierId,
        reviewType: ReviewType.GUEST_TO_SUPPLIER,
        isPublished: true, // Only count published reviews
      },
      select: {
        wouldRecommend: true,
        tag: true,
      },
    });

    if (reviews.length === 0) {
      return {
        trustScore: null,
        totalReviews: 0,
        positiveReviews: 0,
        negativeReviews: 0,
        message: 'No reviews yet',
      };
    }

    const positiveReviews = reviews.filter((r) => r.wouldRecommend).length;
    const negativeReviews = reviews.length - positiveReviews;
    const trustScore = Math.round((positiveReviews / reviews.length) * 100);

    // Calculate tag frequency
    const tagCounts: Record<string, number> = {};
    reviews.forEach((review) => {
      tagCounts[review.tag] = (tagCounts[review.tag] || 0) + 1;
    });

    // Sort tags by frequency
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return {
      trustScore, // % of guests who would stay again
      totalReviews: reviews.length,
      positiveReviews,
      negativeReviews,
      topTags,
      quality: this.getTrustScoreQuality(trustScore),
    };
  }

  // Get trust score quality label
  private getTrustScoreQuality(score: number): string {
    if (score >= 95) return 'Premium quality';
    if (score >= 85) return 'Excellent';
    if (score >= 75) return 'Very good';
    if (score >= 60) return 'Good';
    if (score >= 50) return 'Average';
    return 'Below average';
  }

  // Generate AI summary from tags
  async generateAISummary(supplierId: number) {
    const reviews = await this.prisma.review.findMany({
      where: {
        supplierId,
        reviewType: ReviewType.GUEST_TO_SUPPLIER,
        isPublished: true,
      },
      select: {
        wouldRecommend: true,
        tag: true,
      },
    });

    if (reviews.length === 0) {
      return null;
    }

    // Count positive and negative tags
    const positiveTags: string[] = [];
    const negativeTags: string[] = [];

    reviews.forEach((review) => {
      if (review.wouldRecommend) {
        positiveTags.push(review.tag);
      } else {
        negativeTags.push(review.tag);
      }
    });

    // Get most common tags
    const positiveTagCounts = this.countTags(positiveTags);
    const negativeTagCounts = this.countTags(negativeTags);

    const topPositive = Object.entries(positiveTagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag.toLowerCase());

    const topNegative = Object.entries(negativeTagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([tag]) => tag.toLowerCase());

    // Generate neutral summary
    let summary = '';

    if (topPositive.length > 0) {
      summary += `Most guests praised ${topPositive.join(', ')}.`;
    }

    if (topNegative.length > 0) {
      summary += ` A minority mentioned ${topNegative.join(' and ')}.`;
    }

    return summary.trim();
  }

  private countTags(tags: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    tags.forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
    return counts;
  }

  // Get all reviews for a supplier
  async findSupplierReviews(supplierId: number, filterDto: FilterReviewDto) {
    const { wouldStayAgain, isPublished = true, page = 1, limit = 20 } = filterDto;

    const where: any = {
      supplierId,
      reviewType: ReviewType.GUEST_TO_SUPPLIER,
      isPublished, // Only show published by default
    };

    if (wouldStayAgain !== undefined) {
      where.wouldRecommend = wouldStayAgain;
    }

    const skip = (page - 1) * limit;

    const [reviews, total, trustScore, aiSummary] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          wouldRecommend: true,
          tag: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              // Anonymous - no full name or email
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.review.count({ where }),
      this.getSupplierTrustScore(supplierId),
      this.generateAISummary(supplierId),
    ]);

    return {
      trustScore,
      aiSummary,
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get guest trust score (for suppliers)
  async getGuestTrustScore(userId: number) {
    const reviews = await this.prisma.review.findMany({
      where: {
        userId, // Reviews about this guest
        reviewType: ReviewType.SUPPLIER_TO_GUEST,
        isPublished: true,
      },
      select: {
        wouldRecommend: true,
      },
    });

    if (reviews.length === 0) {
      return {
        trustScore: null,
        totalReviews: 0,
        message: 'No reviews yet',
      };
    }

    const positiveReviews = reviews.filter((r) => r.wouldRecommend).length;
    const trustScore = Math.round((positiveReviews / reviews.length) * 100);

    return {
      trustScore,
      totalReviews: reviews.length,
      positiveReviews,
      negativeReviews: reviews.length - positiveReviews,
    };
  }

  // Get all available tags
  getAvailableTags() {
    return {
      serviceTags: Object.values(ReviewTag),
      guestTags: Object.values(GuestReviewTag),
    };
  }
}