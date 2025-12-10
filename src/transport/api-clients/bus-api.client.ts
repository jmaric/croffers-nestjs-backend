/**
 * Bus API Client
 *
 * This client integrates with bus operator APIs (FlixBus, Arriva, etc.)
 * Currently using MOCK DATA - replace with real API calls when you get API access
 */

export interface BusDeparture {
  scheduleId: string; // External API ID
  operator: string;
  busNumber?: string;
  routeName: string;
  departureStopId: number;
  arrivalStopId: number;
  departureTime: Date;
  arrivalTime: Date;
  duration: number; // minutes
  availableSeats: number;
  totalCapacity: number;
  pricing: {
    adult: number;
    child?: number;
    senior?: number;
    currency: string;
  };
  amenities: string[];
  busType?: string;
  bookingUrl?: string;
}

export interface BusSearchParams {
  departureStopId: number;
  arrivalStopId: number;
  date: Date;
  passengers?: number;
}

export class BusApiClient {
  /**
   * Search for bus schedules
   *
   * TODO: Replace with real API call when bus companies provide API access
   * Example API call (commented out):
   *
   * async searchSchedules(params: BusSearchParams): Promise<BusDeparture[]> {
   *   const response = await axios.get('https://api.getbybus.com/v1/search', {
   *     params: {
   *       from_city_id: params.departureStopId,
   *       to_city_id: params.arrivalStopId,
   *       date: params.date.toISOString().split('T')[0],
   *       currency: 'EUR',
   *     },
   *     headers: {
   *       'X-API-Key': process.env.GETBYBUS_API_KEY,
   *       'Content-Type': 'application/json',
   *     },
   *   });
   *   return response.data.departures;
   * }
   */
  async searchSchedules(params: BusSearchParams): Promise<BusDeparture[]> {
    // MOCK DATA - Replace with real API call
    console.log('[MOCK] Fetching bus schedules for:', params);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock data for Zagreb → Split route
    if (params.departureStopId === 3 && params.arrivalStopId === 2) {
      return this.getMockZagrebSplitSchedules(params.date);
    }

    // Mock data for Split → Dubrovnik route
    if (params.departureStopId === 2 && params.arrivalStopId === 1) {
      return this.getMockSplitDubrovnikSchedules(params.date);
    }

    // Default empty result
    return [];
  }

  /**
   * Book a bus ticket
   *
   * TODO: Replace with real API call
   */
  async bookTicket(scheduleId: string, passengers: number): Promise<{ bookingReference: string; success: boolean }> {
    // MOCK DATA - Replace with real API call
    console.log('[MOCK] Booking bus ticket:', { scheduleId, passengers });

    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      bookingReference: `BUS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      success: true,
    };
  }

  /**
   * Check availability for a specific departure
   *
   * TODO: Replace with real API call
   */
  async checkAvailability(scheduleId: string): Promise<{ availableSeats: number }> {
    // MOCK DATA - Replace with real API call
    console.log('[MOCK] Checking bus availability:', scheduleId);

    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      availableSeats: Math.floor(Math.random() * 40) + 10,
    };
  }

  // ========== MOCK DATA GENERATORS ==========

  private getMockZagrebSplitSchedules(date: Date): BusDeparture[] {
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);

    return [
      {
        scheduleId: 'FLIX-ZAG-SPL-0600',
        operator: 'FLIXBUS',
        busNumber: 'FB123',
        routeName: 'Zagreb - Split',
        departureStopId: 3,
        arrivalStopId: 2,
        departureTime: new Date(baseDate.getTime() + 6 * 60 * 60 * 1000), // 06:00
        arrivalTime: new Date(baseDate.getTime() + 11 * 60 * 60 * 1000), // 11:00
        duration: 300,
        availableSeats: 28,
        totalCapacity: 50,
        pricing: {
          adult: 18.99,
          child: 9.50,
          senior: 15.99,
          currency: 'EUR',
        },
        amenities: ['wifi', 'ac', 'power-outlets', 'wc', 'luggage'],
        busType: 'Standard',
        bookingUrl: 'https://www.flixbus.com/',
      },
      {
        scheduleId: 'ARRIVA-ZAG-SPL-0800',
        operator: 'ARRIVA',
        busNumber: 'AR456',
        routeName: 'Zagreb - Split Express',
        departureStopId: 3,
        arrivalStopId: 2,
        departureTime: new Date(baseDate.getTime() + 8 * 60 * 60 * 1000), // 08:00
        arrivalTime: new Date(baseDate.getTime() + 12.5 * 60 * 60 * 1000), // 12:30
        duration: 270,
        availableSeats: 32,
        totalCapacity: 45,
        pricing: {
          adult: 22.00,
          child: 11.00,
          senior: 18.00,
          currency: 'EUR',
        },
        amenities: ['wifi', 'ac', 'power-outlets', 'wc', 'snacks'],
        busType: 'Express',
        bookingUrl: 'https://arriva.com.hr/',
      },
      {
        scheduleId: 'FLIX-ZAG-SPL-1200',
        operator: 'FLIXBUS',
        busNumber: 'FB789',
        routeName: 'Zagreb - Split',
        departureStopId: 3,
        arrivalStopId: 2,
        departureTime: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000), // 12:00
        arrivalTime: new Date(baseDate.getTime() + 17 * 60 * 60 * 1000), // 17:00
        duration: 300,
        availableSeats: 19,
        totalCapacity: 50,
        pricing: {
          adult: 15.99,
          child: 8.00,
          senior: 13.99,
          currency: 'EUR',
        },
        amenities: ['wifi', 'ac', 'power-outlets', 'wc', 'luggage'],
        busType: 'Standard',
        bookingUrl: 'https://www.flixbus.com/',
      },
      {
        scheduleId: 'ARRIVA-ZAG-SPL-1500',
        operator: 'ARRIVA',
        busNumber: 'AR101',
        routeName: 'Zagreb - Split',
        departureStopId: 3,
        arrivalStopId: 2,
        departureTime: new Date(baseDate.getTime() + 15 * 60 * 60 * 1000), // 15:00
        arrivalTime: new Date(baseDate.getTime() + 19.5 * 60 * 60 * 1000), // 19:30
        duration: 270,
        availableSeats: 41,
        totalCapacity: 45,
        pricing: {
          adult: 20.00,
          child: 10.00,
          senior: 16.00,
          currency: 'EUR',
        },
        amenities: ['wifi', 'ac', 'power-outlets', 'wc'],
        busType: 'Standard',
        bookingUrl: 'https://arriva.com.hr/',
      },
      {
        scheduleId: 'FLIX-ZAG-SPL-1800',
        operator: 'FLIXBUS',
        busNumber: 'FB202',
        routeName: 'Zagreb - Split Night',
        departureStopId: 3,
        arrivalStopId: 2,
        departureTime: new Date(baseDate.getTime() + 18 * 60 * 60 * 1000), // 18:00
        arrivalTime: new Date(baseDate.getTime() + 23 * 60 * 60 * 1000), // 23:00
        duration: 300,
        availableSeats: 36,
        totalCapacity: 50,
        pricing: {
          adult: 17.99,
          child: 9.00,
          senior: 14.99,
          currency: 'EUR',
        },
        amenities: ['wifi', 'ac', 'power-outlets', 'wc', 'reclining-seats'],
        busType: 'Night',
        bookingUrl: 'https://www.flixbus.com/',
      },
    ];
  }

  private getMockSplitDubrovnikSchedules(date: Date): BusDeparture[] {
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);

    return [
      {
        scheduleId: 'FLIX-SPL-DBV-0700',
        operator: 'FLIXBUS',
        busNumber: 'FB303',
        routeName: 'Split - Dubrovnik',
        departureStopId: 2,
        arrivalStopId: 1,
        departureTime: new Date(baseDate.getTime() + 7 * 60 * 60 * 1000), // 07:00
        arrivalTime: new Date(baseDate.getTime() + 11 * 60 * 60 * 1000), // 11:00
        duration: 240,
        availableSeats: 22,
        totalCapacity: 50,
        pricing: {
          adult: 14.99,
          child: 7.50,
          senior: 12.99,
          currency: 'EUR',
        },
        amenities: ['wifi', 'ac', 'power-outlets', 'wc', 'scenic-route'],
        busType: 'Coastal',
        bookingUrl: 'https://www.flixbus.com/',
      },
      {
        scheduleId: 'ARRIVA-SPL-DBV-1000',
        operator: 'ARRIVA',
        busNumber: 'AR567',
        routeName: 'Split - Dubrovnik Express',
        departureStopId: 2,
        arrivalStopId: 1,
        departureTime: new Date(baseDate.getTime() + 10 * 60 * 60 * 1000), // 10:00
        arrivalTime: new Date(baseDate.getTime() + 13.5 * 60 * 60 * 1000), // 13:30
        duration: 210,
        availableSeats: 18,
        totalCapacity: 45,
        pricing: {
          adult: 19.00,
          child: 9.50,
          senior: 15.00,
          currency: 'EUR',
        },
        amenities: ['wifi', 'ac', 'power-outlets', 'wc', 'premium-seats'],
        busType: 'Express',
        bookingUrl: 'https://arriva.com.hr/',
      },
      {
        scheduleId: 'FLIX-SPL-DBV-1430',
        operator: 'FLIXBUS',
        busNumber: 'FB404',
        routeName: 'Split - Dubrovnik',
        departureStopId: 2,
        arrivalStopId: 1,
        departureTime: new Date(baseDate.getTime() + 14.5 * 60 * 60 * 1000), // 14:30
        arrivalTime: new Date(baseDate.getTime() + 18.5 * 60 * 60 * 1000), // 18:30
        duration: 240,
        availableSeats: 31,
        totalCapacity: 50,
        pricing: {
          adult: 13.99,
          child: 7.00,
          senior: 11.99,
          currency: 'EUR',
        },
        amenities: ['wifi', 'ac', 'power-outlets', 'wc'],
        busType: 'Standard',
        bookingUrl: 'https://www.flixbus.com/',
      },
    ];
  }
}
