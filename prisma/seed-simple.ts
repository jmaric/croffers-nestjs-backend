import { PrismaClient } from '../generated/prisma/client/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting simple database seeding...\n');

  // 1. Create Admin User
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@croffers.com' },
    update: {},
    create: {
      email: 'admin@croffers.com',
      hash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  console.log('✅ Created admin user');

  // 2. Create Tourist Users
  const john = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      hash: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'TOURIST',
      emailVerified: true,
      subscriptionTier: 'PREMIUM',
      subscriptionStatus: 'active',
      stripeSubscriptionId: 'sub_test_john_yearly',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  const sarah = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      email: 'sarah@example.com',
      hash: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Wilson',
      role: 'TOURIST',
      emailVerified: true,
      subscriptionTier: 'PREMIUM',
      subscriptionStatus: 'active',
      stripeSubscriptionId: 'sub_test_sarah_monthly',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const mike = await prisma.user.upsert({
    where: { email: 'mike@example.com' },
    update: {},
    create: {
      email: 'mike@example.com',
      hash: hashedPassword,
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'TOURIST',
      emailVerified: true,
      subscriptionTier: 'FREE',
    },
  });

  console.log('✅ Created 3 tourist users');

  // 3. Create Supplier Users
  const supplierUser1 = await prisma.user.upsert({
    where: { email: 'supplier1@example.com' },
    update: {},
    create: {
      email: 'supplier1@example.com',
      hash: hashedPassword,
      firstName: 'Ivan',
      lastName: 'Horvat',
      role: 'SUPPLIER',
      emailVerified: true,
    },
  });

  const supplierUser2 = await prisma.user.upsert({
    where: { email: 'supplier2@example.com' },
    update: {},
    create: {
      email: 'supplier2@example.com',
      hash: hashedPassword,
      firstName: 'Ana',
      lastName: 'Kovač',
      role: 'SUPPLIER',
      emailVerified: true,
    },
  });

  console.log('✅ Created 2 supplier users');

  // 4. Create Locations
  const dubrovnik = await prisma.location.upsert({
    where: { slug: 'dubrovnik' },
    update: {},
    create: {
      name: 'Dubrovnik',
      slug: 'dubrovnik',
      description:
        'The Pearl of the Adriatic, famous for its stunning Old Town and medieval walls.',
      latitude: 42.6507,
      longitude: 18.0944,
      type: 'CITY',
      isActive: true,
    },
  });

  const split = await prisma.location.upsert({
    where: { slug: 'split' },
    update: {},
    create: {
      name: 'Split',
      slug: 'split',
      description:
        "Croatia's second-largest city, home to the magnificent Diocletian's Palace.",
      latitude: 43.5081,
      longitude: 16.4402,
      type: 'CITY',
      isActive: true,
    },
  });

  const hvar = await prisma.location.upsert({
    where: { slug: 'hvar' },
    update: {},
    create: {
      name: 'Hvar',
      slug: 'hvar',
      description:
        'Stunning island known for lavender fields, beaches, and vibrant nightlife.',
      latitude: 43.1729,
      longitude: 16.4411,
      type: 'ISLAND',
      isActive: true,
    },
  });

  console.log('✅ Created 3 locations');

  // 5. Create Suppliers
  let supplier1 = await prisma.supplier.findFirst({
    where: { userId: supplierUser1.id },
  });

  if (!supplier1) {
    supplier1 = await prisma.supplier.create({
      data: {
        userId: supplierUser1.id,
        businessName: 'Adriatic Luxury Stays',
        registrationNum: 'HR-123456789',
        vatNumber: 'HR12345678901',
        status: 'APPROVED',
        subscriptionTier: 'Premium',
      },
    });
  }

  let supplier2 = await prisma.supplier.findFirst({
    where: { userId: supplierUser2.id },
  });

  if (!supplier2) {
    supplier2 = await prisma.supplier.create({
      data: {
        userId: supplierUser2.id,
        businessName: 'Dalmatian Adventures',
        registrationNum: 'HR-987654321',
        vatNumber: 'HR98765432109',
        status: 'APPROVED',
        subscriptionTier: 'Basic',
      },
    });
  }

  console.log('✅ Created 2 suppliers');

  // 6. Create Services
  const villa = await prisma.service.create({
    data: {
      name: 'Luxury Villa with Sea View',
      slug: 'luxury-villa-sea-view-dubrovnik-' + Date.now(),
      description:
        'Stunning 4-bedroom villa with infinity pool overlooking the Adriatic Sea.',
      type: 'ACCOMMODATION',
      supplierId: supplier1.id,
      locationId: dubrovnik.id,
      price: 350,
      currency: 'EUR',
      capacity: 8,
      isActive: true,
      status: 'ACTIVE',
      amenities: ['Pool', 'WiFi', 'Air Conditioning', 'Kitchen', 'Sea View'],
      details: {
        bedrooms: 4,
        bathrooms: 3,
        checkInTime: '15:00',
        checkOutTime: '11:00',
      },
    },
  });

  const tour = await prisma.service.create({
    data: {
      name: 'Game of Thrones Walking Tour',
      slug: 'got-walking-tour-dubrovnik-' + Date.now(),
      description:
        'Explore the filming locations of Game of Thrones in Dubrovnik with expert guide.',
      type: 'TOUR',
      supplierId: supplier2.id,
      locationId: dubrovnik.id,
      price: 35,
      currency: 'EUR',
      capacity: 15,
      duration: 180,
      isActive: true,
      status: 'ACTIVE',
      amenities: ['Guide', 'Photos', 'Small Group'],
      details: {
        languages: ['English', 'German'],
        meetingPoint: 'Pile Gate',
      },
    },
  });

  const blueCave = await prisma.service.create({
    data: {
      name: 'Blue Cave & Island Hopping Tour',
      slug: 'blue-cave-tour-split-' + Date.now(),
      description: 'Full-day speedboat tour visiting Blue Cave, Vis, and Hvar.',
      type: 'TOUR',
      supplierId: supplier2.id,
      locationId: split.id,
      price: 95,
      currency: 'EUR',
      capacity: 12,
      duration: 600,
      isActive: true,
      status: 'ACTIVE',
      amenities: ['Speedboat', 'Lunch', 'Snorkeling Gear'],
      details: {
        included: ['Blue Cave entrance', 'Lunch'],
      },
    },
  });

  console.log('✅ Created 3 services');

  // 7. Create AI Preferences
  await prisma.userPreferences.upsert({
    where: { userId: john.id },
    update: {},
    create: {
      userId: john.id,
      travelStyles: ['LUXURY', 'ADVENTURE'],
      interests: ['BEACHES', 'WATER_SPORTS', 'PHOTOGRAPHY'],
      minBudget: 100,
      maxBudget: 500,
    },
  });

  await prisma.userPreferences.upsert({
    where: { userId: sarah.id },
    update: {},
    create: {
      userId: sarah.id,
      travelStyles: ['CULTURAL', 'FOODIE'],
      interests: ['HISTORY', 'FOOD', 'WINE'],
      minBudget: 50,
      maxBudget: 200,
    },
  });

  console.log('✅ Created user preferences');

  // 8. Create a Booking
  const booking = await prisma.booking.create({
    data: {
      userId: john.id,
      reference: 'CR-' + Date.now(),
      status: 'CONFIRMED',
      guestName: 'John Doe',
      guestEmail: 'john@example.com',
      groupSize: 2,
      totalPrice: 700,
      currency: 'EUR',
      bookingItems: {
        create: [
          {
            serviceId: villa.id,
            quantity: 1,
            unitPrice: 350,
            checkIn: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            checkOut: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  console.log('✅ Created booking');

  // 9. Create Review
  await prisma.review.create({
    data: {
      userId: john.id,
      supplierId: supplier2.id,
      serviceId: tour.id,
      bookingId: booking.id,
      wouldRecommend: true,
      comment:
        'Amazing tour! Our guide was incredibly knowledgeable. Highly recommend!',
      tags: ['Great Guide', 'Fun', 'Informative'],
      isVerified: true,
    },
  });

  console.log('✅ Created review');

  // 10. Create Supplier Add-ons
  await prisma.supplierAddon.create({
    data: {
      supplierId: supplier1.id,
      addonType: 'ANALYTICS_PRO',
      status: 'ACTIVE',
      startDate: new Date(),
      amount: 29,
      currency: 'EUR',
      stripeSubscriptionId: 'sub_addon_analytics_' + Date.now(),
    },
  });

  await prisma.supplierAddon.create({
    data: {
      supplierId: supplier1.id,
      addonType: 'MARKETING_SUITE',
      status: 'ACTIVE',
      startDate: new Date(),
      amount: 39,
      currency: 'EUR',
      stripeSubscriptionId: 'sub_addon_marketing_' + Date.now(),
    },
  });

  console.log('✅ Created supplier add-ons');

  console.log('\n🎉 Database seeding completed successfully!\n');
  console.log('📋 Test Accounts:');
  console.log('   Admin:    admin@croffers.com / password123');
  console.log('   Tourist:  john@example.com / password123 (Premium Yearly)');
  console.log('   Tourist:  sarah@example.com / password123 (Premium Monthly)');
  console.log('   Tourist:  mike@example.com / password123 (Free)');
  console.log('   Supplier: supplier1@example.com / password123 (+ Add-ons)');
  console.log('   Supplier: supplier2@example.com / password123');
  console.log('\n🚀 API: http://localhost:3333/api/v1');
  console.log('📚 Docs: http://localhost:3333/api/docs\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
