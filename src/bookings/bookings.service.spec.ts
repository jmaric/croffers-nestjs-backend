import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { ServicesService } from '../services/services.service.js';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '../../generated/prisma/client/client.js';
import {
  createMockUser,
  createMockBooking,
  createMockService,
  createMockSupplier,
  daysFromNow,
} from '../test-utils/test-helpers.js';
import { createMockPrismaClient } from '../test-utils/prisma-mock.js';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: ReturnType<typeof createMockPrismaClient>;
  let mailService: jest.Mocked<MailService>;
  let servicesService: jest.Mocked<ServicesService>;

  beforeEach(async () => {
    prisma = createMockPrismaClient();
    mailService = {
      sendBookingConfirmation: jest.fn(),
      sendBookingCancellation: jest.fn(),
    } as any;
    servicesService = {
      checkAvailability: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
        {
          provide: ServicesService,
          useValue: servicesService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 1;
    const createBookingDto = {
      serviceDate: daysFromNow(7).toISOString(),
      items: [
        {
          serviceId: 1,
          quantity: 2,
          metadata: null,
        },
      ],
      notes: 'Test booking',
    };

    it('should create a booking successfully', async () => {
      const mockService = {
        ...createMockService({ id: 1, price: new Prisma.Decimal(100) }),
        supplier: createMockSupplier({ id: 1, commissionRate: new Prisma.Decimal(0.15) }),
      };

      const mockBooking = {
        ...createMockBooking({
          userId,
          supplierId: 1,
          status: BookingStatus.PENDING,
        }),
        bookingItems: [
          {
            serviceId: 1,
            quantity: 2,
            unitPrice: new Prisma.Decimal(100),
            totalPrice: new Prisma.Decimal(200),
            service: { id: 1, name: 'Test Service', type: 'ACCOMMODATION' },
          },
        ],
        supplier: {
          id: 1,
          businessName: 'Test Supplier',
          user: { email: 'supplier@test.com', firstName: 'John', lastName: 'Doe' },
        },
        user: {
          id: 1,
          email: 'user@test.com',
          firstName: 'Jane',
          lastName: 'Doe',
        },
      };

      prisma.service.findMany.mockResolvedValue([mockService] as any);
      servicesService.checkAvailability.mockResolvedValue({
        available: true,
        requestedQuantity: 2,
        service: { id: 1, name: 'Test Service' },
      } as any);
      prisma.booking.create.mockResolvedValue(mockBooking as any);

      const result = await service.create(userId, createBookingDto);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(prisma.booking.create).toHaveBeenCalled();
      expect(mailService.sendBookingConfirmation).toHaveBeenCalledWith(mockBooking);
    });

    it('should throw BadRequestException if service date is in the past', async () => {
      const pastBookingDto = {
        ...createBookingDto,
        serviceDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      };

      await expect(service.create(userId, pastBookingDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, pastBookingDto)).rejects.toThrow(
        'Service date must be in the future',
      );
    });

    it('should throw NotFoundException if service does not exist', async () => {
      prisma.service.findMany.mockResolvedValue([]);

      await expect(service.create(userId, createBookingDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(userId, createBookingDto)).rejects.toThrow(
        'One or more services not found',
      );
    });

    it('should throw BadRequestException if service is inactive', async () => {
      const inactiveService = {
        ...createMockService({ id: 1, isActive: false, name: 'Inactive Service' }),
        supplier: createMockSupplier({ id: 1 }),
      };

      prisma.service.findMany.mockResolvedValue([inactiveService] as any);

      await expect(service.create(userId, createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createBookingDto)).rejects.toThrow(
        'Service "Inactive Service" is not available',
      );
    });

    it('should throw BadRequestException if services belong to different suppliers', async () => {
      const multiSupplierDto = {
        ...createBookingDto,
        items: [
          { serviceId: 1, quantity: 1, metadata: null },
          { serviceId: 2, quantity: 1, metadata: null },
        ],
      };

      const mockServices = [
        {
          ...createMockService({ id: 1, supplierId: 1 }),
          supplier: createMockSupplier({ id: 1 }),
        },
        {
          ...createMockService({ id: 2, supplierId: 2 }),
          supplier: createMockSupplier({ id: 2 }),
        },
      ];

      prisma.service.findMany.mockResolvedValue(mockServices as any);

      await expect(service.create(userId, multiSupplierDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, multiSupplierDto)).rejects.toThrow(
        'All services in a booking must be from the same supplier',
      );
    });

    it('should throw BadRequestException if service is not available', async () => {
      const mockService = {
        ...createMockService({ id: 1, price: new Prisma.Decimal(100) }),
        supplier: createMockSupplier({ id: 1, commissionRate: new Prisma.Decimal(0.15) }),
      };

      prisma.service.findMany.mockResolvedValue([mockService] as any);
      servicesService.checkAvailability.mockResolvedValue({
        available: false,
        requestedQuantity: 10,
        availableCapacity: 5,
        service: { id: 1, name: 'Test Service' },
      } as any);

      await expect(service.create(userId, createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createBookingDto)).rejects.toThrow(
        'Services not available',
      );
    });

    it('should calculate total amount and commission correctly', async () => {
      const mockService = {
        ...createMockService({ id: 1, price: new Prisma.Decimal(100) }),
        supplier: createMockSupplier({
          id: 1,
          commissionRate: new Prisma.Decimal(0.15), // 15%
        }),
      };

      prisma.service.findMany.mockResolvedValue([mockService] as any);
      servicesService.checkAvailability.mockResolvedValue({
        available: true,
        requestedQuantity: 2,
        service: { id: 1, name: 'Test Service' },
      } as any);

      let capturedBookingData: any;
      prisma.booking.create.mockImplementation((args: any) => {
        capturedBookingData = args.data;
        return Promise.resolve({
          ...createMockBooking(),
          bookingItems: [],
          supplier: { id: 1, businessName: 'Test', user: {} },
          user: { id: 1, email: 'test@test.com', firstName: 'Test', lastName: 'User' },
        } as any);
      });

      await service.create(userId, createBookingDto);

      expect(capturedBookingData.totalAmount).toEqual(new Prisma.Decimal(200)); // 100 * 2
      expect(capturedBookingData.commission).toEqual(new Prisma.Decimal(30)); // 200 * 0.15
    });

    it('should create booking with multiple items', async () => {
      const multiItemDto = {
        ...createBookingDto,
        items: [
          { serviceId: 1, quantity: 2, metadata: null },
          { serviceId: 2, quantity: 1, metadata: null },
        ],
      };

      const mockServices = [
        {
          ...createMockService({ id: 1, supplierId: 1, price: new Prisma.Decimal(100) }),
          supplier: createMockSupplier({ id: 1, commissionRate: new Prisma.Decimal(0.15) }),
        },
        {
          ...createMockService({ id: 2, supplierId: 1, price: new Prisma.Decimal(50) }),
          supplier: createMockSupplier({ id: 1, commissionRate: new Prisma.Decimal(0.15) }),
        },
      ];

      prisma.service.findMany.mockResolvedValue(mockServices as any);
      servicesService.checkAvailability.mockResolvedValue({
        available: true,
        service: { id: 1, name: 'Test' },
      } as any);

      let capturedBookingData: any;
      prisma.booking.create.mockImplementation((args: any) => {
        capturedBookingData = args.data;
        return Promise.resolve({
          ...createMockBooking(),
          bookingItems: [],
          supplier: { id: 1, businessName: 'Test', user: {} },
          user: { id: 1, email: 'test@test.com', firstName: 'Test', lastName: 'User' },
        } as any);
      });

      await service.create(userId, multiItemDto);

      expect(capturedBookingData.bookingItems.create).toHaveLength(2);
      expect(capturedBookingData.totalAmount).toEqual(new Prisma.Decimal(250)); // (100*2) + (50*1)
    });

    it('should set booking status to PENDING', async () => {
      const mockService = {
        ...createMockService({ id: 1, price: new Prisma.Decimal(100) }),
        supplier: createMockSupplier({ id: 1, commissionRate: new Prisma.Decimal(0.15) }),
      };

      prisma.service.findMany.mockResolvedValue([mockService] as any);
      servicesService.checkAvailability.mockResolvedValue({
        available: true,
        service: { id: 1, name: 'Test' },
      } as any);

      let capturedBookingData: any;
      prisma.booking.create.mockImplementation((args: any) => {
        capturedBookingData = args.data;
        return Promise.resolve({
          ...createMockBooking(),
          bookingItems: [],
          supplier: { id: 1, businessName: 'Test', user: {} },
          user: { id: 1, email: 'test@test.com', firstName: 'Test', lastName: 'User' },
        } as any);
      });

      await service.create(userId, createBookingDto);

      expect(capturedBookingData.status).toBe(BookingStatus.PENDING);
    });
  });

  describe('findAll', () => {
    it('should return paginated bookings', async () => {
      const mockBookings = [
        createMockBooking({ id: 1 }),
        createMockBooking({ id: 2 }),
      ];

      prisma.booking.findMany.mockResolvedValue(mockBookings as any);
      prisma.booking.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by userId', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAll({ userId: 1, page: 1, limit: 10 });

      const whereClause = prisma.booking.findMany.mock.calls[0][0].where;
      expect(whereClause.userId).toBe(1);
    });

    it('should filter by supplierId', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAll({ supplierId: 1, page: 1, limit: 10 });

      const whereClause = prisma.booking.findMany.mock.calls[0][0].where;
      expect(whereClause.supplierId).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAll({ status: BookingStatus.CONFIRMED, page: 1, limit: 10 });

      const whereClause = prisma.booking.findMany.mock.calls[0][0].where;
      expect(whereClause.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should filter by date range', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      const dateFrom = '2024-01-01';
      const dateTo = '2024-12-31';

      await service.findAll({ dateFrom, dateTo, page: 1, limit: 10 });

      const whereClause = prisma.booking.findMany.mock.calls[0][0].where;
      expect(whereClause.serviceDate.gte).toEqual(new Date(dateFrom));
      expect(whereClause.serviceDate.lte).toEqual(new Date(dateTo));
    });

    it('should calculate pagination correctly', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        }),
      );
      expect(result.meta.totalPages).toBe(5); // 50 / 10
    });
  });
});