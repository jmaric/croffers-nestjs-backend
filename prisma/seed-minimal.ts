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
  console.log('🌱 Seeding database with test data...\n');

  const hash = await argon.hash('password123');

  // 1. Admin
  await prisma.user.upsert({
    where: { email: 'admin@croffers.com' },
    update: {
      hash, // Update the password hash if user already exists
    },
    create: {
      email: 'admin@croffers.com',
      hash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });
  console.log('✅ Admin user');

  // 2. Premium Tourist
  await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {
      hash, // Update the password hash if user already exists
    },
    create: {
      email: 'john@example.com',
      hash,
      firstName: 'John',
      lastName: 'Doe',
      role: 'TOURIST',
      status: 'ACTIVE',
      emailVerified: true,
      subscriptionTier: 'PREMIUM',
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('✅ Premium tourist (john@example.com)');

  // 3. Free Tourist
  await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {
      hash, // Update the password hash if user already exists
    },
    create: {
      email: 'sarah@example.com',
      hash,
      firstName: 'Sarah',
      lastName: 'Wilson',
      role: 'TOURIST',
      status: 'ACTIVE',
      emailVerified: true,
      subscriptionTier: 'FREE',
    },
  });
  console.log('✅ Free tourist (sarah@example.com)');

  // 4. Supplier
  const supplierUser = await prisma.user.upsert({
    where: { email: 'supplier@example.com' },
    update: {
      hash, // Update the password hash if user already exists
    },
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

  const supplier = await prisma.supplier.findFirst({
    where: { userId: supplierUser.id },
  });

  if (!supplier) {
    await prisma.supplier.create({
      data: {
        userId: supplierUser.id,
        businessName: 'Adriatic Tours',
        registrationNum: 'HR-123456789',
        vatNumber: 'HR12345678901',
        status: 'APPROVED',
      },
    });
  }
  console.log('✅ Supplier (supplier@example.com)');

  // 5. Locations
  await prisma.location.upsert({
    where: { slug: 'dubrovnik' },
    update: {},
    create: {
      name: 'Dubrovnik',
      slug: 'dubrovnik',
      description: 'The Pearl of the Adriatic',
      latitude: 42.6507,
      longitude: 18.0944,
      type: 'CITY',
      isActive: true,
    },
  });

  await prisma.location.upsert({
    where: { slug: 'split' },
    update: {},
    create: {
      name: 'Split',
      slug: 'split',
      description: "Home to Diocletian's Palace",
      latitude: 43.5081,
      longitude: 16.4402,
      type: 'CITY',
      isActive: true,
    },
  });

  console.log('✅ Locations (Dubrovnik, Split)');

  // 6. Services with Location Relations
  const supplierRecord = await prisma.supplier.findFirst({
    where: { userId: supplierUser.id },
  });

  const dubrovnikLocation = await prisma.location.findUnique({
    where: { slug: 'dubrovnik' },
  });

  const splitLocation = await prisma.location.findUnique({
    where: { slug: 'split' },
  });

  if (supplierRecord && dubrovnikLocation && splitLocation) {
    // Accommodation in Dubrovnik
    const accommodation1 = await prisma.service.upsert({
      where: { slug: 'luxury-villa-dubrovnik' },
      update: {},
      create: {
        supplierId: supplierRecord.id,
        type: 'ACCOMMODATION',
        name: 'Luxury Villa Dubrovnik Old Town',
        slug: 'luxury-villa-dubrovnik',
        description:
          'Beautiful luxury villa in the heart of Dubrovnik Old Town with stunning sea views',
        shortDescription: 'Luxury villa with sea views',
        price: 250,
        currency: 'EUR',
        capacity: 6,
        isActive: true,
        status: 'ACTIVE',
        tags: ['luxury', 'sea-view', 'old-town'],
        accommodationService: {
          create: {
            locationId: dubrovnikLocation.id,
            accommodationType: 'VILLA',
            bedrooms: 3,
            bathrooms: 2,
            maxGuests: 6,
            amenities: ['WiFi', 'Air Conditioning', 'Sea View', 'Kitchen'],
            checkInTime: '15:00',
            checkOutTime: '11:00',
            minimumStay: 2,
            instantBook: true,
          },
        },
      },
    });

    // Tour in Split
    const tour1 = await prisma.service.upsert({
      where: { slug: 'split-city-walking-tour' },
      update: {},
      create: {
        supplierId: supplierRecord.id,
        type: 'TOUR',
        name: 'Split City Walking Tour',
        slug: 'split-city-walking-tour',
        description:
          'Explore the historic Diocletian\'s Palace and Split\'s old town with a local guide',
        shortDescription: 'Guided walking tour of Split',
        price: 35,
        currency: 'EUR',
        capacity: 15,
        duration: 120,
        isActive: true,
        status: 'ACTIVE',
        tags: ['walking', 'history', 'cultural'],
        tourService: {
          create: {
            locationId: splitLocation.id,
            tourType: 'Walking Tour',
            meetingPoint: 'Diocletian\'s Palace - Golden Gate',
            includes: ['Professional guide', 'Entry to palace cellars'],
            excludes: ['Food and drinks', 'Hotel pickup'],
            difficulty: 'Easy',
            languages: ['en', 'hr', 'de'],
            groupSizeMax: 15,
            cancellationPolicy: 'Free cancellation up to 24 hours before',
          },
        },
      },
    });

    // Accommodation in Split
    const accommodation2 = await prisma.service.upsert({
      where: { slug: 'modern-apartment-split' },
      update: {},
      create: {
        supplierId: supplierRecord.id,
        type: 'ACCOMMODATION',
        name: 'Modern Apartment Split Center',
        slug: 'modern-apartment-split',
        description: 'Stylish modern apartment in the center of Split, 5 minutes walk to the beach',
        shortDescription: 'Modern apartment near beach',
        price: 120,
        currency: 'EUR',
        capacity: 4,
        isActive: true,
        status: 'ACTIVE',
        tags: ['modern', 'city-center', 'beach'],
        accommodationService: {
          create: {
            locationId: splitLocation.id,
            accommodationType: 'APARTMENT',
            bedrooms: 2,
            bathrooms: 1,
            maxGuests: 4,
            amenities: ['WiFi', 'Air Conditioning', 'Washing Machine', 'Parking'],
            checkInTime: '14:00',
            checkOutTime: '10:00',
            minimumStay: 1,
            instantBook: false,
          },
        },
      },
    });

    // Activity in Dubrovnik
    const activity1 = await prisma.service.upsert({
      where: { slug: 'dubrovnik-sea-kayaking' },
      update: {},
      create: {
        supplierId: supplierRecord.id,
        type: 'ACTIVITY',
        name: 'Dubrovnik Sea Kayaking Adventure',
        slug: 'dubrovnik-sea-kayaking',
        description:
          'Paddle around the Dubrovnik city walls and explore hidden caves and beaches',
        shortDescription: 'Sea kayaking around city walls',
        price: 55,
        currency: 'EUR',
        capacity: 10,
        duration: 180,
        isActive: true,
        status: 'ACTIVE',
        tags: ['adventure', 'water-sports', 'outdoor'],
        activityService: {
          create: {
            locationId: dubrovnikLocation.id,
            activityType: 'Water Sports',
            skillLevel: 'Intermediate',
            equipment: ['Kayak', 'Paddle', 'Life jacket', 'Dry bag'],
            ageRestriction: 'Minimum age 12',
            seasonality: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
          },
        },
      },
    });

    console.log('✅ Services with locations (4 services created)');
  }

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('📋 Test Accounts:');
  console.log('   Admin:    admin@croffers.com / password123');
  console.log('   Tourist:  john@example.com / password123 (Premium)');
  console.log('   Tourist:  sarah@example.com / password123 (Free)');
  console.log('   Supplier: supplier@example.com / password123');
  console.log('\n🏨 Services:');
  console.log('   • Luxury Villa Dubrovnik (€250/night)');
  console.log('   • Split City Walking Tour (€35)');
  console.log('   • Modern Apartment Split (€120/night)');
  console.log('   • Dubrovnik Sea Kayaking (€55)');
  console.log('\n🚀 API: http://localhost:3333/api/v1');
  console.log('📚 Docs: http://localhost:3333/api/docs\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
