import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { config } from 'dotenv';
import { json } from 'express';
import * as express from 'express';
import * as path from 'path';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { initializeSentry } from './common/config/sentry.config.js';
import { SentryFilter } from './common/filters/sentry.filter.js';
import * as Sentry from '@sentry/node';

config();

// Initialize Sentry before anything else
initializeSentry();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use Winston for logging
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Global exception filter for Sentry
  app.useGlobalFilters(new SentryFilter());

  // ============================================
  // API VERSIONING
  // ============================================
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // ============================================
  // PERFORMANCE MIDDLEWARE
  // ============================================

  // Response compression (gzip)
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024, // Only compress responses larger than 1KB
      level: 6, // Compression level (0-9, 6 is default)
    }),
  );

  // Serve static files (for local file uploads)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ============================================
  // SECURITY MIDDLEWARE
  // ============================================

  // Helmet - Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS - Configure allowed origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 3600,
  });

  // Input Sanitization - Prevent NoSQL injection
  // Skip for Swagger docs to avoid conflicts
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/docs') || req.path.startsWith('/api-json')) {
      return next();
    }
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        console.warn(`Sanitized input detected: ${key} in ${req.path}`);
      },
    })(req, res, next);
  });

  // Configure JSON parsing with raw body for Stripe webhooks
  app.use((req: any, res: any, next: any) => {
    if (
      req.originalUrl === '/api/v1/payments/webhook' ||
      req.originalUrl === '/api/v1/subscriptions/webhooks/stripe'
    ) {
      let data = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        data += chunk;
      });
      req.on('end', () => {
        req.rawBody = data;
        next();
      });
    } else {
      next();
    }
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Croffers Nest API')
    .setDescription(
      'Marketplace API for booking accommodations, activities, tours, and transport services with anti-manipulation review system',
    )
    .setVersion('1.0')
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Users', 'User profile management')
    .addTag('Suppliers', 'Supplier management and registration')
    .addTag('Services', 'Service listings (accommodations, activities, tours, transport)')
    .addTag('Bookings', 'Booking management and lifecycle')
    .addTag('Payments', 'Payment processing with Stripe')
    .addTag('Reviews', 'Anti-manipulation review system with trust scores')
    .addTag('Locations', 'Location management and event density data')
    .addTag('Journeys', 'Multi-modal journey planning from airport to destination')
    .addTag('Ferries', 'Ferry schedule search and booking for island travel')
    .addTag('Buses', 'Bus schedule search and booking with operator API integration')
    .addTag('Events', 'Event discovery for concerts, festivals, beach parties, and nightlife')
    .addTag('Crowd Intelligence', 'Real-time crowd levels, predictions, and heatmaps powered by Google, Instagram, TikTok, Weather, and IoT sensors')
    .addTag('Advanced Booking', 'Group bookings with discounts, multi-service packages, flexible date search, price alerts, and booking modifications')
    .addTag('Subscriptions', 'Tourist premium subscriptions with Stripe integration - €4.99/month or €49/year for 7-day predictions, unlimited price alerts, and more')
    .addTag('Supplier Premium', 'Supplier à la carte premium add-ons: Analytics Pro (€29/mo), API Access (€49/mo), Marketing Suite (€39/mo), Commission Reduction (€99/mo), Priority Support (€19/mo)')
    .addTag('Social & Sharing', 'Share itineraries with friends, post travel stories with photos, build your travel network, discover others\' trips, fork itineraries, collaborative planning, and activity feeds')
    .addTag('AI & Personalization', 'Smart recommendations, personalized suggestions, AI chat assistant, user preferences, dynamic pricing, and behavior tracking')
    .addTag('Upload', 'File upload management (S3/Cloudinary/Local)')
    .addTag('Audit Logs', 'Audit log management and statistics (Admin only)')
    .addTag('GDPR Compliance', 'Data export, deletion, and consent management')
    .addTag('Version', 'API version information and changelog')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Croffers Nest API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3333;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
