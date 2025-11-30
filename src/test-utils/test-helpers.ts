import {
  UserRole,
  UserStatus,
  BookingStatus,
  PaymentStatus,
  SupplierStatus,
  ReviewType,
} from '../../generated/prisma/client/client.js';

/**
 * Test data factories for creating mock objects
 */

export const createMockUser = (overrides?: Partial<any>) => ({
  id: 1,
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  hash: '$argon2id$v=19$m=65536,t=3,p=4$...',
  role: UserRole.TOURIST,
  status: UserStatus.ACTIVE,
  isEmailVerified: true,
  emailVerificationToken: null,
  emailVerificationExpires: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  phone: '+1234567890',
  avatar: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockSupplier = (overrides?: Partial<any>) => ({
  id: 1,
  userId: 1,
  businessName: 'Test Business',
  registrationNum: 'REG123',
  vatNumber: 'VAT123',
  status: SupplierStatus.APPROVED,
  commissionRate: 15.0,
  subscriptionTier: 'BASIC',
  isInsured: true,
  insuranceProvider: 'Test Insurance',
  insurancePolicyNum: 'POL123',
  insuranceExpiry: new Date('2025-12-31'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockService = (overrides?: Partial<any>) => ({
  id: 1,
  supplierId: 1,
  type: 'ACCOMMODATION',
  name: 'Test Service',
  slug: 'test-service',
  description: 'Test description',
  price: 100.0,
  currency: 'EUR',
  capacity: 10,
  tags: ['test'],
  status: 'APPROVED',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockBooking = (overrides?: Partial<any>) => ({
  id: 1,
  userId: 1,
  supplierId: 1,
  bookingReference: 'BOOK-123',
  serviceDate: new Date('2024-12-01'),
  status: BookingStatus.CONFIRMED,
  subtotal: 100.0,
  commission: 15.0,
  totalAmount: 115.0,
  specialRequests: null,
  cancellationReason: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockReview = (overrides?: Partial<any>) => ({
  id: 1,
  userId: 1,
  serviceId: 1,
  supplierId: 1,
  bookingId: 1,
  reviewType: ReviewType.GUEST_TO_SUPPLIER,
  wouldRecommend: true,
  tag: 'Super clean',
  isPublished: false,
  publishAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours from now
  isVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockPayment = (overrides?: Partial<any>) => ({
  id: 1,
  bookingId: 1,
  stripePaymentIntentId: 'pi_123',
  amount: 115.0,
  currency: 'EUR',
  status: PaymentStatus.COMPLETED,
  paymentMethod: 'card',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/**
 * Helper to create a mock authenticated user context
 */
export const createAuthContext = (user: Partial<any> = {}) => ({
  user: createMockUser(user),
});

/**
 * Helper to wait for async operations in tests
 */
export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper to create date offsets for testing
 */
export const daysFromNow = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

export const hoursFromNow = (hours: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};