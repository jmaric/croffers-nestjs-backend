import {
  Controller,
  Get,
  Query,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditService, AuditLogFilterDto } from './audit.service.js';
import { JwtGuard } from '../auth/guard/jwt.guard.js';
import { RolesGuard } from '../guard/roles.guard.js';
import { Roles } from '../auth/decorator/roles.decorator.js';
import { UserRole, AuditAction } from '../../generated/prisma/client/index.js';

@ApiTags('Audit Logs')
@Controller({ path: 'audit-logs', version: '1' })
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit logs (Admin only)' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'entity', required: false, type: String })
  @ApiQuery({ name: 'entityId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated audit logs',
  })
  async findAll(@Query() filter: AuditLogFilterDto) {
    // Convert date strings to Date objects
    if (filter.startDate) {
      filter.startDate = new Date(filter.startDate as any);
    }
    if (filter.endDate) {
      filter.endDate = new Date(filter.endDate as any);
    }

    return this.auditService.findAll(filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Returns audit log statistics',
  })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get audit logs for a specific user (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated audit logs for the user',
  })
  async getUserLogs(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getUserLogs(userId, page, limit);
  }

  @Get('entity/:entity/:entityId')
  @ApiOperation({
    summary: 'Get audit logs for a specific entity (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns audit logs for the entity',
  })
  async getEntityLogs(
    @Param('entity') entity: string,
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.auditService.getEntityLogs(entity, entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single audit log by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the audit log',
  })
  @ApiResponse({
    status: 404,
    description: 'Audit log not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.findOne(id);
  }

  @Delete('cleanup')
  @ApiOperation({
    summary: 'Clean up old audit logs (Admin only)',
    description: 'Deletes audit logs older than specified days (default: 90)',
  })
  @ApiQuery({
    name: 'daysToKeep',
    required: false,
    type: Number,
    example: 90,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the number of deleted logs',
  })
  async cleanupOldLogs(@Query('daysToKeep') daysToKeep?: number) {
    return this.auditService.cleanupOldLogs(
      daysToKeep ? parseInt(String(daysToKeep), 10) : 90,
    );
  }
}
