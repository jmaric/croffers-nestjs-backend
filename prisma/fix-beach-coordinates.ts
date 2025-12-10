import { PrismaClient } from '../generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface CoordinateFix {
  name: string;
  correctLatitude: number;
  correctLongitude: number;
  note: string;
}

// Corrected coordinates based on Google Maps
const fixes: CoordinateFix[] = [
  {
    name: 'Firule Beach',
    correctLatitude: 43.5088,
    correctLongitude: 16.4508,
    note: 'Near tennis stadium, east of city center',
  },
  {
    name: 'Sustipan Beach',
    correctLatitude: 43.5056,
    correctLongitude: 16.4236,
    note: 'Sustipan peninsula, southwest of center',
  },
  {
    name: 'Kašjuni Beach',
    correctLatitude: 43.5167,
    correctLongitude: 16.4081,
    note: 'South side of Marjan Hill',
  },
  {
    name: 'Kaštelet Beach',
    correctLatitude: 43.5192,
    correctLongitude: 16.4150,
    note: 'West side of Marjan peninsula',
  },
  {
    name: 'Bene Beach',
    correctLatitude: 43.5189,
    correctLongitude: 16.4119,
    note: 'West/southwest side of Marjan',
  },
];

async function main() {
  console.log('🔧 Fixing beach coordinates in Split...\n');

  for (const fix of fixes) {
    const location = await prisma.location.findFirst({
      where: { name: fix.name },
    });

    if (!location) {
      console.log(`❌ Location not found: ${fix.name}`);
      continue;
    }

    console.log(`📍 Fixing: ${fix.name}`);
    console.log(`   Old: ${location.latitude}, ${location.longitude}`);
    console.log(`   New: ${fix.correctLatitude}, ${fix.correctLongitude}`);
    console.log(`   Note: ${fix.note}`);

    await prisma.location.update({
      where: { id: location.id },
      data: {
        latitude: fix.correctLatitude,
        longitude: fix.correctLongitude,
      },
    });

    console.log(`   ✅ Updated\n`);
  }

  console.log('🎉 All beach coordinates fixed!');
  console.log('\nVerify with Google Maps:');
  for (const fix of fixes) {
    console.log(
      `${fix.name}: https://www.google.com/maps?q=${fix.correctLatitude},${fix.correctLongitude}`,
    );
  }
}

main()
  .catch((e) => {
    console.error('❌ Error fixing coordinates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
