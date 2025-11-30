import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockResolvedValue({
              status: 'ok',
              info: {},
              error: {},
              details: {},
            }),
          },
        },
        {
          provide: HttpHealthIndicator,
          useValue: {},
        },
        {
          provide: PrismaHealthIndicator,
          useValue: {
            pingCheck: jest.fn(),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: jest.fn(),
            checkRSS: jest.fn(),
          },
        },
        {
          provide: DiskHealthIndicator,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status', async () => {
      const result = await controller.check();
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('readiness', () => {
    it('should return readiness status', async () => {
      const result = await controller.readiness();
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
    });
  });

  describe('liveness', () => {
    it('should return liveness status', async () => {
      const result = await controller.liveness();
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
    });
  });
});
