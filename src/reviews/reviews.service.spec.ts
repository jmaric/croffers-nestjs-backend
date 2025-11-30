import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ReviewType,
  BookingStatus,
} from '../../generated/prisma/client/client.js';
import { ReviewTag, GuestReviewTag } from './dto/index.js';
import {
  createMockUser,
  createMockBooking,
  createMockReview,
  createMockSupplier,
  hoursFromNow,
} from '../test-utils/test-helpers.js';
import { createMockPrismaClient } from '../test-utils/prisma-mock.js';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(async () => {
    prisma = createMockPrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview (Guest reviews Supplier)', () => {
    const userId = 1;
    const createReviewDto = {
      bookingId: 1,
      wouldStayAgain: true,
      tag: ReviewTag.SUPER_CLEAN,
    };

    it('should create a review successfully for a completed booking', async () => {
      const mockBooking = {
        ...createMockBooking({
          id: 1,
          userId: 1,
          status: BookingStatus.COMPLETED,
        }),
        bookingItems: [
          {
            service: { id: 1 },
          },
        ],
        review: null,
      };

      const mockReview = createMockReview({
        userId,
        bookingId: 1,
        serviceId: 1,
        supplierId: 1,
        reviewType: ReviewType.GUEST_TO_SUPPLIER,
        wouldRecommend: true,
        tag: ReviewTag.SUPER_CLEAN,
      });

      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);
      prisma.review.create.mockResolvedValue({
        ...mockReview,
        user: createMockUser(),
        service: { id: 1, name: 'Test Service' },
        supplier: { id: 1, businessName: 'Test Supplier' },
      } as any);

      const result = await service.createReview(userId, createReviewDto);

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('72 hours');
      expect(prisma.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          bookingItems: {
            include: {
              service: true,
            },
          },
          review: true,
        },
      });
      expect(prisma.review.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.createReview(userId, createReviewDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createReview(userId, createReviewDto),
      ).rejects.toThrow('Booking not found');
    });

    it('should throw ForbiddenException if user is not the booking owner', async () => {
      const mockBooking = {
        ...createMockBooking({
          userId: 999, // Different user
          status: BookingStatus.COMPLETED,
        }),
        bookingItems: [{ service: { id: 1 } }],
        review: null,
      };

      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);

      await expect(
        service.createReview(userId, createReviewDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.createReview(userId, createReviewDto),
      ).rejects.toThrow('You can only review your own bookings');
    });

    it('should throw BadRequestException if booking is not completed', async () => {
      const mockBooking = {
        ...createMockBooking({
          userId: 1,
          status: BookingStatus.PENDING,
        }),
        bookingItems: [{ service: { id: 1 } }],
        review: null,
      };

      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);

      await expect(
        service.createReview(userId, createReviewDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createReview(userId, createReviewDto),
      ).rejects.toThrow('Only completed bookings can be reviewed');
    });

    it('should throw BadRequestException if booking already has a review', async () => {
      const mockBooking = {
        ...createMockBooking({
          userId: 1,
          status: BookingStatus.COMPLETED,
        }),
        bookingItems: [{ service: { id: 1 } }],
        review: createMockReview(), // Already has review
      };

      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);

      await expect(
        service.createReview(userId, createReviewDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createReview(userId, createReviewDto),
      ).rejects.toThrow('You have already reviewed this booking');
    });

    it('should set publishAt to 72 hours from now', async () => {
      const mockBooking = {
        ...createMockBooking({
          userId: 1,
          status: BookingStatus.COMPLETED,
        }),
        bookingItems: [{ service: { id: 1 } }],
        review: null,
      };

      const mockReview = createMockReview();

      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);
      prisma.review.create.mockResolvedValue({
        ...mockReview,
        user: createMockUser(),
        service: { id: 1, name: 'Test Service' },
        supplier: { id: 1, businessName: 'Test Supplier' },
      } as any);

      await service.createReview(userId, createReviewDto);

      const createCall = prisma.review.create.mock.calls[0][0];
      const publishAt = createCall.data.publishAt;

      // Check that publishAt is approximately 72 hours from now
      const expectedTime = hoursFromNow(72).getTime();
      const actualTime = publishAt.getTime();
      const timeDiff = Math.abs(expectedTime - actualTime);

      expect(timeDiff).toBeLessThan(1000); // Within 1 second
      expect(createCall.data.isPublished).toBe(false);
    });
  });

  describe('createGuestReview (Supplier reviews Guest)', () => {
    const supplierId = 1;
    const userId = 1;
    const createGuestReviewDto = {
      bookingId: 1,
      wouldHostAgain: true,
      tag: GuestReviewTag.RESPECTFUL_GUEST,
    };

    it('should create a guest review successfully', async () => {
      const mockBooking = {
        ...createMockBooking({
          id: 1,
          userId: 2, // Guest user ID
          supplierId: 1,
          status: BookingStatus.COMPLETED,
        }),
        supplier: createMockSupplier({ id: 1, userId: 1 }),
        review: null,
      };

      const mockSupplier = createMockSupplier({ id: 1, userId: 1 });

      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);
      prisma.supplier.findFirst.mockResolvedValue(mockSupplier as any);
      prisma.review.findFirst.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue({
        ...createMockReview({
          userId: 2,
          reviewType: ReviewType.SUPPLIER_TO_GUEST,
        }),
        user: createMockUser({ id: 2 }),
      } as any);

      const result = await service.createGuestReview(
        userId,
        createGuestReviewDto,
      );

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Guest review submitted successfully');
      expect(prisma.review.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user does not own the supplier', async () => {
      const mockBooking = {
        ...createMockBooking({
          supplierId: 1,
          status: BookingStatus.COMPLETED,
        }),
        supplier: createMockSupplier({ id: 1, userId: 1 }),
        review: null,
      };

      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);
      prisma.supplier.findFirst.mockResolvedValue(null); // No supplier for this user

      await expect(
        service.createGuestReview(userId, createGuestReviewDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.createGuestReview(userId, createGuestReviewDto),
      ).rejects.toThrow('You can only review guests from your own bookings');
    });

    it('should throw BadRequestException if supplier already reviewed this guest', async () => {
      const mockBooking = {
        ...createMockBooking({
          supplierId: 1,
          status: BookingStatus.COMPLETED,
        }),
        supplier: createMockSupplier({ id: 1, userId: 1 }),
        review: null,
      };

      const existingReview = createMockReview({
        reviewType: ReviewType.SUPPLIER_TO_GUEST,
      });

      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);
      prisma.supplier.findFirst.mockResolvedValue(
        createMockSupplier({ id: 1, userId: 1 }) as any,
      );
      prisma.review.findFirst.mockResolvedValue(existingReview as any);

      await expect(
        service.createGuestReview(userId, createGuestReviewDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createGuestReview(userId, createGuestReviewDto),
      ).rejects.toThrow(
        'You have already reviewed this guest for this booking',
      );
    });
  });

  describe('getSupplierTrustScore', () => {
    it('should return null trust score when no reviews exist', async () => {
      prisma.review.findMany.mockResolvedValue([]);

      const result = await service.getSupplierTrustScore(1);

      expect(result.trustScore).toBeNull();
      expect(result.totalReviews).toBe(0);
      expect(result.message).toBe('No reviews yet');
    });

    it('should calculate trust score correctly with all positive reviews', async () => {
      const mockReviews = [
        { wouldRecommend: true, tag: 'Super clean' },
        { wouldRecommend: true, tag: 'Amazing host' },
        { wouldRecommend: true, tag: 'Great location' },
      ];

      prisma.review.findMany.mockResolvedValue(mockReviews as any);

      const result = await service.getSupplierTrustScore(1);

      expect(result.trustScore).toBe(100);
      expect(result.totalReviews).toBe(3);
      expect(result.positiveReviews).toBe(3);
      expect(result.negativeReviews).toBe(0);
      expect(result.quality).toBe('Premium quality');
    });

    it('should calculate trust score correctly with mixed reviews', async () => {
      const mockReviews = [
        { wouldRecommend: true, tag: 'Super clean' },
        { wouldRecommend: true, tag: 'Amazing host' },
        { wouldRecommend: false, tag: 'Not clean' },
        { wouldRecommend: false, tag: 'Poor communication' },
      ];

      prisma.review.findMany.mockResolvedValue(mockReviews as any);

      const result = await service.getSupplierTrustScore(1);

      expect(result.trustScore).toBe(50);
      expect(result.totalReviews).toBe(4);
      expect(result.positiveReviews).toBe(2);
      expect(result.negativeReviews).toBe(2);
      expect(result.quality).toBe('Average');
    });

    it('should return top 5 most common tags', async () => {
      const mockReviews = [
        { wouldRecommend: true, tag: 'Super clean' },
        { wouldRecommend: true, tag: 'Super clean' },
        { wouldRecommend: true, tag: 'Super clean' },
        { wouldRecommend: true, tag: 'Amazing host' },
        { wouldRecommend: true, tag: 'Amazing host' },
        { wouldRecommend: true, tag: 'Great location' },
      ];

      prisma.review.findMany.mockResolvedValue(mockReviews as any);

      const result = await service.getSupplierTrustScore(1);

      expect(result.topTags).toHaveLength(3);
      expect(result.topTags[0]).toEqual({ tag: 'Super clean', count: 3 });
      expect(result.topTags[1]).toEqual({ tag: 'Amazing host', count: 2 });
      expect(result.topTags[2]).toEqual({ tag: 'Great location', count: 1 });
    });

    it('should only count published reviews', async () => {
      prisma.review.findMany.mockResolvedValue([]);

      await service.getSupplierTrustScore(1);

      expect(prisma.review.findMany).toHaveBeenCalledWith({
        where: {
          supplierId: 1,
          reviewType: ReviewType.GUEST_TO_SUPPLIER,
          isPublished: true,
        },
        select: {
          wouldRecommend: true,
          tag: true,
        },
      });
    });
  });

  describe('generateAISummary', () => {
    it('should return null when no reviews exist', async () => {
      prisma.review.findMany.mockResolvedValue([]);

      const result = await service.generateAISummary(1);

      expect(result).toBeNull();
    });

    it('should generate summary with only positive tags', async () => {
      const mockReviews = [
        { wouldRecommend: true, tag: 'Super clean' },
        { wouldRecommend: true, tag: 'Super clean' },
        { wouldRecommend: true, tag: 'Amazing host' },
      ];

      prisma.review.findMany.mockResolvedValue(mockReviews as any);

      const result = await service.generateAISummary(1);

      expect(result).toContain('Most guests praised');
      expect(result).toContain('super clean');
      expect(result).toContain('amazing host');
    });

    it('should generate summary with positive and negative tags', async () => {
      const mockReviews = [
        { wouldRecommend: true, tag: 'Super clean' },
        { wouldRecommend: true, tag: 'Super clean' },
        { wouldRecommend: true, tag: 'Amazing host' },
        { wouldRecommend: false, tag: 'Too noisy' },
      ];

      prisma.review.findMany.mockResolvedValue(mockReviews as any);

      const result = await service.generateAISummary(1);

      expect(result).toContain('Most guests praised');
      expect(result).toContain('A minority mentioned');
      expect(result).toContain('too noisy');
    });
  });

  describe('findSupplierReviews', () => {
    it('should return reviews with trust score and AI summary', async () => {
      const mockReviews = [
        {
          id: 1,
          wouldRecommend: true,
          tag: 'Super clean',
          createdAt: new Date(),
          user: { firstName: 'John' },
        },
      ];

      prisma.review.findMany.mockResolvedValue(mockReviews as any);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.findSupplierReviews(1, {
        page: 1,
        limit: 20,
      });

      expect(result).toHaveProperty('trustScore');
      expect(result).toHaveProperty('aiSummary');
      expect(result).toHaveProperty('reviews');
      expect(result).toHaveProperty('meta');
      expect(result.reviews).toHaveLength(1);
    });

    it('should filter by wouldStayAgain when provided', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await service.findSupplierReviews(1, {
        wouldStayAgain: true,
        page: 1,
        limit: 20,
      });

      const whereClause = prisma.review.findMany.mock.calls[0][0].where;
      expect(whereClause.wouldRecommend).toBe(true);
    });

    it('should only show published reviews by default', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await service.findSupplierReviews(1, { page: 1, limit: 20 });

      const whereClause = prisma.review.findMany.mock.calls[0][0].where;
      expect(whereClause.isPublished).toBe(true);
    });

    it('should paginate results correctly', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(50);

      const result = await service.findSupplierReviews(1, {
        page: 2,
        limit: 10,
      });

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta.totalPages).toBe(5);
      expect(result.meta.page).toBe(2);
    });
  });

  describe('getGuestTrustScore', () => {
    it('should return null trust score when guest has no reviews', async () => {
      prisma.review.findMany.mockResolvedValue([]);

      const result = await service.getGuestTrustScore(1);

      expect(result.trustScore).toBeNull();
      expect(result.totalReviews).toBe(0);
      expect(result.message).toBe('No reviews yet');
    });

    it('should calculate guest trust score correctly', async () => {
      const mockReviews = [
        { wouldRecommend: true },
        { wouldRecommend: true },
        { wouldRecommend: false },
      ];

      prisma.review.findMany.mockResolvedValue(mockReviews as any);

      const result = await service.getGuestTrustScore(1);

      expect(result.trustScore).toBe(67); // 2 out of 3 = 66.67 rounded to 67
      expect(result.totalReviews).toBe(3);
      expect(result.positiveReviews).toBe(2);
      expect(result.negativeReviews).toBe(1);
    });

    it('should only count published reviews for guests', async () => {
      prisma.review.findMany.mockResolvedValue([]);

      await service.getGuestTrustScore(1);

      expect(prisma.review.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          reviewType: ReviewType.SUPPLIER_TO_GUEST,
          isPublished: true,
        },
        select: {
          wouldRecommend: true,
        },
      });
    });
  });
});