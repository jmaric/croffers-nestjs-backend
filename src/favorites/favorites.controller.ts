import {
  Controller,
  Get,
  Post,
  Delete,
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
import { FavoritesService } from './favorites.service.js';
import { JwtGuard } from '../guard/index.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { QueryFavoritesDto } from './dto/index.js';

@ApiTags('Favorites/Wishlists')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':serviceId')
  @ApiOperation({
    summary: 'Add service to favorites',
    description: 'Adds a service to the user\'s favorites/wishlist.',
  })
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID to add to favorites',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Service added to favorites successfully',
    schema: {
      example: {
        id: 1,
        userId: 5,
        serviceId: 42,
        createdAt: '2024-12-15T10:00:00.000Z',
        service: {
          id: 42,
          name: 'Luxury Villa with Sea View',
          type: 'ACCOMMODATION',
          price: '250.00',
          currency: 'EUR',
          supplier: {
            id: 3,
            businessName: 'Adriatic Villas',
          },
          photos: [
            {
              id: 100,
              url: 'https://example.com/villa.jpg',
              isMain: true,
            },
          ],
          trustScore: 95,
          totalReviews: 23,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiResponse({
    status: 409,
    description: 'Service is already in favorites',
  })
  addFavorite(
    @GetUser('id') userId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
  ) {
    return this.favoritesService.addFavorite(userId, serviceId);
  }

  @Delete(':serviceId')
  @ApiOperation({
    summary: 'Remove service from favorites',
    description: 'Removes a service from the user\'s favorites/wishlist.',
  })
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID to remove from favorites',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Service removed from favorites successfully',
    schema: {
      example: {
        message: 'Service removed from favorites successfully',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  removeFavorite(
    @GetUser('id') userId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
  ) {
    return this.favoritesService.removeFavorite(userId, serviceId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all favorites',
    description:
      'Returns paginated list of user\'s favorite services with detailed information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Favorites retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            userId: 5,
            serviceId: 42,
            createdAt: '2024-12-15T10:00:00.000Z',
            service: {
              id: 42,
              name: 'Luxury Villa with Sea View',
              type: 'ACCOMMODATION',
              price: '250.00',
              currency: 'EUR',
              description: 'Beautiful villa overlooking the Adriatic Sea',
              supplier: {
                id: 3,
                businessName: 'Adriatic Villas',
              },
              photos: [
                {
                  id: 100,
                  url: 'https://example.com/villa.jpg',
                  isMain: true,
                },
              ],
              trustScore: 95,
              totalReviews: 23,
            },
          },
        ],
        meta: {
          total: 15,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    },
  })
  getFavorites(
    @GetUser('id') userId: number,
    @Query() query: QueryFavoritesDto,
  ) {
    return this.favoritesService.getFavorites(userId, query);
  }

  @Get('count')
  @ApiOperation({
    summary: 'Get favorites count',
    description: 'Returns the total number of favorites for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Count retrieved successfully',
    schema: {
      example: {
        count: 15,
      },
    },
  })
  getFavoritesCount(@GetUser('id') userId: number) {
    return this.favoritesService.getFavoritesCount(userId);
  }

  @Get(':serviceId/check')
  @ApiOperation({
    summary: 'Check if service is favorited',
    description:
      'Checks whether a specific service is in the user\'s favorites.',
  })
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID to check',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Check completed successfully',
    schema: {
      example: {
        isFavorited: true,
        favoriteId: 1,
      },
    },
  })
  checkFavorite(
    @GetUser('id') userId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
  ) {
    return this.favoritesService.isFavorited(userId, serviceId);
  }
}
