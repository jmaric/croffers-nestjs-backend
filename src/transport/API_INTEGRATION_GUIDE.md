# Transport API Integration Guide

This guide explains the transport API integration architecture for ferries and buses.

## Current Status: MOCK DATA

The system is currently using **mock data** to simulate ferry and bus schedules. When you receive API access from the operators, you can easily swap in the real API calls.

## Architecture Overview

```
┌─────────────────┐
│ Frontend        │
│ (React/Next.js) │
└────────┬────────┘
         │ HTTP Request
         ▼
┌─────────────────────────────────┐
│ Backend API Controller          │
│ /api/v1/ferries/search          │
│ /api/v1/buses/search            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Transport Schedules Service     │
│ - Manages caching               │
│ - Coordinates API calls         │
│ - Handles business logic        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ API Clients (Mock Data)         │
│ - FerryApiClient                │
│ - BusApiClient                  │
└─────────────────────────────────┘
         │ [Will call real APIs]
         ▼
┌─────────────────────────────────┐
│ External APIs (Future)          │
│ - Jadrolinija API               │
│ - Krilo API                     │
│ - FlixBus API                   │
│ - Arriva API                    │
└─────────────────────────────────┘
```

## Files Created

### 1. API Clients (Mock Data)

#### `/src/transport/api-clients/ferry-api.client.ts`
- Simulates ferry operator APIs (Jadrolinija, Krilo, Kapetan Luka)
- Mock data for routes: Split→Hvar, Dubrovnik→Korčula
- Methods:
  - `searchSchedules()` - Get available ferries
  - `bookTicket()` - Book a ferry ticket
  - `checkAvailability()` - Real-time seat availability

#### `/src/transport/api-clients/bus-api.client.ts`
- Simulates bus operator APIs (FlixBus, Arriva)
- Mock data for routes: Zagreb→Split, Split→Dubrovnik
- Methods:
  - `searchSchedules()` - Get available buses
  - `bookTicket()` - Book a bus ticket
  - `checkAvailability()` - Real-time seat availability

### 2. Database Schema (Already Updated)

#### `TransportService` Model
New fields added for API integration:
- `apiProvider` - e.g., "jadrolinija", "krilo", "flixbus"
- `apiOperatorId` - External operator ID from API
- `apiRouteId` - External route ID from API
- `requiresRealTime` - Whether to check availability in real-time
- `externalBookingUrl` - Fallback URL if API fails
- `operatorName` - Display name for UI

#### `FerrySchedule` & `BusSchedule` Models
Already have:
- `externalId` - Maps to API schedule ID
- `lastSyncedAt` - Track when data was fetched from API

## How to Use (Current Mock Data)

### Search for Ferries
```typescript
import { FerryApiClient } from './api-clients/ferry-api.client';

const ferryClient = new FerryApiClient();

const departures = await ferryClient.searchSchedules({
  departurePortId: 2, // Split
  arrivalPortId: 8, // Hvar
  date: new Date('2025-06-15'),
  passengers: 2,
});

// Returns mock data with 4 departures:
// - Jadrolinija 08:00 (car ferry)
// - Krilo 09:30 (fast catamaran)
// - Jadrolinija 14:00 (car ferry)
// - Kapetan Luka 16:30 (catamaran)
```

### Search for Buses
```typescript
import { BusApiClient } from './api-clients/bus-api.client';

const busClient = new BusApiClient();

const departures = await busClient.searchSchedules({
  departureStopId: 3, // Zagreb
  arrivalStopId: 2, // Split
  date: new Date('2025-06-15'),
  passengers: 1,
});

// Returns mock data with 5 departures from FlixBus and Arriva
```

## Migration to Real APIs

When you receive API credentials, follow these steps:

### Step 1: Get API Documentation

From each operator, you'll need:
1. **Base URL** - e.g., `https://api.jadrolinija.hr/v1`
2. **Authentication** - API keys, OAuth tokens, etc.
3. **Endpoints** - Search, booking, availability
4. **Request/Response formats** - JSON schemas

### Step 2: Update Environment Variables

Add to `.env`:
```env
# Ferry APIs
JADROLINIJA_API_KEY=your_key_here
JADROLINIJA_API_URL=https://api.jadrolinija.hr/v1
KRILO_API_KEY=your_key_here
KRILO_API_URL=https://api.krilo.hr/v1

# Bus APIs
FLIXBUS_API_KEY=your_key_here
FLIXBUS_API_URL=https://api.flixbus.com/v1
ARRIVA_API_KEY=your_key_here
ARRIVA_API_URL=https://api.arriva.com.hr/v1
```

### Step 3: Replace Mock Implementation

In `ferry-api.client.ts`, replace the mock `searchSchedules` method:

```typescript
// BEFORE (Mock):
async searchSchedules(params: FerrySearchParams): Promise<FerryDeparture[]> {
  console.log('[MOCK] Fetching ferry schedules');
  await new Promise(resolve => setTimeout(resolve, 500));
  return this.getMockSplitHvarSchedules(params.date);
}

// AFTER (Real API):
async searchSchedules(params: FerrySearchParams): Promise<FerryDeparture[]> {
  const response = await axios.get(`${process.env.JADROLINIJA_API_URL}/schedules`, {
    params: {
      from: params.departurePortId,
      to: params.arrivalPortId,
      date: params.date.toISOString().split('T')[0],
      passengers: params.passengers || 1,
    },
    headers: {
      'Authorization': `Bearer ${process.env.JADROLINIJA_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  // Transform API response to match our interface
  return response.data.schedules.map(schedule => ({
    scheduleId: schedule.id,
    operator: 'JADROLINIJA',
    vesselName: schedule.vessel_name,
    routeName: schedule.route,
    departurePortId: schedule.departure_port_id,
    arrivalPortId: schedule.arrival_port_id,
    departureTime: new Date(schedule.departure_time),
    arrivalTime: new Date(schedule.arrival_time),
    duration: schedule.duration_minutes,
    availableSeats: schedule.available_seats,
    totalCapacity: schedule.total_capacity,
    vehicleCapacity: schedule.vehicle_capacity,
    availableVehicles: schedule.available_vehicles,
    pricing: {
      adult: schedule.price_adult,
      child: schedule.price_child,
      vehicle: schedule.price_vehicle,
      currency: schedule.currency || 'EUR',
    },
    amenities: schedule.amenities || [],
    bookingUrl: schedule.booking_url,
  }));
}
```

### Step 4: Test Integration

1. Create test routes in Postman/Insomnia
2. Test each operator's API individually
3. Verify response transformations
4. Handle error cases (API down, no availability, etc.)

### Step 5: Add Error Handling

```typescript
async searchSchedules(params: FerrySearchParams): Promise<FerryDeparture[]> {
  try {
    const response = await axios.get(/* ... */);
    return this.transformResponse(response.data);
  } catch (error) {
    // Log error for monitoring
    console.error('Ferry API error:', error);

    // Fallback to cached data if available
    const cached = await this.getCachedSchedules(params);
    if (cached) {
      return cached;
    }

    // Return empty array or throw based on requirements
    throw new Error('Ferry schedules unavailable');
  }
}
```

## Mock Data Locations

### Ferry Routes Available:
1. **Split → Hvar** (departurePortId: 2, arrivalPortId: 8)
   - 4 departures: Jadrolinija, Krilo, Jadrolinija, Kapetan Luka
   - Times: 08:00, 09:30, 14:00, 16:30

2. **Dubrovnik → Korčula** (departurePortId: 1, arrivalPortId: 10)
   - 2 departures: Jadrolinija, Krilo
   - Times: 09:00, 15:00

### Bus Routes Available:
1. **Zagreb → Split** (departureStopId: 3, arrivalStopId: 2)
   - 5 departures: FlixBus and Arriva
   - Times: 06:00, 08:00, 12:00, 15:00, 18:00

2. **Split → Dubrovnik** (departureStopId: 2, arrivalStopId: 1)
   - 3 departures: FlixBus and Arriva
   - Times: 07:00, 10:00, 14:30

## Next Steps

1. ✅ **Schema updated** - API fields added to TransportService
2. ✅ **Mock clients created** - Working with fake data
3. ⏳ **Service layer** - Create TransportSchedulesService
4. ⏳ **Controllers** - Add API endpoints
5. ⏳ **Frontend** - Build schedule picker UI
6. ⏳ **Real APIs** - Integrate when credentials arrive

## Notes

- Mock data includes realistic schedules based on actual Croatian transport
- All prices are in EUR
- Departure times span typical operating hours
- Mock data includes different operators (Jadrolinija, Krilo, FlixBus, Arriva)
- Vehicle capacity only included for car ferries
- Amenities reflect real ferry/bus features

## Questions?

When you get the real API documentation, check for:
- Rate limits (requests per minute/hour)
- Caching recommendations
- Webhook support for schedule changes
- Booking confirmation flows
- Payment integration
- Cancellation/refund policies
