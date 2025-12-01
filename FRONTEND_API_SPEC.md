# Croffers Nest API - Frontend Integration Guide

## 🔗 Connection Details

```typescript
const API_BASE_URL = 'http://localhost:3333/api/v1'
const SWAGGER_DOCS = 'http://localhost:3333/api/docs'
```

## 🔐 Authentication

All authenticated endpoints require JWT Bearer token:

```typescript
headers: {
  Authorization: `Bearer ${token}`
}
```

**Get Token:**
```typescript
POST /auth/signin
Body: { email: string, password: string }
Response: { access_token: string }
```

## 📋 Essential Endpoints for Frontend

### Authentication
```typescript
POST /auth/signup
Body: { email, password, firstName, lastName, role: "TOURIST" | "SUPPLIER" }
Response: { access_token: string }

POST /auth/signin
Body: { email, password }
Response: { access_token: string }

GET /users/me (requires auth)
Response: { id, email, firstName, lastName, role, ... }
```

### Services (Browse & Book)
```typescript
GET /services
Query: ?type=ACCOMMODATION&location=Hvar&minPrice=50&maxPrice=200
Response: { data: Service[], total: number, page: number }

GET /services/:id
Response: Service (full details with photos, supplier, reviews)

POST /services/check-availability (requires auth)
Body: { serviceId, checkIn, checkOut }
Response: { available: boolean, reason?: string }
```

### Bookings
```typescript
POST /bookings (requires auth)
Body: {
  items: [{ serviceId, quantity, checkIn, checkOut }],
  guestName, guestEmail, groupSize
}
Response: Booking

GET /bookings/my-bookings (requires auth)
Response: Booking[]
```

### AI Recommendations
```typescript
PUT /ai/preferences (requires auth)
Body: {
  travelStyles: ["ADVENTURE", "CULTURAL"],
  interests: ["BEACHES", "FOOD"],
  minBudget: 50, maxBudget: 300
}

POST /ai/recommendations (requires auth)
Body: { context: "HOME_PAGE", limit: 10 }
Response: RecommendationResponseDto[]
```

### Social Features
```typescript
POST /social/stories (requires auth)
Body: { title, content, locationId, photos, visibility: "PUBLIC" }

GET /social/feed (requires auth)
Response: UserActivity[]

POST /social/friends/request (requires auth)
Body: { friendId }
```

## 📦 TypeScript Types

### Core Types
```typescript
interface Service {
  id: number
  name: string
  type: 'ACCOMMODATION' | 'TOUR' | 'ACTIVITY' | 'TRANSPORT'
  description: string
  price: number
  location: Location
  supplier: Supplier
  photos: Photo[]
  status: 'ACTIVE' | 'INACTIVE'
}

interface Booking {
  id: number
  reference: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  totalPrice: number
  bookingItems: BookingItem[]
  guestName: string
  guestEmail: string
}

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: 'TOURIST' | 'SUPPLIER' | 'ADMIN'
  avatar?: string
}
```

## 🎨 Common Workflows

### 1. User Authentication Flow
```
1. User lands on /login
2. POST /auth/signin
3. Store access_token in localStorage
4. Redirect to /dashboard
5. GET /users/me to load profile
```

### 2. Browse & Book Flow
```
1. GET /services?type=ACCOMMODATION&location=Hvar
2. User clicks service → Navigate to /services/:id
3. GET /services/:id for full details
4. User clicks "Book" → POST /services/check-availability
5. If available → POST /bookings
6. Redirect to /bookings/:id for confirmation
```

### 3. AI Recommendations Flow
```
1. On signup/first login → Show preferences modal
2. PUT /ai/preferences with user selections
3. On homepage → POST /ai/recommendations
4. Display personalized service cards
```

## 🔧 Axios Client Setup

```typescript
// src/lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3333/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

## 🚨 Error Handling

All endpoints return errors in this format:
```typescript
{
  statusCode: number
  message: string | string[]
  error: string
}
```

Example:
```typescript
{
  statusCode: 400,
  message: ["email must be an email"],
  error: "Bad Request"
}
```

## 📱 WebSocket Support (Real-time)

```typescript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3333/notifications', {
  auth: { token: accessToken }
})

socket.on('notification', (data) => {
  // Handle new notification
})
```

## 🎯 Priority Pages to Build

1. **Authentication** - Login, Signup, Forgot Password
2. **Browse Services** - List, Filters, Search
3. **Service Details** - Full info, Photos, Reviews, Book button
4. **Booking Flow** - Availability check, Booking form, Confirmation
5. **User Dashboard** - My bookings, Profile, Preferences
6. **AI Recommendations** - Personalized homepage feed

## 📝 Notes

- Use React Query for data fetching and caching
- Store JWT in localStorage (or httpOnly cookie for production)
- All list endpoints support pagination: `?page=1&limit=20`
- File uploads use multipart/form-data to `/photos/upload`
- Premium features require checking user subscription status via `/subscriptions/me`
