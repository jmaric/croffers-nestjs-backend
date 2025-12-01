import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import * as request from 'supertest';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

export async function createTestUser(
  app: INestApplication,
): Promise<{ user: any; token: string }> {
  const email = `test${Date.now()}@example.com`;
  const password = 'Test@1234';

  const signupResponse = await request(app.getHttpServer())
    .post('/auth/signup')
    .send({ email, password })
    .expect(201);

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/signin')
    .send({ email, password })
    .expect(200);

  return {
    user: signupResponse.body.user,
    token: loginResponse.body.access_token,
  };
}

export function getAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}
