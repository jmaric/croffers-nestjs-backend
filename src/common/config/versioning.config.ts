/**
 * API Versioning Configuration
 *
 * This file contains constants and utilities for API versioning.
 *
 * Usage in Controllers:
 *
 * @example
 * // Apply version to entire controller
 * @Controller({ path: 'services', version: API_VERSION_1 })
 * export class ServicesController { ... }
 *
 * @example
 * // Apply different versions to different endpoints
 * @Controller('services')
 * export class ServicesController {
 *   @Get()
 *   @Version(API_VERSION_1)
 *   findAllV1() { ... }
 *
 *   @Get()
 *   @Version(API_VERSION_2)
 *   findAllV2() { ... }
 * }
 *
 * @example
 * // Support multiple versions on the same endpoint
 * @Get()
 * @Version([API_VERSION_1, API_VERSION_2])
 * findAll() { ... }
 */

export const API_VERSION_1 = '1';
export const API_VERSION_2 = '2';

export const SUPPORTED_VERSIONS = [API_VERSION_1, API_VERSION_2] as const;

export type ApiVersion = typeof SUPPORTED_VERSIONS[number];

/**
 * Version changelog for documentation
 */
export const VERSION_CHANGELOG = {
  [API_VERSION_1]: {
    releaseDate: '2024-01-01',
    description: 'Initial API release with core functionality',
    features: [
      'User authentication and authorization',
      'Service listings and bookings',
      'Payment processing',
      'Reviews and ratings',
      'Messaging system',
      'Notifications',
      'Trip itineraries',
      'Favorites/Wishlists',
    ],
  },
  [API_VERSION_2]: {
    releaseDate: '2024-12-01',
    description: 'Enhanced API with new features and improvements',
    features: [
      'Improved search with advanced filters',
      'Batch operations support',
      'GraphQL endpoint (future)',
      'Enhanced analytics',
    ],
    breakingChanges: [
      'Response format changes for paginated endpoints',
      'Date format standardization to ISO 8601',
    ],
  },
};

/**
 * Helper to get the latest stable version
 */
export function getLatestVersion(): ApiVersion {
  return API_VERSION_2;
}

/**
 * Helper to check if a version is supported
 */
export function isVersionSupported(version: string): boolean {
  return SUPPORTED_VERSIONS.includes(version as ApiVersion);
}

/**
 * Helper to get version from request
 */
export function extractVersionFromUrl(url: string): string | null {
  const match = url.match(/\/api\/v(\d+)\//);
  return match ? match[1] : null;
}
