import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Clear entire cache
   * Note: This functionality depends on the cache store implementation
   */
  async reset(): Promise<void> {
    // The reset method is not available in cache-manager v6+
    // You would need to implement this based on your specific cache store
    console.warn('Cache reset not implemented for cache-manager v6+');
  }

  /**
   * Delete keys matching a pattern (useful for cache invalidation)
   */
  async delPattern(pattern: string): Promise<void> {
    // Pattern deletion requires specific implementation based on cache store
    console.warn(
      'Pattern deletion not implemented. Use specific cache store methods.',
    );
  }

  /**
   * Cache a function result with automatic key generation
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }
}
