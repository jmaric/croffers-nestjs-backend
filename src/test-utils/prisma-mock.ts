import { PrismaClient } from '../../generated/prisma/client/client.js';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

export const createMockPrismaClient = (): MockPrismaClient => {
  return mockDeep<PrismaClient>();
};

export const resetMockPrismaClient = (prisma: MockPrismaClient): void => {
  mockReset(prisma);
};