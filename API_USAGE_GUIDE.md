# Croffers Nest API - Usage Guide

## 📚 Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Core Features](#core-features)
4. [Tourist Premium Subscriptions](#tourist-premium-subscriptions)
5. [Supplier Premium Add-ons](#supplier-premium-add-ons)
6. [Social & Sharing Features](#social--sharing-features)
7. [AI & Personalization](#ai--personalization)
8. [Advanced Features](#advanced-features)
9. [Common Workflows](#common-workflows)

---

## Getting Started

### Base URL
```
http://localhost:3333/api/v1
```

### API Documentation
Interactive Swagger documentation available at:
```
http://localhost:3333/api/docs
```

### Response Format
All responses follow this structure:
```json
{
  "id": 1,
  "data": "...",
  "createdAt": "2025-12-01T19:00:00.000Z"
}
```

---

## Authentication

### 1. Sign Up (Tourist)
**POST** `/auth/signup`

```json
{
  "email": "tourist@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "TOURIST"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "tourist@example.com",
    "role": "TOURIST"
  }
}
```

### 2. Sign In
**POST** `/auth/signin`

```json
{
  "email": "tourist@example.com",
  "password": "Password123!"
}
```

### 3. Using Authentication
Add header to all authenticated requests:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Core Features

### Services (Accommodations, Activities, Tours, Transport)

#### Browse Services
**GET** `/services?type=ACCOMMODATION&location=Hvar&minPrice=50&maxPrice=200`

**Query Parameters:**
- `type`: ACCOMMODATION, ACTIVITY, TOUR, TRANSPORT
- `location`: Location name or ID
- `minPrice`, `maxPrice`: Price range
- `capacity`: Minimum capacity
- `page`, `limit`: Pagination

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Luxury Beach Villa",
      "type": "ACCOMMODATION",
      "price": 150.00,
      "currency": "EUR",
      "capacity": 6,
      "supplier": {
        "id": 1,
        "businessName": "Adriatic Villas"
      }
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

#### Get Service Details
**GET** `/services/:id`

Returns complete service information including:
- Service details
- Supplier information
- Photos
- Reviews with trust scores
- Availability

### Bookings

#### Create Booking
**POST** `/bookings`

```json
{
  "items": [
    {
      "serviceId": 1,
      "quantity": 1,
      "checkIn": "2025-06-15",
      "checkOut": "2025-06-20"
    }
  ],
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+385911234567",
  "groupSize": 2,
  "specialRequests": "Late check-in please"
}
```

**Response:**
```json
{
  "id": 1,
  "bookingReference": "BK-2025-001234",
  "status": "PENDING",
  "totalAmount": 750.00,
  "paymentUrl": "https://payment-link.example.com"
}
```

#### Get My Bookings
**GET** `/bookings/my-bookings?status=CONFIRMED`

#### Cancel Booking
**PATCH** `/bookings/:id/cancel`

```json
{
  "reason": "Change of plans"
}
```

### Reviews (Anti-Manipulation System)

#### Submit Review
**POST** `/reviews`

```json
{
  "bookingId": 1,
  "serviceId": 1,
  "comment": "Amazing villa! Clean, spacious, great location.",
  "wouldRecommend": true,
  "tags": ["clean", "great_location", "good_value"]
}
```

**Trust Score System:**
- ✅ Verified bookings get higher weight
- 📅 Recent reviews matter more
- 🎯 Consistency checked across reviews
- 🔒 Anti-manipulation detection

#### Get Service Reviews
**GET** `/reviews/supplier/:supplierId?verified=true&sortBy=trust_score`

---

## Tourist Premium Subscriptions

### View Plans
**GET** `/subscriptions/plans`

**Response:**
```json
[
  {
    "name": "Monthly Premium",
    "price": 4.99,
    "currency": "EUR",
    "interval": "month",
    "features": [
      "7-day crowd predictions",
      "Unlimited price alerts",
      "Priority booking",
      "Advanced itinerary tools",
      "Ad-free experience"
    ]
  },
  {
    "name": "Annual Premium",
    "price": 49.00,
    "currency": "EUR",
    "interval": "year",
    "discount": "17% off"
  }
]
```

### Subscribe
**POST** `/subscriptions/subscribe`

```json
{
  "planId": "monthly",
  "paymentMethodId": "pm_card_visa"
}
```

### Check Subscription Status
**GET** `/subscriptions/me`

**Response:**
```json
{
  "isActive": true,
  "plan": "monthly",
  "currentPeriodEnd": "2025-07-01T00:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "features": {
    "crowdPredictions": true,
    "unlimitedAlerts": true,
    "priorityBooking": true
  }
}
```

---

## Supplier Premium Add-ons

### Register as Supplier
**POST** `/suppliers`

```json
{
  "businessName": "Adriatic Adventures",
  "registrationNumber": "12345678",
  "taxId": "HR12345678901",
  "address": "Obala 15, Split",
  "phone": "+385211234567",
  "email": "info@adriatic-adventures.hr",
  "category": "TOUR_OPERATOR"
}
```

### View Available Add-ons
**GET** `/supplier-premium/addons/available`

**Response:**
```json
[
  {
    "type": "ANALYTICS_PRO",
    "name": "Analytics Pro",
    "monthlyPrice": 29.00,
    "features": [
      "Real-time analytics dashboard",
      "Revenue forecasting",
      "Customer behavior insights",
      "Competitor benchmarking",
      "Export reports (PDF/Excel)"
    ]
  },
  {
    "type": "API_ACCESS",
    "name": "API Access",
    "monthlyPrice": 49.00,
    "features": [
      "Full REST API access",
      "Webhook integrations",
      "1000 requests/hour",
      "Technical documentation"
    ]
  },
  {
    "type": "MARKETING_SUITE",
    "name": "Marketing Suite",
    "monthlyPrice": 39.00,
    "features": [
      "Promoted listings",
      "Featured placement",
      "Performance analytics",
      "A/B testing tools"
    ]
  },
  {
    "type": "COMMISSION_REDUCTION",
    "name": "Commission Reduction",
    "monthlyPrice": 99.00,
    "features": [
      "Reduce commission from 15% to 10%",
      "Save on every booking",
      "Priority payout processing"
    ]
  },
  {
    "type": "PRIORITY_SUPPORT",
    "name": "Priority Support",
    "monthlyPrice": 19.00,
    "features": [
      "24/7 priority support",
      "Dedicated account manager",
      "1-hour response time SLA"
    ]
  }
]
```

### Subscribe to Add-on
**POST** `/supplier-premium/addons/subscribe`

```json
{
  "addonType": "ANALYTICS_PRO"
}
```

### Analytics Pro Features

#### Revenue Metrics
**GET** `/supplier-premium/analytics/revenue`

```json
{
  "totalRevenue": 45680.00,
  "projectedRevenue": 52000.00,
  "revenueGrowth": 15.2,
  "averageBookingValue": 234.50,
  "topServices": [
    {
      "serviceName": "Island Hopping Tour",
      "revenue": 12450.00,
      "bookings": 87
    }
  ]
}
```

#### Customer Insights
**GET** `/supplier-premium/analytics/customers`

```json
{
  "totalCustomers": 342,
  "repeatCustomers": 89,
  "repeatRate": 26.0,
  "averageLifetimeValue": 456.78,
  "topCustomers": [...]
}
```

### API Access Features

#### Generate API Key
**POST** `/supplier-premium/api-keys`

```json
{
  "name": "Production API",
  "scopes": ["bookings:read", "services:write"],
  "rateLimit": 1000
}
```

**Response:**
```json
{
  "id": 1,
  "apiKey": "sk_live_a1b2c3d4e5f6g7h8...",
  "keyPreview": "****...g7h8",
  "scopes": ["bookings:read", "services:write"],
  "message": "⚠️ Save this key now! It won't be shown again."
}
```

### Marketing Suite Features

#### Create Promoted Listing
**POST** `/supplier-premium/promotions`

```json
{
  "serviceId": 1,
  "startDate": "2025-06-01",
  "endDate": "2025-08-31",
  "isFeatured": true,
  "boostedScore": 1.5,
  "dailyBudget": 25.00
}
```

#### View Performance
**GET** `/supplier-premium/promotions/:id`

```json
{
  "impressions": 12543,
  "clicks": 876,
  "bookings": 34,
  "ctr": 6.98,
  "conversionRate": 3.88,
  "roi": 245.5
}
```

---

## Social & Sharing Features

### Itinerary Sharing

#### Share Your Itinerary
**POST** `/social/itineraries/share`

```json
{
  "itineraryId": 1,
  "visibility": "PUBLIC",
  "title": "7-Day Croatian Island Adventure",
  "description": "Perfect summer itinerary visiting Hvar, Brač, and Vis",
  "coverPhoto": "https://...",
  "tags": ["islands", "summer", "adventure"],
  "allowCollaboration": true
}
```

#### Browse Shared Itineraries
**GET** `/social/itineraries?visibility=PUBLIC`

#### Fork (Copy) Itinerary
**POST** `/social/itineraries/:id/fork`

Creates a copy of someone's itinerary to your account!

#### Add Collaborator
**POST** `/social/itineraries/:id/collaborators`

```json
{
  "userId": 5
}
```

### Travel Stories

#### Post Travel Story
**POST** `/social/stories`

```json
{
  "title": "Sunset in Hvar Old Town",
  "content": "Yesterday we watched the most beautiful sunset from the fortress walls...",
  "locationId": 1,
  "photos": [
    "https://photos.example.com/sunset1.jpg",
    "https://photos.example.com/sunset2.jpg"
  ],
  "coverPhoto": "https://photos.example.com/sunset1.jpg",
  "visibility": "PUBLIC",
  "tags": ["sunset", "hvar", "fortress"]
}
```

#### Browse Stories
**GET** `/social/stories?locationId=1`

#### Like Story
**POST** `/social/stories/:id/like`

#### Comment on Story
**POST** `/social/stories/:id/comments`

```json
{
  "comment": "Beautiful photos! We're going there next month.",
  "parentId": null
}
```

### Friendship System

#### Send Friend Request
**POST** `/social/friends/request`

```json
{
  "friendId": 5
}
```

#### Accept Request
**POST** `/social/friends/:friendshipId/accept`

#### Get Friends
**GET** `/social/friends`

#### Activity Feed
**GET** `/social/feed`

Shows combined activities from you and your friends:
- Bookings made
- Reviews posted
- Itineraries shared
- Stories published

---

## AI & Personalization

### User Preferences

#### Set Your Preferences
**PUT** `/ai/preferences`

```json
{
  "travelStyles": ["ADVENTURE", "CULTURAL"],
  "interests": ["BEACHES", "NIGHTLIFE", "FOOD", "HISTORY"],
  "minBudget": 50,
  "maxBudget": 300,
  "preferredStarRating": 4,
  "preferredAmenities": ["pool", "wifi", "air_conditioning"],
  "activityLevelMin": 3,
  "activityLevelMax": 5,
  "preferredDuration": "full-day",
  "preferredRegions": ["Dalmatia", "Istria"],
  "avoidCrowds": true
}
```

### Smart Recommendations

#### Get Personalized Recommendations
**POST** `/ai/recommendations`

```json
{
  "context": "HOME_PAGE",
  "limit": 10
}
```

**Response:**
```json
[
  {
    "serviceId": 15,
    "serviceName": "Blue Cave Adventure Tour",
    "serviceType": "TOUR",
    "score": 0.92,
    "reasoning": "Matches your preferences, Based on your activity, Popular with other travelers",
    "service": {
      "id": 15,
      "name": "Blue Cave Adventure Tour",
      "price": 120.00,
      "photos": [...]
    }
  }
]
```

**Scoring Algorithm:**
- 35% - Preference Match (styles, interests, budget)
- 30% - Behavior Patterns (what you've viewed/liked/booked)
- 20% - Popularity (what others are booking)
- 10% - Seasonal Relevance (beach activities in summer)
- 5% - Location Proximity (near your saved places)

#### Track User Interactions
**POST** `/ai/interactions`

```json
{
  "serviceId": 15,
  "interactionType": "view",
  "duration": 45,
  "searchQuery": "cave tours hvar"
}
```

**Interaction Types:**
- `view` - User viewed service details
- `click` - Clicked on service
- `like` - Liked/favorited service
- `save` - Saved to wishlist
- `book` - Made booking
- `review` - Left review

### Smart Suggestions

#### Get AI Suggestions
**GET** `/ai/suggestions`

**Response:**
```json
[
  {
    "id": 1,
    "suggestionType": "weekend_getaway",
    "title": "Weekend getaway ideas",
    "description": "Make the most of your weekend with these experiences",
    "priority": 9,
    "validUntil": "2025-12-08T00:00:00.000Z",
    "services": [
      {
        "id": 12,
        "name": "2-Day Wine Tour Package"
      }
    ]
  },
  {
    "suggestionType": "similar_to_saved",
    "title": "More places you might like",
    "description": "Based on your saved favorites",
    "services": [...]
  },
  {
    "suggestionType": "trending_nearby",
    "title": "Trending in your area",
    "description": "Popular services that other travelers are booking",
    "services": [...]
  }
]
```

#### Generate Fresh Suggestions
**POST** `/ai/suggestions/generate`

Triggers AI to analyze your activity and create new personalized suggestions.

### AI Chat Assistant

#### Start Conversation
**POST** `/ai/chat/conversations`

```json
{
  "context": "recommendations"
}
```

#### Send Message
**POST** `/ai/chat/conversations/:id/messages`

```json
{
  "content": "Can you recommend beach activities in Hvar for a family with kids?",
  "serviceIds": [12, 15]
}
```

**Response:**
```json
{
  "id": 5,
  "role": "assistant",
  "content": "Based on your interests in beaches and family travel, I'd recommend checking out our personalized recommendations page. For families with kids in Hvar, popular options include calm beach areas, snorkeling tours with shallow waters, and boat trips with swimming stops. Would you like me to show you some specific recommendations?",
  "createdAt": "2025-12-01T19:00:00.000Z"
}
```

#### Get Conversation History
**GET** `/ai/chat/conversations/:id`

### Dynamic Pricing (Suppliers)

#### Generate Pricing Suggestions
**POST** `/ai/pricing/:serviceId/generate`

**AI Considers:**
- **Demand:** Recent booking volume (0.8x - 1.3x multiplier)
- **Seasonality:** Summer peak = 1.3x, Off-season = 0.9x
- **Crowd Levels:** High crowds = higher prices
- **Historical Data:** Your past pricing performance

**Response:**
```json
{
  "id": 1,
  "serviceId": 15,
  "basePrice": 100.00,
  "demandMultiplier": 1.15,
  "seasonalMultiplier": 1.3,
  "crowdMultiplier": 1.0,
  "suggestedPrice": 149.50,
  "minPrice": 80.00,
  "maxPrice": 150.00,
  "confidence": 0.8,
  "reasoning": "High demand with 52 bookings in last 90 days, peak summer season"
}
```

#### Apply Pricing
**POST** `/ai/pricing/:pricingId/apply?serviceId=15`

Updates your service price to the AI-suggested amount.

---

## Advanced Features

### Multi-Modal Journey Planning

#### Plan Journey from Airport
**POST** `/journeys/plan`

```json
{
  "fromAirport": "SPU",
  "toLocationId": 5,
  "departureDate": "2025-06-15",
  "passengers": 2,
  "preferences": {
    "maxPrice": 200,
    "preferredMode": "FERRY",
    "directOnly": false
  }
}
```

**Response:**
```json
{
  "totalDuration": 145,
  "totalPrice": 85.00,
  "segments": [
    {
      "mode": "BUS",
      "from": "Split Airport",
      "to": "Split Port",
      "duration": 30,
      "price": 10.00
    },
    {
      "mode": "FERRY",
      "from": "Split Port",
      "to": "Hvar Town",
      "duration": 115,
      "price": 75.00,
      "operator": "Jadrolinija"
    }
  ]
}
```

### Ferry Schedules
**GET** `/ferries/search?from=Split&to=Hvar&date=2025-06-15`

### Bus Schedules
**GET** `/buses/search?from=Zagreb&to=Split&date=2025-06-15`

### Event Discovery
**GET** `/events/search?location=Hvar&type=CONCERT&startDate=2025-06-01&endDate=2025-08-31`

### Crowd Intelligence

#### Real-Time Crowd Levels
**GET** `/crowd/levels/:locationId?date=2025-06-15`

**Response:**
```json
{
  "locationName": "Hvar Town Beach",
  "currentLevel": "MODERATE",
  "currentScore": 65,
  "predictions": [
    {
      "time": "10:00",
      "level": "LOW",
      "score": 35
    },
    {
      "time": "14:00",
      "level": "HIGH",
      "score": 85,
      "reasoning": "Peak hours + weekend + good weather"
    }
  ],
  "recommendation": "Visit before 11 AM or after 6 PM to avoid crowds"
}
```

#### 7-Day Predictions (Premium Only)
**GET** `/crowd/predictions/:locationId`

#### Crowd Heatmap
**GET** `/crowd/heatmap?region=Dalmatia&date=2025-06-15`

### Advanced Booking Features

#### Group Booking with Discount
**POST** `/bookings/group`

```json
{
  "serviceId": 1,
  "participants": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+385911234567"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ],
  "checkIn": "2025-06-15",
  "checkOut": "2025-06-20",
  "groupSize": 10
}
```

**Response includes automatic group discount!**

#### Multi-Service Package
**POST** `/bookings/package`

```json
{
  "name": "Complete Hvar Experience",
  "items": [
    {
      "serviceId": 1,
      "type": "ACCOMMODATION",
      "nights": 5
    },
    {
      "serviceId": 12,
      "type": "TOUR"
    },
    {
      "serviceId": 15,
      "type": "ACTIVITY"
    }
  ],
  "startDate": "2025-06-15",
  "applyDiscount": true
}
```

**Gets package discount automatically!**

#### Flexible Date Search
**GET** `/bookings/flexible-dates?serviceId=1&monthYear=2025-06`

Shows lowest prices for each day of the month.

#### Price Alerts (Premium)
**POST** `/bookings/price-alerts`

```json
{
  "serviceId": 1,
  "targetPrice": 120.00,
  "checkIn": "2025-06-15",
  "checkOut": "2025-06-20"
}
```

Get notified when price drops below your target!

---

## Common Workflows

### 🎯 Tourist Booking Flow

1. **Sign up** → `POST /auth/signup`
2. **Set preferences** → `PUT /ai/preferences`
3. **Get recommendations** → `POST /ai/recommendations`
4. **Browse services** → `GET /services`
5. **Track interaction** → `POST /ai/interactions`
6. **Check availability** → `POST /services/check-availability`
7. **Create booking** → `POST /bookings`
8. **Leave review** → `POST /reviews`
9. **Share experience** → `POST /social/stories`

### 🏢 Supplier Onboarding Flow

1. **Register supplier** → `POST /suppliers`
2. **Wait for admin approval** → Check `status: APPROVED`
3. **Create services** → `POST /services/accommodation`
4. **Subscribe to add-ons** → `POST /supplier-premium/addons/subscribe`
5. **Generate API key** → `POST /supplier-premium/api-keys`
6. **View analytics** → `GET /supplier-premium/analytics/revenue`
7. **Create promotion** → `POST /supplier-premium/promotions`

### 🤖 AI Personalization Flow

1. **Set preferences** → `PUT /ai/preferences`
2. **Browse services** (tracks views automatically)
3. **Get recommendations** → `POST /ai/recommendations`
4. **Chat with AI** → `POST /ai/chat/conversations/:id/messages`
5. **Get smart suggestions** → `GET /ai/suggestions`
6. **Check suggestions daily** (AI generates new ones)

### 🌍 Social Sharing Flow

1. **Complete trip** → Make bookings, visit places
2. **Post story** → `POST /social/stories`
3. **Share itinerary** → `POST /social/itineraries/share`
4. **Connect with travelers** → `POST /social/friends/request`
5. **View activity feed** → `GET /social/feed`
6. **Others fork your itinerary** → They use `POST /social/itineraries/:id/fork`

---

## Rate Limits

### Free Users
- 100 requests per minute
- 1,000 requests per hour

### Premium Tourists
- 200 requests per minute
- 2,000 requests per hour
- Priority queue

### Suppliers with API Access
- 1,000 requests per hour (configurable)
- Burst: 50 requests per second
- Webhook support

---

## Error Handling

### Standard Error Response
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    "email must be a valid email",
    "password must be at least 8 characters"
  ]
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## Testing Tips

### Use Swagger UI
1. Visit http://localhost:3333/api/docs
2. Click "Authorize" button
3. Enter: `Bearer YOUR_JWT_TOKEN`
4. Test any endpoint directly in browser!

### Example cURL Request
```bash
curl -X POST http://localhost:3333/api/v1/ai/recommendations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "HOME_PAGE",
    "limit": 5
  }'
```

### Postman Collection
Import from Swagger:
1. Open http://localhost:3333/api/docs
2. Download OpenAPI spec (top right)
3. Import to Postman

---

## Support & Resources

### Documentation
- **Swagger UI:** http://localhost:3333/api/docs
- **API Specification:** OpenAPI 3.0
- **Postman Collection:** Available via Swagger export

### Database
- **PostgreSQL:** localhost:5434
- **Database Name:** croffers_dev
- **Prisma Studio:** `npx prisma studio`

### Contact
- **Technical Issues:** Check logs in console
- **Feature Requests:** Document and prioritize
- **Bug Reports:** Include request/response + error logs

---

## What's Next?

### Immediate Priorities
1. ✅ Configure Stripe for real payments
2. ✅ Set up email service (SendGrid/Mailgun)
3. ✅ Configure Redis for production caching
4. ✅ Add rate limiting per user
5. ✅ Implement WebSocket authentication

### Future Enhancements
- Mobile app integration
- Push notifications
- Offline mode
- Multi-language support
- Currency conversion
- Advanced search filters
- Real-time availability updates

---

**🎉 You now have 387+ REST endpoints ready to use!**

Happy coding! 🚀
