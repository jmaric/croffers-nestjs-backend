import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditAction, Prisma } from "../../generated/prisma/client/client.js";

export interface CreateAuditLogDto {
  userId?: number;
  action: AuditAction;
  entity: string;
  entityId?: number;
  description?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
}

export interface AuditLogFilterDto {
  userId?: number;
  action?: AuditAction;
  entity?: string;
  entityId?: number;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(data: CreateAuditLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          description: data.description,
          metadata: data.metadata || Prisma.JsonNull,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          endpoint: data.endpoint,
          method: data.method,
          statusCode: data.statusCode,
        },
      });
    } catch (error) {
      // Log error but don't throw - audit logging should not break the application
      console.error('Failed to create audit log:', error);
      return null;
    }
  }

  async findAll(filter: AuditLogFilterDto = {}) {
    const { page = 1, limit = 50, ...filterParams } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (filterParams.userId) {
      where.userId = filterParams.userId;
    }

    if (filterParams.action) {
      where.action = filterParams.action;
    }

    if (filterParams.entity) {
      where.entity = filterParams.entity;
    }

    if (filterParams.entityId) {
      where.entityId = filterParams.entityId;
    }

    if (filterParams.startDate || filterParams.endDate) {
      where.createdAt = {};
      if (filterParams.startDate) {
        where.createdAt.gte = filterParams.startDate;
      }
      if (filterParams.endDate) {
        where.createdAt.lte = filterParams.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async getUserLogs(userId: number, page = 1, limit = 50) {
    return this.findAll({ userId, page, limit });
  }

  async getEntityLogs(entity: string, entityId: number) {
    return this.findAll({ entity, entityId });
  }

  async getStats(startDate?: Date, endDate?: Date) {
    const where: Prisma.AuditLogWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalLogs, actionCounts, entityCounts, recentLogs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        _count: { entity: true },
      }),
      this.prisma.auditLog.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      totalLogs,
      actionCounts: actionCounts.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      entityCounts: entityCounts.map((e) => ({
        entity: e.entity,
        count: e._count.entity,
      })),
      recentLogs,
    };
  }

  async cleanupOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return {
      deleted: result.count,
      cutoffDate,
    };
  }
}
