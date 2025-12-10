import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Generate cache key from request URL and query params
    const cacheKey = this.generateCacheKey(request);

    console.log('[CACHE] Looking for cache key:', cacheKey);

    // Try to get cached response
    const cachedResponse = await this.cacheManager.get(cacheKey);

    if (cachedResponse) {
      // Set header to indicate cache hit
      response.set('X-Cache', 'HIT');
      console.log('[CACHE] HIT for key:', cacheKey);
      return of(cachedResponse);
    }

    console.log('[CACHE] MISS for key:', cacheKey);
    // Set header to indicate cache miss
    response.set('X-Cache', 'MISS');

    // Continue with request and cache the response
    return next.handle().pipe(
      tap(async (data) => {
        console.log('[CACHE] Storing cache key:', cacheKey);
        await this.cacheManager.set(cacheKey, data);
      }),
    );
  }

  private generateCacheKey(request: any): string {
    const url = request.url;
    const userId = request.user?.id || 'anonymous';
    return `http-cache:${userId}:${url}`;
  }
}
