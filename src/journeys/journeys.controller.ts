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
  AddSegmentDto,
  UpdateSegmentDto,
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
    @GetUser('id') userId: number,
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
    @GetUser('id') userId: number,
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
    @GetUser('id') userId: number,
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
    @GetUser('id') userId: number,
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
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.journeysService.deleteJourney(id, userId);
  }

  @Post(':id/segments')
  @ApiOperation({
    summary: 'Add a segment to journey',
    description:
      'Add a new service (transport, accommodation, tour, activity) to the journey itinerary',
  })
  @ApiParam({
    name: 'id',
    description: 'Journey ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Segment added successfully',
    type: JourneyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot modify confirmed journey',
  })
  @ApiResponse({
    status: 404,
    description: 'Journey or service not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not have access to this journey',
  })
  async addSegment(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) journeyId: number,
    @Body() dto: AddSegmentDto,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.addSegment(journeyId, userId, dto);
  }

  @Patch(':id/segments/:segmentId')
  @ApiOperation({
    summary: 'Update a journey segment',
    description:
      'Modify an existing segment - change service, times, or locations',
  })
  @ApiParam({
    name: 'id',
    description: 'Journey ID',
    example: 1,
  })
  @ApiParam({
    name: 'segmentId',
    description: 'Segment ID',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Segment updated successfully',
    type: JourneyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot modify confirmed journey',
  })
  @ApiResponse({
    status: 404,
    description: 'Journey or segment not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not have access to this journey',
  })
  async updateSegment(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) journeyId: number,
    @Param('segmentId', ParseIntPipe) segmentId: number,
    @Body() dto: UpdateSegmentDto,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.updateSegment(journeyId, segmentId, userId, dto);
  }

  @Delete(':id/segments/:segmentId')
  @ApiOperation({
    summary: 'Remove a segment from journey',
    description:
      'Delete a segment from the journey itinerary. Segment orders will be updated automatically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Journey ID',
    example: 1,
  })
  @ApiParam({
    name: 'segmentId',
    description: 'Segment ID',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Segment deleted successfully',
    type: JourneyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot modify confirmed journey',
  })
  @ApiResponse({
    status: 404,
    description: 'Journey or segment not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not have access to this journey',
  })
  async deleteSegment(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) journeyId: number,
    @Param('segmentId', ParseIntPipe) segmentId: number,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.deleteSegment(journeyId, segmentId, userId);
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
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BookJourneyDto,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.bookJourney(id, userId, dto);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Mark journey as completed (archive)',
    description: 'Mark a journey as completed after the travel dates have passed. Completed journeys don\'t count toward the 3 journey limit.',
  })
  @ApiResponse({ status: 200, description: 'Journey marked as completed' })
  @ApiResponse({ status: 404, description: 'Journey not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - you do not have access to this journey' })
  async completeJourney(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.completeJourney(id, userId);
  }

  @Get(':id/cancelled-segments')
  @ApiOperation({
    summary: 'Get cancelled segments in a journey',
    description: 'Get all cancelled segments in a journey that need replacement',
  })
  @ApiResponse({ status: 200, description: 'List of cancelled segments' })
  @ApiResponse({ status: 404, description: 'Journey not found' })
  async getCancelledSegments(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journeysService.getCancelledSegments(id, userId);
  }

  @Get(':id/replacement-services/:segmentId')
  @ApiOperation({
    summary: 'Find replacement services for a cancelled segment',
    description: 'Find alternative services that can replace a cancelled segment',
  })
  @ApiResponse({ status: 200, description: 'List of replacement service options' })
  @ApiResponse({ status: 404, description: 'Journey or segment not found' })
  async findReplacementServices(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) journeyId: number,
    @Param('segmentId', ParseIntPipe) segmentId: number,
  ) {
    return this.journeysService.findReplacementServices(journeyId, segmentId, userId);
  }

  @Patch(':id/replace-segment/:segmentId')
  @ApiOperation({
    summary: 'Replace a cancelled segment with a new service',
    description: 'Replace a cancelled segment by selecting a new service',
  })
  @ApiResponse({ status: 200, description: 'Segment replaced successfully' })
  @ApiResponse({ status: 404, description: 'Journey or segment not found' })
  async replaceSegment(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) journeyId: number,
    @Param('segmentId', ParseIntPipe) segmentId: number,
    @Body() dto: { newServiceId: number },
  ): Promise<JourneyResponseDto> {
    return this.journeysService.replaceSegment(journeyId, segmentId, dto.newServiceId, userId);
  }

  @Patch(':id/recalculate-status')
  @ApiOperation({
    summary: 'Recalculate journey status based on booking states',
    description: 'Fix journey status to match the actual state of bookings. Useful after cancellations.',
  })
  @ApiResponse({ status: 200, description: 'Journey status recalculated' })
  @ApiResponse({ status: 404, description: 'Journey not found' })
  async recalculateStatus(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.recalculateJourneyStatus(id, userId);
  }

  @Post('recalculate-all-statuses')
  @ApiOperation({
    summary: 'Recalculate all journey statuses for current user',
    description: 'Fix all journey statuses to match actual booking states',
  })
  @ApiResponse({ status: 200, description: 'All journey statuses recalculated' })
  async recalculateAllStatuses(
    @GetUser('id') userId: number,
  ): Promise<{ updated: number; journeys: JourneyResponseDto[] }> {
    return this.journeysService.recalculateAllJourneyStatuses(userId);
  }
}
