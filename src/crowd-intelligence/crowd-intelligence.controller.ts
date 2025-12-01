import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CrowdIntelligenceService } from './services/crowd-intelligence.service.js';
import { SensorService } from './services/sensor.service.js';
import { PredictionService } from './services/prediction.service.js';
import {
  CrowdDataResponseDto,
  HeatmapResponseDto,
  PredictionResponseDto,
  RegisterSensorDto,
  SubmitSensorReadingDto,
  UpdateSensorDto,
} from './dto/index.js';
import { JwtGuard } from '../guard/jwt.guard.js';
import { RolesGuard } from '../guard/roles.guard.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { UserRole } from '../../generated/prisma/client/client.js';
import { SubscriptionService } from '../subscriptions/services/subscription.service.js';

@ApiTags('Crowd Intelligence')
@Controller({ path: 'crowd', version: '1' })
export class CrowdIntelligenceController {
  constructor(
    private readonly crowdService: CrowdIntelligenceService,
    private readonly sensorService: SensorService,
    private readonly predictionService: PredictionService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  // ============================================
  // CROWD DATA ENDPOINTS
  // ============================================

  @Get('location/:id')
  @ApiOperation({
    summary: 'Get current crowd data for a location',
    description:
      'Returns real-time crowd index (0-100) with breakdown of data sources',
  })
  @ApiParam({ name: 'id', description: 'Location ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Crowd data retrieved successfully',
    type: CrowdDataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async getCrowdData(
    @Param('id', ParseIntPipe) locationId: number,
  ): Promise<CrowdDataResponseDto> {
    return this.crowdService.getCurrentCrowdData(locationId);
  }

  @Get('heatmap')
  @ApiOperation({
    summary: 'Get crowd heatmap for multiple locations',
    description:
      'Returns crowd levels for all active locations for visualization on a map',
  })
  @ApiQuery({
    name: 'locationIds',
    required: false,
    description: 'Comma-separated location IDs',
    example: '1,2,3',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by location type',
    example: 'BEACH',
  })
  @ApiResponse({
    status: 200,
    description: 'Heatmap data retrieved successfully',
    type: HeatmapResponseDto,
  })
  async getHeatmap(
    @Query('locationIds') locationIds?: string,
    @Query('type') type?: string,
  ): Promise<HeatmapResponseDto> {
    const ids = locationIds ? locationIds.split(',').map((id) => parseInt(id)) : undefined;
    return this.crowdService.getHeatmap(ids, type);
  }

  // ============================================
  // PREDICTION ENDPOINTS
  // ============================================

  @Get('predictions/:locationId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get hourly crowd predictions for a location',
    description:
      'Returns predicted crowd levels for each hour of the specified date. FREE users: today only. PREMIUM users: up to 7 days ahead.',
  })
  @ApiParam({ name: 'locationId', description: 'Location ID', example: 1 })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Date for predictions (YYYY-MM-DD). Premium required for future dates.',
    example: '2025-12-01',
  })
  @ApiResponse({
    status: 200,
    description: 'Predictions retrieved successfully',
    type: PredictionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  @ApiResponse({ status: 403, description: 'Premium subscription required for multi-day predictions' })
  async getPredictions(
    @Param('locationId', ParseIntPipe) locationId: number,
    @Query('date') date?: string,
    @Req() req?: any,
  ): Promise<PredictionResponseDto> {
    const userId = req?.user?.sub;

    // Check if requesting future date
    if (date) {
      const requestedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      requestedDate.setHours(0, 0, 0, 0);

      const daysDifference = Math.floor(
        (requestedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // If requesting future date (not today), check premium
      if (daysDifference > 0) {
        if (!userId) {
          throw new ForbiddenException(
            'Authentication required for future predictions. Sign in or upgrade to Premium for 7-day predictions.',
          );
        }

        const isPremium = await this.subscriptionService.isPremium(userId);
        if (!isPremium) {
          throw new ForbiddenException(
            'Premium subscription required for future predictions. Upgrade now to access 7-day crowd predictions, unlimited price alerts, and more!',
          );
        }

        // Check 7-day limit even for premium
        if (daysDifference > 7) {
          throw new ForbiddenException(
            'Predictions are available up to 7 days in advance for Premium users.',
          );
        }
      }
    }

    return this.predictionService.getPredictions(locationId, date);
  }

  // ============================================
  // SENSOR MANAGEMENT ENDPOINTS
  // ============================================

  @Post('sensors')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Register a new IoT sensor',
    description:
      'Register WiFi, BLE, or camera sensor for real-time crowd counting (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Sensor registered successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async registerSensor(@Body() dto: RegisterSensorDto) {
    return this.sensorService.registerSensor(dto);
  }

  @Post('sensors/reading')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit sensor reading',
    description:
      'Submit crowd count reading from an IoT sensor. Readings are calibrated automatically.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reading submitted successfully',
  })
  @ApiResponse({ status: 404, description: 'Sensor not found' })
  async submitSensorReading(@Body() dto: SubmitSensorReadingDto) {
    return this.sensorService.submitReading(dto);
  }

  @Get('sensors/location/:locationId')
  @ApiOperation({
    summary: 'Get all sensors for a location',
    description: 'Returns all registered sensors with recent readings',
  })
  @ApiParam({ name: 'locationId', description: 'Location ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Sensors retrieved successfully',
  })
  async getSensorsByLocation(@Param('locationId', ParseIntPipe) locationId: number) {
    return this.sensorService.getSensorsByLocation(locationId);
  }

  @Get('sensors/:id')
  @ApiOperation({
    summary: 'Get sensor details',
    description: 'Get detailed information about a specific sensor',
  })
  @ApiParam({ name: 'id', description: 'Sensor ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Sensor details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Sensor not found' })
  async getSensor(@Param('id', ParseIntPipe) id: number) {
    return this.sensorService.getSensor(id);
  }

  @Get('sensors/:id/stats')
  @ApiOperation({
    summary: 'Get sensor statistics',
    description: 'Get statistical analysis of sensor readings over a time period',
  })
  @ApiParam({ name: 'id', description: 'Sensor ID', example: 1 })
  @ApiQuery({
    name: 'hours',
    required: false,
    description: 'Time period in hours',
    example: 24,
  })
  @ApiResponse({
    status: 200,
    description: 'Sensor statistics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Sensor not found' })
  async getSensorStats(
    @Param('id', ParseIntPipe) id: number,
    @Query('hours') hours?: number,
  ) {
    return this.sensorService.getSensorStats(id, hours || 24);
  }

  @Put('sensors/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update sensor configuration',
    description: 'Update sensor settings including calibration factor (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Sensor ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Sensor updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Sensor not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async updateSensor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSensorDto,
  ) {
    return this.sensorService.updateSensor(id, dto);
  }

  @Delete('sensors/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete sensor',
    description: 'Remove a sensor from the system (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Sensor ID', example: 1 })
  @ApiResponse({
    status: 204,
    description: 'Sensor deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Sensor not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async deleteSensor(@Param('id', ParseIntPipe) id: number) {
    return this.sensorService.deleteSensor(id);
  }
}
