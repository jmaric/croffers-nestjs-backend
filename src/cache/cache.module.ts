import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import type { RedisClientOptions } from 'redis';
import { CacheService } from './cache.service.js';
import { HttpCacheInterceptor } from './cache.interceptor.js';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT');
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const redisTtl = configService.get<number>('REDIS_TTL', 3600);

        // If Redis is configured, use it
        if (redisHost && redisPort) {
          try {
            console.log(`🔄 Connecting to Redis at ${redisHost}:${redisPort}`);
            return {
              store: await redisStore({
                socket: {
                  host: redisHost,
                  port: redisPort,
                },
                password: redisPassword || undefined,
                ttl: redisTtl * 1000, // Convert to milliseconds
              }),
            };
          } catch (error) {
            console.warn(
              '⚠️  Redis connection failed, falling back to in-memory cache',
              error,
            );
            // Fallback to in-memory cache
            return {
              ttl: redisTtl * 1000,
              max: 1000, // Maximum number of items in cache
            };
          }
        }

        // Default to in-memory cache
        console.log('📦 Using in-memory cache (Redis not configured)');
        return {
          ttl: redisTtl * 1000,
          max: 1000,
        };
      },
    }),
  ],
  providers: [CacheService, HttpCacheInterceptor],
  exports: [NestCacheModule, CacheService, HttpCacheInterceptor],
})
export class CacheModule {}
