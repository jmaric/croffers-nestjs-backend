import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
} from '@nestjs/swagger';
import { ItinerariesService } from './itineraries.service.js';
import { JwtGuard } from '../guard/index.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import {
  CreateItineraryDto,
  UpdateItineraryDto,
  GenerateItineraryDto,
  QueryItinerariesDto,
} from './dto/index.js';

@ApiTags('Trip Itineraries')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtGuard)
@Controller('itineraries')
export class ItinerariesController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new trip itinerary',
    description: 'Creates a new trip itinerary manually.',
  })
  @ApiResponse({
    status: 201,
    description: 'Itinerary created successfully',
  })
  create(@GetUser('id') userId: number, @Body() dto: CreateItineraryDto) {
    return this.itinerariesService.create(userId, dto);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate AI-powered trip itinerary',
    description:
      'Uses AI to automatically generate a detailed trip itinerary based on preferences and requirements.',
  })
  @ApiResponse({
    status: 201,
    description: 'AI-powered itinerary generated successfully',
    schema: {
      example: {
        id: 1,
        userId: 5,
        name: '7-Day Croatian Island Adventure',
        description:
          'An exciting journey through the beautiful Croatian islands',
        startDate: '2024-06-15T00:00:00.000Z',
        endDate: '2024-06-22T00:00:00.000Z',
        totalBudget: '2000',
        currency: 'EUR',
        isAIGenerated: true,
        isPublic: false,
        data: {
          days: [
            {
              day: 1,
              date: '2024-06-15',
              title: 'Arrival in Split',
              activities: [
                {
                  time: '10:00',
                  title: 'Arrive at Split Airport',
                  description: 'Transfer to hotel and check-in',
                  location: 'Split',
                  duration: '2 hours',
                  estimatedCost: '30',
                  category: 'transport',
                },
              ],
              highlights: ['Diocletian Palace', 'Riva Promenade'],
              estimatedBudget: '150',
            },
          ],
          tips: ['Book ferries in advance', 'Try local seafood'],
          packingList: ['Swimsuit', 'Sunscreen', 'Comfortable shoes'],
          estimatedTotalCost: '1950',
        },
        createdAt: '2024-12-15T10:00:00.000Z',
        updatedAt: '2024-12-15T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid date range or parameters' })
  generateWithAI(
    @GetUser('id') userId: number,
    @Body() dto: GenerateItineraryDto,
  ) {
    return this.itinerariesService.generateWithAI(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all itineraries',
    description:
      'Returns paginated list of itineraries. By default returns user own itineraries, or public itineraries if publicOnly=true.',
  })
  @ApiResponse({
    status: 200,
    description: 'Itineraries retrieved successfully',
  })
  findAll(@GetUser('id') userId: number, @Query() query: QueryItinerariesDto) {
    return this.itinerariesService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get itinerary by ID',
    description:
      'Returns a single itinerary. Public itineraries can be viewed by anyone, private only by owner.',
  })
  @ApiParam({ name: 'id', description: 'Itinerary ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Itinerary retrieved' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Itinerary not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.itinerariesService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update itinerary',
    description: 'Updates an existing itinerary. Only the owner can update.',
  })
  @ApiParam({ name: 'id', description: 'Itinerary ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Itinerary updated successfully' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Itinerary not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @Body() dto: UpdateItineraryDto,
  ) {
    return this.itinerariesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete itinerary',
    description: 'Deletes an itinerary. Only the owner can delete.',
  })
  @ApiParam({ name: 'id', description: 'Itinerary ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Itinerary deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 404, description: 'Itinerary not found' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.itinerariesService.remove(id, userId);
  }
}
