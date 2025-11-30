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
import { SuppliersService } from './suppliers.service.js';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  FilterSupplierDto,
  ApproveSupplierDto,
} from './dto/index.js';
import { JwtGuard } from '../guard/index.js';
import { RolesGuard } from '../guard/roles.guard.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { UserRole } from '../../generated/prisma/client/client.js';

@ApiTags('Suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  create(
    @GetUser('id') userId: number,
    @Body() createSupplierDto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(userId, createSupplierDto);
  }

  @Get()
  findAll(@Query() filterDto: FilterSupplierDto) {
    return this.suppliersService.findAll(filterDto);
  }

  @Get('me')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  findMyProfile(@GetUser('id') userId: number) {
    return this.suppliersService.findByUserId(userId);
  }

  @Get('dashboard')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  getDashboard(@GetUser('id') userId: number) {
    return this.suppliersService.getDashboard(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, userId, userRole, updateSupplierDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveSupplierDto: ApproveSupplierDto,
  ) {
    return this.suppliersService.updateStatus(id, approveSupplierDto);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
  ) {
    return this.suppliersService.remove(id, userId, userRole);
  }
}