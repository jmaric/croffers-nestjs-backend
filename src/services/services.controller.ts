import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ServicesService } from './services.service.js';
import {
  UpdateServiceDto,
  FilterServiceDto,
  CreateTransportServiceDto,
  UpdateTransportServiceDto,
  CreateAccommodationServiceDto,
  UpdateAccommodationServiceDto,
  CreateTourServiceDto,
  UpdateTourServiceDto,
  CreateActivityServiceDto,
  UpdateActivityServiceDto,
  CheckAvailabilityDto,
} from './dto/index.js';
import { JwtGuard } from '../guard/index.js';
import { RolesGuard } from '../guard/roles.guard.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { UserRole, ServiceType } from '../../generated/prisma/client/client.js';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Transport Services
  @Post('transport')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  createTransport(
    @GetUser('id') userId: number,
    @Body() createTransportDto: CreateTransportServiceDto,
  ) {
    return this.servicesService.create(userId, ServiceType.TRANSPORT, createTransportDto);
  }

  @Patch('transport/:id')
  @UseGuards(JwtGuard)
  updateTransport(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
    @Body() updateTransportDto: UpdateTransportServiceDto,
  ) {
    return this.servicesService.updateSpecialized(id, userId, userRole, updateTransportDto);
  }

  // Accommodation Services
  @Post('accommodation')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  createAccommodation(
    @GetUser('id') userId: number,
    @Body() createAccommodationDto: CreateAccommodationServiceDto,
  ) {
    return this.servicesService.create(userId, ServiceType.ACCOMMODATION, createAccommodationDto);
  }

  @Patch('accommodation/:id')
  @UseGuards(JwtGuard)
  updateAccommodation(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
    @Body() updateAccommodationDto: UpdateAccommodationServiceDto,
  ) {
    return this.servicesService.updateSpecialized(id, userId, userRole, updateAccommodationDto);
  }

  // Tour Services
  @Post('tour')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  createTour(
    @GetUser('id') userId: number,
    @Body() createTourDto: CreateTourServiceDto,
  ) {
    return this.servicesService.create(userId, ServiceType.TOUR, createTourDto);
  }

  @Patch('tour/:id')
  @UseGuards(JwtGuard)
  updateTour(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
    @Body() updateTourDto: UpdateTourServiceDto,
  ) {
    return this.servicesService.updateSpecialized(id, userId, userRole, updateTourDto);
  }

  // Activity Services
  @Post('activity')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  createActivity(
    @GetUser('id') userId: number,
    @Body() createActivityDto: CreateActivityServiceDto,
  ) {
    return this.servicesService.create(userId, ServiceType.ACTIVITY, createActivityDto);
  }

  @Patch('activity/:id')
  @UseGuards(JwtGuard)
  updateActivity(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
    @Body() updateActivityDto: UpdateActivityServiceDto,
  ) {
    return this.servicesService.updateSpecialized(id, userId, userRole, updateActivityDto);
  }

  // Common Service Endpoints
  @Get()
  findAll(@Query() filterDto: FilterServiceDto) {
    return this.servicesService.findAll(filterDto);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.servicesService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, userId, userRole, updateServiceDto);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
  ) {
    return this.servicesService.remove(id, userId, userRole);
  }

  @Post('check-availability')
  checkAvailability(@Body() checkAvailabilityDto: CheckAvailabilityDto) {
    return this.servicesService.checkAvailability(
      checkAvailabilityDto.serviceId,
      checkAvailabilityDto.date,
      checkAvailabilityDto.quantity,
    );
  }
}