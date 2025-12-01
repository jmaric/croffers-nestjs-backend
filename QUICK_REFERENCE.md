# Croffers Nest API - Quick Reference

## 🚀 Essential Endpoints

### Base URL
```
http://localhost:3333/api/v1
```

### Swagger Documentation
```
http://localhost:3333/api/docs
```

---

## 🔐 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/signin` | Login (get JWT token) |
| POST | `/auth/verify-email` | Verify email with token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |

**Usage:**
```bash
# Add to all authenticated requests
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🏨 Services (Browse & Book)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/services` | Browse all services |
| GET | `/services/:id` | Get service details |
| GET | `/services/slug/:slug` | Get by URL slug |
| POST | `/services/check-availability` | Check availability |
| GET | `/locations` | Browse locations |

**Quick Filters:**
```
?type=ACCOMMODATION&location=Hvar&minPrice=50&maxPrice=200
```

---

## 📅 Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bookings` | Create booking |
| GET | `/bookings/my-bookings` | Get my bookings |
| GET | `/bookings/:id` | Get booking details |
| PATCH | `/bookings/:id/cancel` | Cancel booking |
| POST | `/bookings/group` | Group booking (discount) |
| POST | `/bookings/package` | Multi-service package |
| POST | `/bookings/price-alerts` | Set price alert 🔔 |

---

## ⭐ Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reviews` | Submit review |
| GET | `/reviews/supplier/:id` | Get supplier reviews |
| GET | `/reviews/supplier/:id/trust-score` | Get trust score |

---

## 💎 Tourist Premium (€4.99/mo or €49/yr)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/subscriptions/plans` | View plans |
| POST | `/subscriptions/subscribe` | Subscribe |
| GET | `/subscriptions/me` | Check status |
| POST | `/subscriptions/cancel` | Cancel subscription |

**Features:**
- ✅ 7-day crowd predictions
- ✅ Unlimited price alerts
- ✅ Priority booking
- ✅ Advanced itinerary tools
- ✅ Ad-free experience

---

## 🏢 Supplier Premium Add-ons

### Available Add-ons

| Add-on | Price/mo | Endpoint |
|--------|----------|----------|
| Analytics Pro | €29 | `/supplier-premium/analytics/*` |
| API Access | €49 | `/supplier-premium/api-keys/*` |
| Marketing Suite | €39 | `/supplier-premium/promotions/*` |
| Commission Reduction | €99 | (15% → 10%) |
| Priority Support | €19 | `/supplier-premium/support/*` |

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/supplier-premium/addons/available` | List all add-ons |
| POST | `/supplier-premium/addons/subscribe` | Subscribe to add-on |
| DELETE | `/supplier-premium/addons/:id` | Cancel add-on |
| GET | `/supplier-premium/analytics/revenue` | Revenue metrics 📊 |
| GET | `/supplier-premium/analytics/customers` | Customer insights 👥 |
| POST | `/supplier-premium/api-keys` | Generate API key 🔑 |
| POST | `/supplier-premium/promotions` | Create promotion 📣 |

---

## 🌍 Social & Sharing

### Itinerary Sharing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/social/itineraries/share` | Share itinerary |
| GET | `/social/itineraries` | Browse shared |
| POST | `/social/itineraries/:id/fork` | Copy itinerary ✨ |
| POST | `/social/itineraries/:id/like` | Like itinerary ❤️ |
| POST | `/social/itineraries/:id/comments` | Comment |
| POST | `/social/itineraries/:id/collaborators` | Add collaborator 👥 |

### Travel Stories

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/social/stories` | Post story 📝 |
| GET | `/social/stories` | Browse stories |
| GET | `/social/stories/:id` | Get story |
| POST | `/social/stories/:id/like` | Like story ❤️ |
| POST | `/social/stories/:id/comments` | Comment 💬 |

### Friends

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/social/friends/request` | Send request |
| POST | `/social/friends/:id/accept` | Accept request |
| GET | `/social/friends` | Get friends list |
| GET | `/social/friends/requests` | Pending requests |
| GET | `/social/feed` | Activity feed 📰 |

---

## 🤖 AI & Personalization

### Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ai/preferences` | Get preferences |
| PUT | `/ai/preferences` | Update preferences ⚙️ |

### Recommendations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/recommendations` | Get AI recommendations 🎯 |
| POST | `/ai/interactions` | Track behavior 👁️ |

**Scoring:**
- 35% Preferences (styles, interests, budget)
- 30% Behavior (views, likes, bookings)
- 20% Popularity (what's trending)
- 10% Seasonality (season-appropriate)
- 5% Proximity (near you)

### Smart Suggestions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ai/suggestions` | Get suggestions 💡 |
| POST | `/ai/suggestions/generate` | Generate fresh ones |
| POST | `/ai/suggestions/:id/viewed` | Mark viewed |
| POST | `/ai/suggestions/:id/clicked` | Mark clicked |
| DELETE | `/ai/suggestions/:id` | Dismiss |

**Types:**
- 🏖️ Weekend Getaway
- ⭐ Similar to Saved
- 🔥 Trending Nearby
- 💎 Hidden Gems

### AI Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/chat/conversations` | Start chat 💬 |
| GET | `/ai/chat/conversations` | List conversations |
| POST | `/ai/chat/conversations/:id/messages` | Send message |
| GET | `/ai/chat/conversations/:id` | Get conversation |

### Dynamic Pricing (Suppliers)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/pricing/:serviceId/generate` | Generate pricing 💰 |
| GET | `/ai/pricing/:serviceId` | View suggestions |
| POST | `/ai/pricing/:pricingId/apply` | Apply pricing |

**AI Factors:**
- 📊 Demand (booking volume)
- 📅 Seasonality (peak vs off-season)
- 👥 Crowd levels
- 📈 Historical performance

---

## 🗺️ Multi-Modal Journeys

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/journeys/plan` | Plan journey 🛣️ |
| GET | `/ferries/search` | Search ferries ⛴️ |
| GET | `/buses/search` | Search buses 🚌 |
| GET | `/events/search` | Find events 🎉 |

---

## 👥 Crowd Intelligence

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/crowd/levels/:locationId` | Current crowd level 📊 |
| GET | `/crowd/predictions/:locationId` | 7-day predictions 🔮 |
| GET | `/crowd/heatmap` | Regional heatmap 🗺️ |
| POST | `/crowd/alerts` | Set crowd alert 🔔 |

**Crowd Levels:**
- 🟢 LOW (0-33) - Perfect time to visit!
- 🟡 MODERATE (34-66) - Manageable crowds
- 🟠 HIGH (67-84) - Very busy
- 🔴 EXTREME (85-100) - Avoid if possible

---

## 💳 Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/intent` | Create payment intent |
| POST | `/payments/process` | Process payment |
| POST | `/payments/:id/refund` | Refund payment |
| GET | `/payments/booking/:bookingId` | Get booking payments |

---

## 📊 Admin (Requires ADMIN role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/analytics/dashboard` | Admin dashboard |
| GET | `/admin/suppliers/pending` | Pending approvals |
| PATCH | `/admin/suppliers/:id/approve` | Approve supplier |
| GET | `/admin/reviews/flagged` | Flagged reviews |
| GET | `/admin/bookings/disputes` | Disputes |

---

## 📝 Common Request Examples

### Sign Up & Login
```json
POST /auth/signup
{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "TOURIST"
}

POST /auth/signin
{
  "email": "user@example.com",
  "password": "Password123!"
}
// Returns: { "access_token": "eyJ..." }
```

### Set AI Preferences
```json
PUT /ai/preferences
{
  "travelStyles": ["ADVENTURE", "CULTURAL"],
  "interests": ["BEACHES", "NIGHTLIFE", "FOOD"],
  "minBudget": 50,
  "maxBudget": 300,
  "avoidCrowds": true
}
```

### Get Recommendations
```json
POST /ai/recommendations
{
  "context": "HOME_PAGE",
  "limit": 10
}
```

### Create Booking
```json
POST /bookings
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
  "groupSize": 2
}
```

### Post Travel Story
```json
POST /social/stories
{
  "title": "Amazing Sunset in Hvar",
  "content": "We watched the most beautiful sunset...",
  "locationId": 1,
  "photos": ["url1.jpg", "url2.jpg"],
  "visibility": "PUBLIC",
  "tags": ["sunset", "hvar"]
}
```

### Subscribe to Premium
```json
POST /subscriptions/subscribe
{
  "planId": "monthly",
  "paymentMethodId": "pm_card_visa"
}
```

---

## 🎯 Quick Start Workflows

### Tourist Journey
```
1. Sign Up → POST /auth/signup
2. Set Preferences → PUT /ai/preferences
3. Get Recommendations → POST /ai/recommendations
4. Browse Services → GET /services
5. Create Booking → POST /bookings
6. Leave Review → POST /reviews
7. Post Story → POST /social/stories
```

### Supplier Journey
```
1. Register → POST /suppliers
2. Create Service → POST /services/accommodation
3. Subscribe to Analytics Pro → POST /supplier-premium/addons/subscribe
4. View Revenue → GET /supplier-premium/analytics/revenue
5. Generate Pricing → POST /ai/pricing/:serviceId/generate
6. Create Promotion → POST /supplier-premium/promotions
```

### Social Journey
```
1. Post Story → POST /social/stories
2. Share Itinerary → POST /social/itineraries/share
3. Send Friend Request → POST /social/friends/request
4. View Feed → GET /social/feed
```

---

## ⚙️ Configuration

### Environment Variables
```bash
DATABASE_URL="postgresql://user:pass@localhost:5434/croffers_dev"
JWT_SECRET="your-secret-key"
STRIPE_SECRET_KEY="sk_test_..."
REDIS_URL="redis://localhost:6379"
```

### Server URLs
- **API:** http://localhost:3333/api/v1
- **Docs:** http://localhost:3333/api/docs
- **Health:** http://localhost:3333/api/v1/health

---

## 🐛 Debugging

### Check Server Status
```bash
GET /health
```

### View Logs
Check terminal running `npm run start:dev`

### Common Issues
- **401 Unauthorized** → Check JWT token in Authorization header
- **403 Forbidden** → Check user role/permissions
- **429 Too Many Requests** → Rate limit exceeded
- **Redis Error** → Falls back to in-memory cache (OK for dev)

---

## 📚 Full Documentation

See **API_USAGE_GUIDE.md** for:
- Detailed explanations
- Complete request/response examples
- Error handling
- Advanced features
- Best practices

---

## 🎉 Platform Statistics

- **387+ REST endpoints**
- **9 Major modules**
- **3 Subscription tiers**
- **5 Supplier add-ons**
- **AI-powered personalization**
- **Social networking**
- **Multi-modal journeys**
- **Real-time crowd intelligence**

**Happy coding! 🚀**
