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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JourneysService } from './journeys.service.js';
import {
  PlanJourneyDto,
  UpdateJourneyDto,
  BookJourneyDto,
  JourneyResponseDto,
  JourneyListResponseDto,
} from './dto/index.js';
import { JwtGuard } from '../guard/jwt.guard.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';

@ApiTags('Journeys')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtGuard)
@Controller({ path: 'journeys', version: '1' })
export class JourneysController {
  constructor(private readonly journeysService: JourneysService) {}

  @Post('plan')
  @ApiOperation({
    summary: 'Plan a multi-modal journey',
    description:
      'Plan a complete journey from origin to destination with optimized route including transport, ferry, and accommodation segments',
  })
  @ApiResponse({
    status: 201,
    description: 'Journey planned successfully',
    type: JourneyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Origin or destination location not found',
  })
  async planJourney(
    @GetUser('sub') userId: number,
    @Body() dto: PlanJourneyDto,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.planJourney(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user journeys',
    description: 'Retrieve all journeys created by the authenticated user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Journeys retrieved successfully',
    type: JourneyListResponseDto,
  })
  async getUserJourneys(
    @GetUser('sub') userId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ): Promise<JourneyListResponseDto> {
    return this.journeysService.getUserJourneys(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get journey by ID',
    description: 'Retrieve detailed information about a specific journey',
  })
  @ApiParam({
    name: 'id',
    description: 'Journey ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Journey retrieved successfully',
    type: JourneyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Journey not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not have access to this journey',
  })
  async getJourney(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.getJourney(id, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update journey',
    description:
      'Update journey details (name, status, dates, travelers). Cannot update confirmed or completed journeys.',
  })
  @ApiParam({
    name: 'id',
    description: 'Journey ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Journey updated successfully',
    type: JourneyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot update journey in current status',
  })
  @ApiResponse({
    status: 404,
    description: 'Journey not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not have access to this journey',
  })
  async updateJourney(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJourneyDto,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.updateJourney(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete journey',
    description:
      'Delete a journey. Cannot delete confirmed journeys - cancel bookings first.',
  })
  @ApiParam({
    name: 'id',
    description: 'Journey ID',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Journey deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot delete confirmed journey',
  })
  @ApiResponse({
    status: 404,
    description: 'Journey not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not have access to this journey',
  })
  async deleteJourney(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.journeysService.deleteJourney(id, userId);
  }

  @Post(':id/book')
  @ApiOperation({
    summary: 'Book entire journey',
    description:
      'Book all segments of a journey at once. Creates bookings with suppliers and processes payment. Journey status will be updated to CONFIRMED upon successful booking.',
  })
  @ApiParam({
    name: 'id',
    description: 'Journey ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Journey booked successfully',
    type: JourneyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - journey not in correct status or payment failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Journey not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not have access to this journey',
  })
  async bookJourney(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BookJourneyDto,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.bookJourney(id, userId, dto);
  }
}
