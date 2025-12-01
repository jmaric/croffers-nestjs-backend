# API Versioning Guide

This document explains how API versioning is implemented in the Croffer's Nest backend and how to use it.

## Overview

The API uses **URI-based versioning** with the format `/api/v{version}/...`. For example:

```
/api/v1/services
/api/v2/services
```

## Configuration

API versioning is configured in `src/main.ts`:

```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
  prefix: 'api/v',
});
```

**Key Settings:**
- **Type**: `VersioningType.URI` - Versions are specified in the URL
- **Default Version**: `'1'` - If no version is specified, v1 is used
- **Prefix**: `'api/v'` - All versioned routes start with `/api/v{version}`

## Supported Versions

Currently supported versions:
- **v1** - Initial release (current stable)
- **v2** - Next generation (in development)

Check supported versions at runtime: `GET /api/version`

## How to Version Your Controllers

### Option 1: Version the Entire Controller

Apply a version to all routes in a controller:

```typescript
import { Controller, Get } from '@nestjs/common';
import { API_VERSION_1 } from '../common/config/versioning.config.js';

@Controller({ path: 'services', version: API_VERSION_1 })
export class ServicesController {
  @Get()
  findAll() {
    // This endpoint will be available at: /api/v1/services
    return this.servicesService.findAll();
  }
}
```

### Option 2: Version Individual Routes

Apply different versions to different endpoints in the same controller:

```typescript
import { Controller, Get, Version } from '@nestjs/common';
import { API_VERSION_1, API_VERSION_2 } from '../common/config/versioning.config.js';

@Controller('services')
export class ServicesController {
  @Get()
  @Version(API_VERSION_1)
  findAllV1() {
    // Available at: /api/v1/services
    return this.servicesService.findAll();
  }

  @Get()
  @Version(API_VERSION_2)
  findAllV2() {
    // Available at: /api/v2/services
    // New implementation with enhanced features
    return this.servicesService.findAllEnhanced();
  }
}
```

### Option 3: Support Multiple Versions

Support multiple versions on the same endpoint:

```typescript
import { Controller, Get, Version } from '@nestjs/common';
import { API_VERSION_1, API_VERSION_2 } from '../common/config/versioning.config.js';

@Controller('services')
export class ServicesController {
  @Get()
  @Version([API_VERSION_1, API_VERSION_2])
  findAll() {
    // Available at both: /api/v1/services AND /api/v2/services
    return this.servicesService.findAll();
  }
}
```

### Option 4: Version-Neutral Endpoints

Some endpoints (like health checks) don't need versioning:

```typescript
@Controller('health')
export class HealthController {
  @Get()
  check() {
    // Available at: /health (no version prefix)
    return { status: 'ok' };
  }
}
```

## Migration Strategy

### When to Create a New Version

Create a new API version when:
- Making **breaking changes** to request/response formats
- Removing or renaming fields
- Changing authentication mechanisms
- Modifying core business logic that affects clients

### When NOT to Create a New Version

Don't create a new version for:
- Adding new **optional** fields
- Adding new endpoints
- Bug fixes
- Performance improvements
- Internal refactoring

### Step-by-Step Migration Process

#### 1. Plan the Breaking Changes

Document what's changing and why:

```typescript
// src/common/config/versioning.config.ts
export const VERSION_CHANGELOG = {
  [API_VERSION_2]: {
    releaseDate: '2024-12-01',
    description: 'Enhanced API with new features',
    breakingChanges: [
      'Response format changes for paginated endpoints',
      'Date format standardization to ISO 8601',
    ],
  },
};
```

#### 2. Create New Version Controllers

**Option A: Duplicate Controller (Recommended for major changes)**

```typescript
// src/services/v1/services.controller.ts
@Controller({ path: 'services', version: API_VERSION_1 })
export class ServicesV1Controller {
  // Old implementation
}

// src/services/v2/services.controller.ts
@Controller({ path: 'services', version: API_VERSION_2 })
export class ServicesV2Controller {
  // New implementation with breaking changes
}
```

**Option B: Method-Level Versioning (For minor changes)**

```typescript
@Controller('services')
export class ServicesController {
  @Get(':id')
  @Version(API_VERSION_1)
  findOneV1(@Param('id') id: string) {
    return { id, name: 'Service', price: 100 };
  }

  @Get(':id')
  @Version(API_VERSION_2)
  findOneV2(@Param('id') id: string) {
    // New format with more details
    return {
      id,
      name: 'Service',
      pricing: { amount: 100, currency: 'EUR' },
      metadata: { version: 2 },
    };
  }
}
```

#### 3. Update DTOs and Responses

Create version-specific DTOs:

```typescript
// src/services/dto/v1/service-response.dto.ts
export class ServiceResponseV1Dto {
  id: number;
  name: string;
  price: number;
}

// src/services/dto/v2/service-response.dto.ts
export class ServiceResponseV2Dto {
  id: number;
  name: string;
  pricing: {
    amount: number;
    currency: string;
  };
  metadata: {
    version: number;
  };
}
```

#### 4. Update Swagger Documentation

Tag versions in your Swagger docs:

```typescript
@ApiTags('Services (v1)')
@Controller({ path: 'services', version: API_VERSION_1 })
export class ServicesV1Controller { }

@ApiTags('Services (v2)')
@Controller({ path: 'services', version: API_VERSION_2 })
export class ServicesV2Controller { }
```

#### 5. Announce Deprecation

When deprecating v1:

1. Add deprecation notice to docs
2. Return deprecation header:
   ```typescript
   @Get()
   @Version(API_VERSION_1)
   @Header('X-API-Deprecation-Date', '2025-06-01')
   @Header('X-API-Sunset-Date', '2025-12-01')
   findAll() { }
   ```

3. Update version info endpoint:
   ```typescript
   getVersionInfo() {
     return {
       deprecatedVersions: [
         {
           version: '1',
           deprecationDate: '2025-06-01',
           sunsetDate: '2025-12-01',
           migrationGuide: '/docs/migration/v1-to-v2',
         },
       ],
     };
   }
   ```

## Best Practices

### 1. Maintain Backward Compatibility in the Same Version

Once v1 is released, never break it. Always create v2 for breaking changes.

### 2. Use Shared Services

Business logic should be version-agnostic:

```typescript
// ✅ Good: Controllers call the same service
@Injectable()
export class ServicesService {
  async findOne(id: number) {
    return this.prisma.service.findUnique({ where: { id } });
  }
}

// v1 and v2 controllers format the response differently
```

### 3. Version Your DTOs

Keep DTOs separate per version:

```
src/
  services/
    dto/
      v1/
        create-service.dto.ts
        service-response.dto.ts
      v2/
        create-service.dto.ts
        service-response.dto.ts
```

### 4. Document Changes

Always document what changed between versions:

```typescript
/**
 * @version 2
 * @breaking-change Response format changed from flat to nested
 * @migration Use `pricing.amount` instead of `price`
 */
@Get()
@Version(API_VERSION_2)
findOne() { }
```

### 5. Test All Versions

Write E2E tests for each version:

```typescript
describe('Services API v1', () => {
  it('/api/v1/services (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/services')
      .expect(200);
  });
});

describe('Services API v2', () => {
  it('/api/v2/services (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v2/services')
      .expect(200);
  });
});
```

## Client Implementation

### JavaScript/TypeScript

```typescript
const API_BASE_URL = 'https://api.croffersnest.com';
const API_VERSION = 'v1'; // or 'v2'

const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/services`);
const services = await response.json();
```

### Axios

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.croffersnest.com/api/v1',
});

const services = await apiClient.get('/services');
```

### Dynamic Version Selection

```typescript
class ApiClient {
  constructor(version = 'v1') {
    this.baseURL = `https://api.croffersnest.com/api/${version}`;
  }

  async getServices() {
    return fetch(`${this.baseURL}/services`);
  }
}

// Use v1
const clientV1 = new ApiClient('v1');

// Use v2
const clientV2 = new ApiClient('v2');
```

## Version Discovery

### Get Available Versions

```bash
GET /api/version
```

Response:

```json
{
  "currentVersion": "2",
  "supportedVersions": ["1", "2"],
  "latestVersion": "2",
  "deprecatedVersions": [],
  "endpoints": {
    "v1": "/api/v1",
    "v2": "/api/v2"
  }
}
```

### Get Version Changelog

```bash
GET /api/version/changelog
```

Response:

```json
{
  "versions": {
    "1": {
      "releaseDate": "2024-01-01",
      "description": "Initial release",
      "features": ["Authentication", "Bookings", "Reviews"]
    },
    "2": {
      "releaseDate": "2024-12-01",
      "description": "Enhanced API",
      "features": ["Advanced search", "Batch operations"],
      "breakingChanges": [
        "Response format changes for paginated endpoints"
      ]
    }
  }
}
```

## FAQ

### Q: What version should new features use?

**A:** Add new features to the latest stable version (currently v2). Only create v3 if you need breaking changes.

### Q: How long should we support old versions?

**A:** Recommended timeline:
- 6 months: Announce deprecation
- 12 months: Stop accepting new clients on old version
- 18 months: Sunset (remove) old version

### Q: Can I have different authentication between versions?

**A:** Yes! You can apply different guards per version:

```typescript
@Controller({ path: 'services', version: API_VERSION_1 })
@UseGuards(JwtAuthGuard)
export class ServicesV1Controller { }

@Controller({ path: 'services', version: API_VERSION_2 })
@UseGuards(OAuth2Guard) // Different auth in v2
export class ServicesV2Controller { }
```

### Q: What about WebSocket versioning?

**A:** WebSocket namespaces act as versions:

```typescript
@WebSocketGateway({ namespace: '/v1/messaging' })
export class MessagingV1Gateway { }

@WebSocketGateway({ namespace: '/v2/messaging' })
export class MessagingV2Gateway { }
```

## Migration Checklist

When creating a new API version:

- [ ] Update `versioning.config.ts` with new version
- [ ] Add changelog entry with breaking changes
- [ ] Create new controllers or version methods
- [ ] Create version-specific DTOs
- [ ] Update Swagger documentation
- [ ] Write migration guide
- [ ] Add E2E tests for new version
- [ ] Update client SDK/documentation
- [ ] Announce to users
- [ ] Monitor adoption metrics

## Resources

- [NestJS Versioning Docs](https://docs.nestjs.com/techniques/versioning)
- [Semantic Versioning](https://semver.org/)
- [API Versioning Best Practices](https://swagger.io/blog/api-development/api-versioning-best-practices/)
