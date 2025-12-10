# Frontend Team Observations - Backend Issues

**Date:** 2025-12-02
**From:** Frontend Team (Claude Code Agent)
**To:** Backend Team

## Summary

The frontend is fully implemented and working correctly per the `FRONTEND_API_SPEC.md`. However, the backend is currently not running due to compilation errors, which blocks the "Browse Services" functionality.

## Current Status

### Frontend: ✅ WORKING
- Running successfully on http://localhost:3000
- API client correctly implemented per spec
- Response interceptor simplified to handle only 401 errors
- All pages compiling and serving correctly

### Backend: ❌ NOT RUNNING
- Port 3333 not responding
- TypeScript compilation errors preventing server start
- Two main issues identified below

---

## Issue #1: TypeScript Compilation Errors in Seed Files

**Location:** `prisma/seed.ts` and `prisma/seed-simple.ts`

**Problem:**
Multiple TypeScript errors preventing the backend from compiling and starting:

1. Import path extension errors (TS5097)
2. Missing/incorrect property types on Prisma models
3. Enum value mismatches

**Sample Errors:**
```
prisma/seed.ts:1:30 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
prisma/seed.ts:30:16 - error TS2339: Property 'subscription' does not exist on type 'PrismaClient'
prisma/seed.ts:61:7 - error TS2353: 'password' does not exist in type 'UserCreateInput'
```

**Recommendation:**
Option 1: Exclude seed files from TypeScript compilation by updating `tsconfig.json`:
```json
{
  "exclude": ["prisma/seed.ts", "prisma/seed-simple.ts", "prisma/**/*"]
}
```

Option 2: Fix the TypeScript errors in the seed files to match the current Prisma schema

**Priority:** HIGH (blocks server from starting)

---

## Issue #2: mongoSanitize Middleware Error

**Location:** `src/main.ts` lines 108-120

**Problem:**
The `express-mongo-sanitize` middleware is incorrectly implemented, causing runtime error:
```
Error: Cannot set property query of #<IncomingMessage> which has only a getter
```

**Current Code (BROKEN):**
```typescript
// Lines 108-120 in src/main.ts
app.use((req: any, res: any, next: any) => {
  if (req.path.startsWith('/api/docs') || req.path.startsWith('/api-json')) {
    return next();
  }
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Sanitized input detected: ${key} in ${req.path}`);
    },
  })(req, res, next);  // ❌ Inline invocation causes the error
});
```

**Recommended Fix:**
```typescript
// Install middleware directly without custom wrapper
app.use(
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Sanitized input detected: ${key} in ${req.path}`);
    },
  })
);

// If you need to exclude certain routes, use conditional logic:
app.use((req: any, res: any, next: any) => {
  if (req.path.startsWith('/api/docs') || req.path.startsWith('/api-json')) {
    return next();
  }
  next();
});
```

**Why This Happens:**
The inline invocation `mongoSanitize({...})(req, res, next)` inside a custom middleware wrapper causes the library to attempt setting properties on an already-processed request object.

**Priority:** MEDIUM (will cause 500 errors once server starts)

**API Endpoint Affected:**
- `GET /api/v1/services` returns 500 Internal Server Error
- Likely affects all API endpoints with query parameters

---

## Frontend Changes Already Made

The frontend has been updated to match the `FRONTEND_API_SPEC.md`:

### 1. Simplified API Response Interceptor
**File:** `lib/api/client.ts` lines 30-42

Changed from complex error handling to simple 401 redirect pattern:

```typescript
// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Handle 401 Unauthorized - clear token and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
```

### 2. Fixed Hydration Warning
**File:** `app/layout.tsx` line 80

Added `suppressHydrationWarning` to handle browser extensions:
```typescript
<html lang="en" suppressHydrationWarning>
```

---

## Testing After Fix

Once the backend is running, test with:

```bash
# Check backend health
curl http://localhost:3333/api/v1/health

# Test services endpoint
curl "http://localhost:3333/api/v1/services?page=1&limit=20&sortBy=popularity&sortOrder=desc"
```

Expected: Both should return 200 OK with valid JSON responses.

---

## Next Steps

1. **Fix Issue #1** (TypeScript compilation) - This is blocking the server from starting
2. **Fix Issue #2** (mongoSanitize middleware) - This will cause 500 errors once server runs
3. **Restart backend** - Server should start successfully on port 3333
4. **Verify** - Test "Browse Services" page in frontend at http://localhost:3000/services

---

## Contact

Frontend team is available for coordination. The frontend is ready and waiting for backend to come online.

**Frontend Status:** Ready ✅
**Waiting on:** Backend compilation and startup