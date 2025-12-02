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
  console.log('🌱 Seeding database with test data...\n');

  const hash = await bcrypt.hash('password123', 10);

  // 1. Admin
  await prisma.user.upsert({
    where: { email: 'admin@croffers.com' },
    update: {},
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
    update: {},
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
    update: {},
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

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('📋 Test Accounts:');
  console.log('   Admin:    admin@croffers.com / password123');
  console.log('   Tourist:  john@example.com / password123 (Premium)');
  console.log('   Tourist:  sarah@example.com / password123 (Free)');
  console.log('   Supplier: supplier@example.com / password123');
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
