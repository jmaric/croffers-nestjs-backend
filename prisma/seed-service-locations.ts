import { PrismaClient, LocationType } from '../generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface ServiceLocationData {
  name: string;
  slug: string;
  type: LocationType;
  description: string;
  latitude: number;
  longitude: number;
}

// Main Croatian destinations for services
const serviceLocations: ServiceLocationData[] = [
  // ============================================
  // DALMATIAN ISLANDS
  // ============================================
  {
    name: 'Hvar',
    slug: 'hvar',
    type: 'ISLAND',
    description: 'Beautiful island known for lavender fields, beaches, and vibrant nightlife',
    latitude: 43.1729,
    longitude: 16.4411,
  },
  {
    name: 'Brač',
    slug: 'brac',
    type: 'ISLAND',
    description: 'Home to Zlatni Rat beach and famous white stone quarries',
    latitude: 43.3167,
    longitude: 16.6500,
  },
  {
    name: 'Korčula',
    slug: 'korcula',
    type: 'ISLAND',
    description: 'Medieval walled town and birthplace of Marco Polo',
    latitude: 42.9603,
    longitude: 17.1347,
  },
  {
    name: 'Šolta',
    slug: 'solta',
    type: 'ISLAND',
    description: 'Peaceful island close to Split, known for olive oil and wine',
    latitude: 43.3833,
    longitude: 16.2833,
  },
  {
    name: 'Vis',
    slug: 'vis',
    type: 'ISLAND',
    description: 'Remote island with untouched nature and the famous Blue Cave',
    latitude: 43.0500,
    longitude: 16.1833,
  },
  {
    name: 'Mljet',
    slug: 'mljet',
    type: 'ISLAND',
    description: 'National park island with saltwater lakes and dense forests',
    latitude: 42.7333,
    longitude: 17.5333,
  },
  {
    name: 'Pag',
    slug: 'pag',
    type: 'ISLAND',
    description: 'Famous for Pag cheese, salt production, and Zrće beach parties',
    latitude: 44.4500,
    longitude: 15.0500,
  },

  // ============================================
  // NORTHERN ADRIATIC ISLANDS
  // ============================================
  {
    name: 'Krk',
    slug: 'krk',
    type: 'ISLAND',
    description: 'Large island connected to mainland by bridge, rich history',
    latitude: 45.0333,
    longitude: 14.5833,
  },
  {
    name: 'Cres',
    slug: 'cres',
    type: 'ISLAND',
    description: 'Pristine nature, griffon vulture sanctuary',
    latitude: 44.9500,
    longitude: 14.4000,
  },
  {
    name: 'Lošinj',
    slug: 'losinj',
    type: 'ISLAND',
    description: 'Wellness island with dolphins, luxury hotels and villas',
    latitude: 44.5333,
    longitude: 14.4667,
  },
  {
    name: 'Rab',
    slug: 'rab',
    type: 'ISLAND',
    description: 'Medieval old town, sandy beaches, and four bell towers',
    latitude: 44.7500,
    longitude: 14.7667,
  },

  // ============================================
  // COASTAL CITIES (not already seeded)
  // ============================================
  {
    name: 'Zadar',
    slug: 'zadar',
    type: 'CITY',
    description: 'Historic city with Sea Organ and Greeting to the Sun installations',
    latitude: 44.1194,
    longitude: 15.2314,
  },
  {
    name: 'Šibenik',
    slug: 'sibenik',
    type: 'CITY',
    description: 'Medieval city with UNESCO Cathedral and Krka National Park nearby',
    latitude: 43.7350,
    longitude: 15.8952,
  },
  {
    name: 'Trogir',
    slug: 'trogir',
    type: 'CITY',
    description: 'UNESCO World Heritage medieval town on a small island',
    latitude: 43.5147,
    longitude: 16.2511,
  },
  {
    name: 'Makarska',
    slug: 'makarska',
    type: 'CITY',
    description: 'Popular seaside resort with long pebble beach and Biokovo mountain',
    latitude: 43.2969,
    longitude: 17.0178,
  },
  {
    name: 'Rovinj',
    slug: 'rovinj',
    type: 'CITY',
    description: 'Picturesque Istrian town with Venetian architecture',
    latitude: 45.0811,
    longitude: 13.6386,
  },
  {
    name: 'Pula',
    slug: 'pula',
    type: 'CITY',
    description: 'Roman amphitheater and gateway to Istria',
    latitude: 44.8683,
    longitude: 13.8481,
  },
  {
    name: 'Poreč',
    slug: 'porec',
    type: 'CITY',
    description: 'Istrian resort town with Euphrasian Basilica (UNESCO)',
    latitude: 45.2258,
    longitude: 13.5944,
  },
  {
    name: 'Opatija',
    slug: 'opatija',
    type: 'CITY',
    description: 'Historic Habsburg-era resort town on Kvarner Bay',
    latitude: 45.3378,
    longitude: 14.3056,
  },
];

async function main() {
  console.log('🏝️  Seeding service locations (main Croatian destinations)...\n');

  let created = 0;
  let skipped = 0;

  for (const location of serviceLocations) {
    // Check if location already exists
    const existing = await prisma.location.findUnique({
      where: { slug: location.slug },
    });

    if (existing) {
      console.log(`⏭️  Skipping ${location.name} (already exists)`);
      skipped++;
      continue;
    }

    // Create service location (no parent - these are top-level)
    await prisma.location.create({
      data: {
        name: location.name,
        slug: location.slug,
        type: location.type,
        description: location.description,
        latitude: location.latitude,
        longitude: location.longitude,
        parentId: null, // Top-level service locations
        isActive: true,
      },
    });

    console.log(`✅ Created: ${location.name} (${location.type})`);
    created++;
  }

  console.log('\n🎉 Seeding complete!');
  console.log(`   Created: ${created} service locations`);
  console.log(`   Skipped: ${skipped} locations (already existed)`);
  console.log(`   Total: ${created + skipped} locations processed`);

  // Show summary
  const islandCount = await prisma.location.count({
    where: { type: 'ISLAND', parentId: null },
  });

  const cityCount = await prisma.location.count({
    where: { type: 'CITY', parentId: null },
  });

  console.log('\n📊 Service Location Summary:');
  console.log(`   Islands: ${islandCount}`);
  console.log(`   Cities: ${cityCount}`);
  console.log(`   Total Service Locations: ${islandCount + cityCount}`);

  console.log('\n💡 Note: These locations are for SERVICES (hotels, tours, etc.)');
  console.log('   Crowd intelligence will use child locations (beaches, attractions)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding service locations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
