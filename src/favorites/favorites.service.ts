import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueryFavoritesDto } from './dto/index.js';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // FAVORITES OPERATIONS
  // ============================================

  async addFavorite(userId: number, serviceId: number) {
    // Verify service exists
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true, isActive: true },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    // Check if already favorited
    const existingFavorite = await this.prisma.favorite.findUnique({
      where: {
        userId_serviceId: {
          userId,
          serviceId,
        },
      },
    });

    if (existingFavorite) {
      throw new ConflictException('Service is already in your favorites');
    }

    // Create favorite
    const favorite = await this.prisma.favorite.create({
      data: {
        userId,
        serviceId,
      },
      include: {
        service: {
          include: {
            supplier: {
              select: {
                id: true,
                businessName: true,
              },
            },
            photos: {
              where: { isMain: true },
              take: 1,
            },
            reviews: {
              select: {
                wouldRecommend: true,
              },
            },
          },
        },
      },
    });

    return favorite;
  }

  async removeFavorite(userId: number, serviceId: number) {
    // Check if favorite exists
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_serviceId: {
          userId,
          serviceId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException(
        'Service is not in your favorites or does not exist',
      );
    }

    // Delete favorite
    await this.prisma.favorite.delete({
      where: {
        id: favorite.id,
      },
    });

    return { message: 'Service removed from favorites successfully' };
  }

  async getFavorites(userId: number, query: QueryFavoritesDto) {
    const { serviceType, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      userId,
    };

    if (serviceType) {
      where.service = {
        type: serviceType,
      };
    }

    // Fetch favorites with service details
    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: {
            include: {
              supplier: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
              photos: {
                where: { isMain: true },
                take: 1,
              },
              reviews: {
                select: {
                  wouldRecommend: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.favorite.count({ where }),
    ]);

    // Calculate trust scores for each service
    const favoritesWithScores = favorites.map((favorite) => {
      const reviews = favorite.service.reviews || [];
      const totalReviews = reviews.length;
      const positiveReviews = reviews.filter((r) => r.wouldRecommend).length;
      const trustScore =
        totalReviews > 0
          ? Math.round((positiveReviews / totalReviews) * 100)
          : null;

      return {
        ...favorite,
        service: {
          ...favorite.service,
          trustScore,
          totalReviews,
        },
      };
    });

    return {
      data: favoritesWithScores,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async isFavorited(userId: number, serviceId: number) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_serviceId: {
          userId,
          serviceId,
        },
      },
    });

    return {
      isFavorited: !!favorite,
      favoriteId: favorite?.id || null,
    };
  }

  async getFavoritesCount(userId: number) {
    const count = await this.prisma.favorite.count({
      where: { userId },
    });

    return { count };
  }
}
