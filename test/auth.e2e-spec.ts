import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);

    // Clean up database before tests
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.user.deleteMany();
  });

  describe('/auth/signup (POST)', () => {
    it('should create a new user with hashed password', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Please check your email');
      expect(response.body.user).toHaveProperty('email', signupDto.email);
      expect(response.body.user).not.toHaveProperty('hash');

      // Verify user was created in database with hashed password
      const user = await prisma.user.findUnique({
        where: { email: signupDto.email },
      });

      expect(user).toBeDefined();
      expect(user.hash).not.toBe(signupDto.password); // Password should be hashed
      expect(user.hash).toContain('$argon2'); // Argon2 hash format
      expect(user.status).toBe('INACTIVE'); // Should start as inactive
      expect(user.emailVerified).toBe(false);
      expect(user.emailVerificationToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const signupDto = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
      };

      // First signup should succeed
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      // Second signup with same email should fail
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(403);

      expect(response.body.message).toContain('Credentials taken');
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('should validate password is provided', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Create a verified, active user for login tests
      const user = await prisma.user.create({
        data: {
          email: 'login@example.com',
          hash: '$argon2id$v=19$m=65536,t=3,p=4$test', // This will be replaced by actual hash in signup
          status: 'ACTIVE',
          emailVerified: true,
        },
      });

      // Actually create user via signup for real password hash
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'activeuser@example.com',
          password: 'TestPassword123!',
        });

      // Manually activate the user for login tests
      await prisma.user.update({
        where: { email: 'activeuser@example.com' },
        data: {
          status: 'ACTIVE',
          emailVerified: true,
        },
      });
    });

    it('should login with valid credentials and return JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'activeuser@example.com',
          password: 'TestPassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.access_token).toBeDefined();
      expect(typeof response.body.access_token).toBe('string');

      expect(response.body.user).toHaveProperty('email', 'activeuser@example.com');
      expect(response.body.user).not.toHaveProperty('hash');
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'activeuser@example.com',
          password: 'WrongPassword123!',
        })
        .expect(403);

      expect(response.body.message).toContain('Credentials incorrect');
    });

    it('should reject login for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        })
        .expect(403);

      expect(response.body.message).toContain('Credentials incorrect');
    });

    it('should reject login if email is not verified', async () => {
      // Create unverified user
      await request(app.getHttpServer()).post('/auth/signup').send({
        email: 'unverified@example.com',
        password: 'TestPassword123!',
      });

      // Try to login without verifying email
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'TestPassword123!',
        })
        .expect(403);

      expect(response.body.message).toContain('verify your email');
    });

    it('should reject login if user status is not ACTIVE', async () => {
      // Create user and set to INACTIVE
      await request(app.getHttpServer()).post('/auth/signup').send({
        email: 'inactive@example.com',
        password: 'TestPassword123!',
      });

      await prisma.user.update({
        where: { email: 'inactive@example.com' },
        data: {
          emailVerified: true,
          status: 'INACTIVE',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'TestPassword123!',
        })
        .expect(403);

      expect(response.body.message).toContain('not active');
    });
  });

  describe('/auth/forgot-password (POST)', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/signup').send({
        email: 'forgot@example.com',
        password: 'TestPassword123!',
      });
    });

    it('should generate reset token for existing user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'forgot@example.com',
        })
        .expect(200);

      expect(response.body.message).toContain('If the email exists');

      // Verify reset token was created
      const user = await prisma.user.findUnique({
        where: { email: 'forgot@example.com' },
      });

      expect(user.resetToken).toBeDefined();
      expect(user.resetTokenExpiry).toBeDefined();
      expect(user.resetTokenExpiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      // Should return same message for security
      expect(response.body.message).toContain('If the email exists');
    });
  });

  describe('/auth/reset-password (POST)', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Create user and generate reset token
      await request(app.getHttpServer()).post('/auth/signup').send({
        email: 'reset@example.com',
        password: 'OldPassword123!',
      });

      await request(app.getHttpServer()).post('/auth/forgot-password').send({
        email: 'reset@example.com',
      });

      // Get the reset token from database
      const user = await prisma.user.findUnique({
        where: { email: 'reset@example.com' },
      });
      resetToken = user.resetToken;
    });

    it('should reset password with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      expect(response.body.message).toContain('successfully');

      // Verify password was changed and token cleared
      const user = await prisma.user.findUnique({
        where: { email: 'reset@example.com' },
      });

      expect(user.resetToken).toBeNull();
      expect(user.resetTokenExpiry).toBeNull();
      expect(user.hash).not.toContain('OldPassword'); // Should be new hash
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should reject expired reset token', async () => {
      // Set token expiry to past
      await prisma.user.update({
        where: { email: 'reset@example.com' },
        data: {
          resetTokenExpiry: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid or expired');
    });
  });
});