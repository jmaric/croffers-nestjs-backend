import { PrismaClient } from '../generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon from 'argon2';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Split-Hvar journey data...\n');

  // Get or create supplier
  const hash = await argon.hash('password123');
  const supplierUser = await prisma.user.upsert({
    where: { email: 'supplier@example.com' },
    update: {},
    create: {
      email: 'supplier@example.com',
      hash,
      firstName: 'Ivan',
      lastName: 'Horvat',
      role: 'SUPPLIER',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  let supplier = await prisma.supplier.findFirst({
    where: { userId: supplierUser.id },
  });

  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        userId: supplierUser.id,
        businessName: 'Adriatic Ferry Services',
        registrationNum: 'HR-987654321',
        vatNumber: 'HR98765432109',
        status: 'APPROVED',
      },
    });
  }
  console.log('✅ Supplier ready');

  // 1. Create Locations
  const splitCity = await prisma.location.upsert({
    where: { slug: 'split' },
    update: {},
    create: {
      name: 'Split',
      slug: 'split',
      description: "Croatia's second-largest city with Diocletian's Palace",
      latitude: 43.5081,
      longitude: 16.4402,
      type: 'CITY',
      isActive: true,
    },
  });

  const splitPort = await prisma.location.upsert({
    where: { slug: 'split-port' },
    update: {},
    create: {
      name: 'Split Port',
      slug: 'split-port',
      description: 'Main ferry port in Split',
      latitude: 43.5047,
      longitude: 16.4437,
      type: 'PORT',
      isActive: true,
      parentId: splitCity.id,
    },
  });

  const hvarIsland = await prisma.location.upsert({
    where: { slug: 'hvar-island' },
    update: {},
    create: {
      name: 'Hvar',
      slug: 'hvar-island',
      description: 'Beautiful Croatian island known for lavender and nightlife',
      latitude: 43.1729,
      longitude: 16.4412,
      type: 'ISLAND',
      isActive: true,
    },
  });

  const hvarTown = await prisma.location.upsert({
    where: { slug: 'hvar-town' },
    update: {},
    create: {
      name: 'Hvar Town',
      slug: 'hvar-town',
      description: 'Main town on Hvar island',
      latitude: 43.1729,
      longitude: 16.4412,
      type: 'CITY',
      isActive: true,
      parentId: hvarIsland.id,
    },
  });

  const hvarPort = await prisma.location.upsert({
    where: { slug: 'hvar-port' },
    update: {},
    create: {
      name: 'Hvar Port',
      slug: 'hvar-port',
      description: 'Ferry port in Hvar Town',
      latitude: 43.1722,
      longitude: 16.4419,
      type: 'PORT',
      isActive: true,
      parentId: hvarTown.id,
    },
  });

  console.log('✅ Locations created (Split, Split Port, Hvar, Hvar Town, Hvar Port)');

  // 2. Create Ferry Service (Split to Hvar)
  const ferryService = await prisma.service.upsert({
    where: { slug: 'split-hvar-ferry' },
    update: {},
    create: {
      supplierId: supplier.id,
      type: 'TRANSPORT',
      name: 'Split - Hvar Ferry',
      slug: 'split-hvar-ferry',
      description: 'Daily ferry service from Split to Hvar. Journey takes approximately 1 hour.',
      shortDescription: 'Ferry to Hvar island',
      price: 25.00,
      currency: 'EUR',
      capacity: 200,
      duration: 60, // 1 hour
      isActive: true,
      status: 'ACTIVE',
      tags: ['ferry', 'transport', 'island-hopping'],
      transportService: {
        create: {
          transportType: 'FERRY',
          departureLocationId: splitPort.id,
          arrivalLocationId: hvarPort.id,
          isScheduled: true,
          vehicleCapacity: 50,
          vehicleType: 'Ferry',
          amenities: ['Cafeteria', 'Outdoor Deck', 'WiFi', 'Air Conditioning'],
        },
      },
    },
    include: {
      transportService: true,
    },
  });

  console.log('✅ Ferry service created (Split → Hvar)');

  // 3. Create Speedboat Service (faster alternative)
  const speedboatService = await prisma.service.upsert({
    where: { slug: 'split-hvar-speedboat' },
    update: {},
    create: {
      supplierId: supplier.id,
      type: 'TRANSPORT',
      name: 'Split - Hvar Speedboat',
      slug: 'split-hvar-speedboat',
      description: 'Fast speedboat transfer from Split to Hvar. Journey takes only 30 minutes.',
      shortDescription: 'Fast speedboat to Hvar',
      price: 45.00,
      currency: 'EUR',
      capacity: 50,
      duration: 30, // 30 minutes
      isActive: true,
      status: 'ACTIVE',
      tags: ['speedboat', 'fast-transport', 'island-hopping'],
      transportService: {
        create: {
          transportType: 'SPEEDBOAT',
          departureLocationId: splitPort.id,
          arrivalLocationId: hvarPort.id,
          isScheduled: true,
          vehicleCapacity: 0, // No vehicles on speedboat
          vehicleType: 'Speedboat',
          amenities: ['Outdoor Deck', 'Life Jackets'],
        },
      },
    },
    include: {
      transportService: true,
    },
  });

  console.log('✅ Speedboat service created (Split → Hvar)');

  // 4. Create Accommodations in Hvar
  const hvarVilla = await prisma.service.upsert({
    where: { slug: 'luxury-villa-hvar-town' },
    update: {},
    create: {
      supplierId: supplier.id,
      type: 'ACCOMMODATION',
      name: 'Luxury Villa Hvar Town',
      slug: 'luxury-villa-hvar-town',
      description: 'Stunning villa in Hvar Town with panoramic sea views, infinity pool, and modern amenities. Walking distance to restaurants and nightlife.',
      shortDescription: 'Luxury villa with sea view',
      price: 350.00,
      currency: 'EUR',
      capacity: 8,
      isActive: true,
      status: 'ACTIVE',
      tags: ['luxury', 'sea-view', 'pool', 'hvar'],
      accommodationService: {
        create: {
          locationId: hvarTown.id,
          accommodationType: 'VILLA',
          bedrooms: 4,
          bathrooms: 3,
          maxGuests: 8,
          amenities: ['WiFi', 'Air Conditioning', 'Sea View', 'Infinity Pool', 'Kitchen', 'Parking', 'BBQ', 'Terrace'],
          checkInTime: '15:00',
          checkOutTime: '11:00',
          minimumStay: 3,
          instantBook: false,
        },
      },
    },
  });

  const hvarApartment = await prisma.service.upsert({
    where: { slug: 'cozy-apartment-hvar' },
    update: {},
    create: {
      supplierId: supplier.id,
      type: 'ACCOMMODATION',
      name: 'Cozy Apartment Hvar Center',
      slug: 'cozy-apartment-hvar',
      description: 'Charming apartment in the heart of Hvar Town, steps from the harbor. Perfect for couples or small families.',
      shortDescription: 'Central apartment in Hvar',
      price: 150.00,
      currency: 'EUR',
      capacity: 4,
      isActive: true,
      status: 'ACTIVE',
      tags: ['apartment', 'central', 'hvar', 'harbor-view'],
      accommodationService: {
        create: {
          locationId: hvarTown.id,
          accommodationType: 'APARTMENT',
          bedrooms: 2,
          bathrooms: 1,
          maxGuests: 4,
          amenities: ['WiFi', 'Air Conditioning', 'Kitchen', 'Balcony', 'Harbor View'],
          checkInTime: '14:00',
          checkOutTime: '10:00',
          minimumStay: 2,
          instantBook: true,
        },
      },
    },
  });

  const hvarHotel = await prisma.service.upsert({
    where: { slug: 'boutique-hotel-hvar' },
    update: {},
    create: {
      supplierId: supplier.id,
      type: 'ACCOMMODATION',
      name: 'Boutique Hotel Hvar',
      slug: 'boutique-hotel-hvar',
      description: '4-star boutique hotel with rooftop pool, spa, and restaurant. Located in historic Hvar Town center.',
      shortDescription: 'Boutique hotel with spa',
      price: 220.00,
      currency: 'EUR',
      capacity: 2,
      isActive: true,
      status: 'ACTIVE',
      tags: ['hotel', 'boutique', 'spa', 'pool', 'hvar'],
      accommodationService: {
        create: {
          locationId: hvarTown.id,
          accommodationType: 'HOTEL',
          bedrooms: 1,
          bathrooms: 1,
          maxGuests: 2,
          amenities: ['WiFi', 'Air Conditioning', 'Mini Bar', 'Spa', 'Pool', 'Restaurant', 'Gym', 'Room Service'],
          checkInTime: '15:00',
          checkOutTime: '12:00',
          minimumStay: 1,
          instantBook: true,
        },
      },
    },
  });

  console.log('✅ Accommodations created in Hvar (3 options)');

  // 5. Create some tours/activities in Hvar
  const hvarWineTour = await prisma.service.upsert({
    where: { slug: 'hvar-wine-tour' },
    update: {},
    create: {
      supplierId: supplier.id,
      type: 'TOUR',
      name: 'Hvar Wine Tasting Tour',
      slug: 'hvar-wine-tour',
      description: 'Explore Hvar\'s famous vineyards and taste local wines. Visit traditional wine cellars and learn about Croatian winemaking.',
      shortDescription: 'Wine tasting in vineyards',
      price: 75.00,
      currency: 'EUR',
      capacity: 12,
      duration: 240, // 4 hours
      isActive: true,
      status: 'ACTIVE',
      tags: ['wine', 'tour', 'cultural', 'food'],
      tourService: {
        create: {
          locationId: hvarIsland.id,
          tourType: 'Wine Tour',
          meetingPoint: 'Hvar Town Main Square',
          includes: ['Transportation', 'Wine tasting', 'Local guide', 'Snacks'],
          excludes: ['Lunch', 'Hotel pickup'],
          difficulty: 'Easy',
          languages: ['en', 'hr', 'de', 'it'],
          groupSizeMax: 12,
          cancellationPolicy: 'Free cancellation up to 48 hours before',
        },
      },
    },
  });

  const hvarBoatTour = await prisma.service.upsert({
    where: { slug: 'hvar-pakleni-islands-tour' },
    update: {},
    create: {
      supplierId: supplier.id,
      type: 'TOUR',
      name: 'Pakleni Islands Boat Tour',
      slug: 'hvar-pakleni-islands-tour',
      description: 'Discover the beautiful Pakleni Islands near Hvar. Swimming, snorkeling, and beach stops included.',
      shortDescription: 'Island hopping boat tour',
      price: 60.00,
      currency: 'EUR',
      capacity: 20,
      duration: 300, // 5 hours
      isActive: true,
      status: 'ACTIVE',
      tags: ['boat', 'islands', 'swimming', 'adventure'],
      tourService: {
        create: {
          locationId: hvarIsland.id,
          tourType: 'Boat Tour',
          meetingPoint: 'Hvar Harbor',
          includes: ['Boat ride', 'Snorkeling equipment', 'Drinks', 'Professional crew'],
          excludes: ['Lunch', 'Towels'],
          difficulty: 'Easy',
          languages: ['en', 'hr'],
          groupSizeMax: 20,
          cancellationPolicy: 'Free cancellation up to 24 hours before',
        },
      },
    },
  });

  console.log('✅ Tours created in Hvar (Wine tour, Boat tour)');

  console.log('\n🎉 Split-Hvar journey data seeded successfully!\n');
  console.log('📍 Locations:');
  console.log('   • Split City');
  console.log('   • Split Port');
  console.log('   • Hvar Island');
  console.log('   • Hvar Town');
  console.log('   • Hvar Port');
  console.log('\n🚢 Transport:');
  console.log('   • Split → Hvar Ferry (€25, 60 min)');
  console.log('   • Split → Hvar Speedboat (€45, 30 min)');
  console.log('\n🏨 Accommodation in Hvar:');
  console.log('   • Luxury Villa Hvar Town (€350/night, 8 guests)');
  console.log('   • Cozy Apartment Hvar Center (€150/night, 4 guests)');
  console.log('   • Boutique Hotel Hvar (€220/night, 2 guests)');
  console.log('\n🎯 Activities in Hvar:');
  console.log('   • Hvar Wine Tasting Tour (€75, 4h)');
  console.log('   • Pakleni Islands Boat Tour (€60, 5h)');
  console.log('\n✅ Your journey planner should now work for Split → Hvar routes!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
