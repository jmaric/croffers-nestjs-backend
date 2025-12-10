/**
 * Ferry API Client
 *
 * This client integrates with ferry operator APIs (Jadrolinija, Krilo, Kapetan Luka, etc.)
 * Currently using MOCK DATA - replace with real API calls when you get API access
 */

export interface FerryDeparture {
  scheduleId: string; // External API ID
  operator: string;
  vesselName: string;
  routeName: string;
  departurePortId: number;
  arrivalPortId: number;
  departureTime: Date;
  arrivalTime: Date;
  duration: number; // minutes
  availableSeats: number;
  totalCapacity: number;
  vehicleCapacity?: number;
  availableVehicles?: number;
  pricing: {
    adult: number;
    child?: number;
    vehicle?: number;
    currency: string;
  };
  amenities: string[];
  bookingUrl?: string;
}

export interface FerrySearchParams {
  departurePortId: number;
  arrivalPortId: number;
  date: Date;
  passengers?: number;
}

export class FerryApiClient {
  /**
   * Search for ferry schedules
   *
   * TODO: Replace with real API call when ferry companies provide API access
   * Example API call (commented out):
   *
   * async searchSchedules(params: FerrySearchParams): Promise<FerryDeparture[]> {
   *   const response = await axios.get('https://api.jadrolinija.hr/v1/schedules', {
   *     params: {
   *       from: params.departurePortId,
   *       to: params.arrivalPortId,
   *       date: params.date.toISOString().split('T')[0],
   *       passengers: params.passengers || 1,
   *     },
   *     headers: {
   *       'Authorization': `Bearer ${process.env.JADROLINIJA_API_KEY}`,
   *       'Content-Type': 'application/json',
   *     },
   *   });
   *   return response.data.schedules;
   * }
   */
  async searchSchedules(params: FerrySearchParams): Promise<FerryDeparture[]> {
    // MOCK DATA - Replace with real API call
    console.log('[MOCK] Fetching ferry schedules for:', params);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock data for Split → Hvar route
    if (params.departurePortId === 2 && params.arrivalPortId === 8) {
      return this.getMockSplitHvarSchedules(params.date);
    }

    // Mock data for Dubrovnik → Korčula route
    if (params.departurePortId === 1 && params.arrivalPortId === 10) {
      return this.getMockDubrovnikKorculaSchedules(params.date);
    }

    // Default empty result
    return [];
  }

  /**
   * Book a ferry ticket
   *
   * TODO: Replace with real API call
   */
  async bookTicket(scheduleId: string, passengers: number): Promise<{ bookingReference: string; success: boolean }> {
    // MOCK DATA - Replace with real API call
    console.log('[MOCK] Booking ferry ticket:', { scheduleId, passengers });

    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      bookingReference: `FERRY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      success: true,
    };
  }

  /**
   * Check availability for a specific departure
   *
   * TODO: Replace with real API call
   */
  async checkAvailability(scheduleId: string): Promise<{ availableSeats: number; availableVehicles: number }> {
    // MOCK DATA - Replace with real API call
    console.log('[MOCK] Checking ferry availability:', scheduleId);

    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      availableSeats: Math.floor(Math.random() * 100) + 20,
      availableVehicles: Math.floor(Math.random() * 15) + 5,
    };
  }

  // ========== MOCK DATA GENERATORS ==========

  private getMockSplitHvarSchedules(date: Date): FerryDeparture[] {
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);

    return [
      {
        scheduleId: 'JAD-SPL-HVR-0800',
        operator: 'JADROLINIJA',
        vesselName: 'Dubrovnik',
        routeName: 'Split - Hvar',
        departurePortId: 2,
        arrivalPortId: 8,
        departureTime: new Date(baseDate.getTime() + 8 * 60 * 60 * 1000), // 08:00
        arrivalTime: new Date(baseDate.getTime() + 9.5 * 60 * 60 * 1000), // 09:30
        duration: 90,
        availableSeats: 156,
        totalCapacity: 200,
        vehicleCapacity: 40,
        availableVehicles: 12,
        pricing: {
          adult: 15.00,
          child: 7.50,
          vehicle: 50.00,
          currency: 'EUR',
        },
        amenities: ['wifi', 'cafe', 'deck', 'ac'],
        bookingUrl: 'https://www.jadrolinija.hr/en/ferry-croatia',
      },
      {
        scheduleId: 'KRILO-SPL-HVR-0930',
        operator: 'KRILO',
        vesselName: 'Krilo Star',
        routeName: 'Split - Hvar',
        departurePortId: 2,
        arrivalPortId: 8,
        departureTime: new Date(baseDate.getTime() + 9.5 * 60 * 60 * 1000), // 09:30
        arrivalTime: new Date(baseDate.getTime() + 10.5 * 60 * 60 * 1000), // 10:30
        duration: 60,
        availableSeats: 98,
        totalCapacity: 120,
        pricing: {
          adult: 25.00,
          child: 12.50,
          currency: 'EUR',
        },
        amenities: ['wifi', 'express', 'ac'],
        bookingUrl: 'https://www.krilo.hr/',
      },
      {
        scheduleId: 'JAD-SPL-HVR-1400',
        operator: 'JADROLINIJA',
        vesselName: 'Korčula',
        routeName: 'Split - Hvar',
        departurePortId: 2,
        arrivalPortId: 8,
        departureTime: new Date(baseDate.getTime() + 14 * 60 * 60 * 1000), // 14:00
        arrivalTime: new Date(baseDate.getTime() + 15.5 * 60 * 60 * 1000), // 15:30
        duration: 90,
        availableSeats: 143,
        totalCapacity: 200,
        vehicleCapacity: 40,
        availableVehicles: 18,
        pricing: {
          adult: 15.00,
          child: 7.50,
          vehicle: 50.00,
          currency: 'EUR',
        },
        amenities: ['wifi', 'cafe', 'deck', 'ac'],
        bookingUrl: 'https://www.jadrolinija.hr/en/ferry-croatia',
      },
      {
        scheduleId: 'KAPETAN-SPL-HVR-1630',
        operator: 'KAPETAN_LUKA',
        vesselName: 'Kapetan Luka',
        routeName: 'Split - Hvar',
        departurePortId: 2,
        arrivalPortId: 8,
        departureTime: new Date(baseDate.getTime() + 16.5 * 60 * 60 * 1000), // 16:30
        arrivalTime: new Date(baseDate.getTime() + 17.5 * 60 * 60 * 1000), // 17:30
        duration: 60,
        availableSeats: 76,
        totalCapacity: 100,
        pricing: {
          adult: 22.00,
          child: 11.00,
          currency: 'EUR',
        },
        amenities: ['wifi', 'express', 'ac', 'snack-bar'],
        bookingUrl: 'https://www.krilo.hr/',
      },
    ];
  }

  private getMockDubrovnikKorculaSchedules(date: Date): FerryDeparture[] {
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);

    return [
      {
        scheduleId: 'JAD-DBV-KOR-0900',
        operator: 'JADROLINIJA',
        vesselName: 'Petar Hektorović',
        routeName: 'Dubrovnik - Korčula',
        departurePortId: 1,
        arrivalPortId: 10,
        departureTime: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000), // 09:00
        arrivalTime: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000), // 12:00
        duration: 180,
        availableSeats: 124,
        totalCapacity: 180,
        vehicleCapacity: 30,
        availableVehicles: 8,
        pricing: {
          adult: 28.00,
          child: 14.00,
          vehicle: 80.00,
          currency: 'EUR',
        },
        amenities: ['wifi', 'cafe', 'deck', 'ac', 'restaurant'],
        bookingUrl: 'https://www.jadrolinija.hr/en/ferry-croatia',
      },
      {
        scheduleId: 'KRILO-DBV-KOR-1500',
        operator: 'KRILO',
        vesselName: 'Krilo Jet',
        routeName: 'Dubrovnik - Korčula',
        departurePortId: 1,
        arrivalPortId: 10,
        departureTime: new Date(baseDate.getTime() + 15 * 60 * 60 * 1000), // 15:00
        arrivalTime: new Date(baseDate.getTime() + 16.75 * 60 * 60 * 1000), // 16:45
        duration: 105,
        availableSeats: 65,
        totalCapacity: 90,
        pricing: {
          adult: 42.00,
          child: 21.00,
          currency: 'EUR',
        },
        amenities: ['wifi', 'express', 'ac', 'premium-seating'],
        bookingUrl: 'https://www.krilo.hr/',
      },
    ];
  }
}
