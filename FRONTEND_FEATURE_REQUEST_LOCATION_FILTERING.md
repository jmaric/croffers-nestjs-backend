
# Feature Request: Location Filtering for Services

**Date:** 2025-12-02
**From:** Frontend Team
**To:** Backend Team
**Priority:** High
**Type:** Enhancement

---

## Summary

Add location-based filtering to the services API so users can filter services by location name or ID.

---

## Current Situation

### What Works ✅
- Services have location relationships (`accommodationService.location`, `tourService.location`, etc.)
- Locations are properly seeded in database (Dubrovnik, Split, Hvar, Zadar)
- Services API returns location data nested in service-type objects
- Search works for location names **IF** they appear in the service name (e.g., "Private Airport Transfer Dubrovnik")

### What's Missing ❌
- No way to filter services by location name
- No way to filter services by location ID
- Search does NOT include location names in the query (only searches service name, description, tags)

### Current `FilterServiceDto` Parameters
```typescript
// Lines 91-121 in src/services/dto/filter-service.dto.ts
latitude?: number        // ✅ For geographic/radius search
longitude?: number       // ✅ For geographic/radius search
radius?: number          // ✅ For geographic/radius search
```

**Missing:**
```typescript
locationId?: number      // ❌ Filter by location ID
locationName?: string    // ❌ Filter by location name/slug
```

---

## User Stories

**As a tourist**, I want to:
1. Filter services by location (e.g., "Show me all services in Dubrovnik")
2. Search for services using location names (e.g., typing "Split" shows all Split services)
3. See services grouped/filtered by destination

**Example Use Cases:**
- User clicks "Dubrovnik" location → Show all Dubrovnik services
- User types "Hvar" in search → Services with "Hvar" in name OR services located in Hvar
- User browses "Split accommodations" → Filter by type=ACCOMMODATION + location=Split

---

## Proposed Solution

### Option 1: Add Location Filters to FilterServiceDto

**Recommended Approach** - Simple and effective

```typescript
// src/services/dto/filter-service.dto.ts

@ApiPropertyOptional({
  description: 'Filter by location ID',
  example: 1,
})
@IsNumber()
@IsOptional()
@Type(() => Number)
locationId?: number;

@ApiPropertyOptional({
  description: 'Filter by location name or slug (case-insensitive)',
  example: 'dubrovnik',
})
@IsString()
@IsOptional()
locationName?: string;
```

**Backend Implementation:**
```typescript
// src/services/services.service.ts (findAll method)

if (locationId || locationName) {
  where.OR = [
    // Accommodation services
    {
      accommodationService: {
        location: locationId
          ? { id: locationId }
          : { name: { contains: locationName, mode: 'insensitive' } },
      },
    },
    // Tour services
    {
      tourService: {
        location: locationId
          ? { id: locationId }
          : { name: { contains: locationName, mode: 'insensitive' } },
      },
    },
    // Activity services
    {
      activityService: {
        location: locationId
          ? { id: locationId }
          : { name: { contains: locationName, mode: 'insensitive' } },
      },
    },
    // Transport services (departure OR arrival)
    {
      transportService: {
        OR: [
          {
            departureLocation: locationId
              ? { id: locationId }
              : { name: { contains: locationName, mode: 'insensitive' } },
          },
          {
            arrivalLocation: locationId
              ? { id: locationId }
              : { name: { contains: locationName, mode: 'insensitive' } },
          },
        ],
      },
    },
  ];
}
```

### Option 2: Enhance Search to Include Locations

**Alternative Approach** - Modify existing search

```typescript
// src/services/services.service.ts (findAll method)

if (search) {
  where.OR = [
    // Existing search fields
    { name: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
    { shortDescription: { contains: search, mode: 'insensitive' } },
    { tags: { hasSome: search.split(' ') } },

    // NEW: Search location names
    {
      accommodationService: {
        location: { name: { contains: search, mode: 'insensitive' } },
      },
    },
    {
      tourService: {
        location: { name: { contains: search, mode: 'insensitive' } },
      },
    },
    {
      activityService: {
        location: { contains: search, mode: 'insensitive' } },
      },
    },
    {
      transportService: {
        OR: [
          {
            departureLocation: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
          {
            arrivalLocation: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        ],
      },
    },
  ];
}
```

---

## API Examples

### Frontend Request (Proposed)
```typescript
// Filter by location ID
GET /api/v1/services?locationId=1&page=1&limit=20

// Filter by location name
GET /api/v1/services?locationName=dubrovnik&page=1&limit=20

// Combine with other filters
GET /api/v1/services?type=ACCOMMODATION&locationName=split&minPrice=50&maxPrice=200
```

### Backend Response
```json
{
  "data": [
    {
      "id": 1,
      "name": "Luxury Villa Dubrovnik Old Town",
      "type": "ACCOMMODATION",
      "accommodationService": {
        "locationId": 1,
        "location": {
          "id": 1,
          "name": "Dubrovnik",
          "latitude": 42.6507,
          "longitude": 18.0944
        }
      }
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "limit": 20
  }
}
```

---

## Benefits

1. **Better UX** - Users can easily filter by destination
2. **More intuitive** - Natural to search "Dubrovnik hotels" or filter by location
3. **Frontend ready** - Frontend already displays locations and expects this functionality
4. **SEO friendly** - Location-based URLs (e.g., `/services?location=dubrovnik`)
5. **Analytics** - Track which locations are most popular

---

## Implementation Checklist

### Backend Tasks
- [ ] Add `locationId` and `locationName` to `FilterServiceDto`
- [ ] Update `services.service.ts` findAll method to handle location filtering
- [ ] Add tests for location filtering
- [ ] Update API documentation (Swagger)
- [ ] Consider adding location to search (Option 2)

### Frontend Tasks (Already Done ✅)
- [x] Updated Service type to include location data
- [x] Created utility functions to extract location from services
- [x] Updated locations API module
- [x] Updated search placeholder
- [x] Service cards ready to display locations

---

## Testing

Once implemented, test with:

```bash
# Get all Dubrovnik services
curl "http://localhost:3333/api/v1/services?locationName=dubrovnik"

# Get all Split accommodations
curl "http://localhost:3333/api/v1/services?type=ACCOMMODATION&locationName=split"

# Search should include locations (if Option 2 implemented)
curl "http://localhost:3333/api/v1/services?search=hvar"
```

---

## Notes

- The frontend is **ready and waiting** for this feature
- Services already have location relationships in the database
- This is a common user need - "Show me hotels in Split"
- Consider caching popular location queries

---

## Status

**Frontend:** ✅ Ready
**Backend:** ⏳ Pending implementation

Once this is implemented, users will be able to properly filter and search services by location!