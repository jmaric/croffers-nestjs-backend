import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'General health check' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
    ]);
  }

  @Get('/ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe for Kubernetes/load balancers' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  readiness() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }

  @Get('/live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe for Kubernetes/load balancers' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  @ApiResponse({ status: 503, description: 'Application is dead' })
  liveness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024), // 200MB
    ]);
  }
}
