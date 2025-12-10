import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { DisputesService } from './disputes.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { GetUser } from '../auth/decorator/get-user.decorator.js';
import { CreateDisputeDto } from './dto/create-dispute.dto.js';
import { UpdateDisputeStatusDto } from './dto/update-dispute-status.dto.js';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto.js';
import { AddDisputeNoteDto } from './dto/add-dispute-note.dto.js';
import { FilterDisputeDto } from './dto/filter-dispute.dto.js';

@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  create(@GetUser('id') userId: number, @Body() createDisputeDto: CreateDisputeDto) {
    return this.disputesService.create(userId, createDisputeDto);
  }

  @Get()
  @Roles('ADMIN')
  findAll(@Query() filters: FilterDisputeDto) {
    return this.disputesService.findAll(filters);
  }

  @Get('my-disputes')
  findMyDisputes(@GetUser('id') userId: number) {
    return this.disputesService.findMyDisputes(userId);
  }

  @Get('stats')
  @Roles('ADMIN')
  getStats() {
    return this.disputesService.getStats();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: string,
  ) {
    return this.disputesService.findOne(id, userId, userRole);
  }

  @Patch(':id/assign')
  @Roles('ADMIN')
  assignToAdmin(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') adminId: number,
  ) {
    return this.disputesService.assignToAdmin(id, adminId);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDisputeStatusDto: UpdateDisputeStatusDto,
  ) {
    return this.disputesService.updateStatus(id, updateDisputeStatusDto);
  }

  @Patch(':id/resolve')
  @Roles('ADMIN')
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() resolveDisputeDto: ResolveDisputeDto,
    @GetUser('id') adminId: number,
  ) {
    return this.disputesService.resolve(id, resolveDisputeDto, adminId);
  }

  @Post(':id/notes')
  @Roles('ADMIN')
  addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() addDisputeNoteDto: AddDisputeNoteDto,
    @GetUser('id') adminId: number,
  ) {
    return this.disputesService.addNote(id, addDisputeNoteDto.note, adminId);
  }
}
