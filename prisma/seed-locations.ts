import { PrismaClient, LocationType } from '../generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface LocationData {
  name: string;
  slug: string;
  type: LocationType;
  description: string;
  latitude: number;
  longitude: number;
  parentName?: string;
}

const locations: LocationData[] = [
  // ============================================
  // DUBROVNIK LOCATIONS
  // ============================================
  {
    name: 'Dubrovnik Old Town',
    slug: 'dubrovnik-old-town',
    type: 'ATTRACTION',
    description: 'UNESCO World Heritage Site with medieval architecture',
    latitude: 42.6413,
    longitude: 18.1083,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Dubrovnik City Walls',
    slug: 'dubrovnik-city-walls',
    type: 'ATTRACTION',
    description: 'Famous medieval defensive walls surrounding the old city',
    latitude: 42.6411,
    longitude: 18.1105,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Dubrovnik Cable Car',
    slug: 'dubrovnik-cable-car',
    type: 'ATTRACTION',
    description: 'Cable car to Mount Srđ with panoramic views',
    latitude: 42.6419,
    longitude: 18.1127,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Banje Beach',
    slug: 'banje-beach',
    type: 'BEACH',
    description: 'Popular city beach with views of the Old Town',
    latitude: 42.6408,
    longitude: 18.1161,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Copacabana Beach Dubrovnik',
    slug: 'copacabana-beach-dubrovnik',
    type: 'BEACH',
    description: 'Pebble beach on Lapad peninsula with water sports',
    latitude: 42.6564,
    longitude: 18.0758,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Lapad Beach',
    slug: 'lapad-beach',
    type: 'BEACH',
    description: 'Sandy beach popular with families',
    latitude: 42.6553,
    longitude: 18.0794,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Sveti Jakov Beach',
    slug: 'sveti-jakov-beach',
    type: 'BEACH',
    description: 'Secluded pebble beach with stunning views',
    latitude: 42.6294,
    longitude: 18.1142,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Stradun',
    slug: 'stradun',
    type: 'ATTRACTION',
    description: 'Main street of Dubrovnik Old Town',
    latitude: 42.6413,
    longitude: 18.1087,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Lovrijenac Fort',
    slug: 'lovrijenac-fort',
    type: 'ATTRACTION',
    description: 'Historic fortress known as Dubrovnik\'s Gibraltar',
    latitude: 42.6394,
    longitude: 18.1053,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Rector\'s Palace',
    slug: 'rectors-palace',
    type: 'ATTRACTION',
    description: 'Gothic-Renaissance palace, now a museum',
    latitude: 42.6404,
    longitude: 18.1105,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Dubrovnik Cathedral',
    slug: 'dubrovnik-cathedral',
    type: 'ATTRACTION',
    description: 'Baroque cathedral dedicated to the Assumption of Mary',
    latitude: 42.6404,
    longitude: 18.1107,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Pile Gate',
    slug: 'pile-gate',
    type: 'ATTRACTION',
    description: 'Main entrance to Dubrovnik Old Town',
    latitude: 42.6416,
    longitude: 18.1067,
    parentName: 'Dubrovnik',
  },
  {
    name: 'Buža Bar',
    slug: 'buza-bar',
    type: 'ATTRACTION',
    description: 'Cliffside bar with sea views outside the city walls',
    latitude: 42.6397,
    longitude: 18.1122,
    parentName: 'Dubrovnik',
  },

  // ============================================
  // SPLIT LOCATIONS
  // ============================================
  {
    name: 'Diocletian\'s Palace',
    slug: 'diocletians-palace',
    type: 'ATTRACTION',
    description: 'Ancient Roman palace built for Emperor Diocletian',
    latitude: 43.5081,
    longitude: 16.4402,
    parentName: 'Split',
  },
  {
    name: 'Split Riva Waterfront',
    slug: 'split-riva-waterfront',
    type: 'ATTRACTION',
    description: 'Palm-lined promenade along the harbor',
    latitude: 43.5078,
    longitude: 16.4394,
    parentName: 'Split',
  },
  {
    name: 'Marjan Hill',
    slug: 'marjan-hill',
    type: 'ATTRACTION',
    description: 'Forested hill with walking trails and viewpoints',
    latitude: 43.5147,
    longitude: 16.4194,
    parentName: 'Split',
  },
  {
    name: 'Bačvice Beach',
    slug: 'bacvice-beach',
    type: 'BEACH',
    description: 'Sandy beach close to city center, famous for picigin',
    latitude: 43.5036,
    longitude: 16.4503,
    parentName: 'Split',
  },
  {
    name: 'Žnjan Beach',
    slug: 'znjan-beach',
    type: 'BEACH',
    description: 'Long pebble beach with shallow water, family-friendly',
    latitude: 43.5000,
    longitude: 16.4800,
    parentName: 'Split',
  },
  {
    name: 'Kašjuni Beach',
    slug: 'kasjuni-beach',
    type: 'BEACH',
    description: 'Secluded pebble beach on southern side of Marjan',
    latitude: 43.5222,
    longitude: 16.4125,
    parentName: 'Split',
  },
  {
    name: 'Kaštelet Beach',
    slug: 'kastelet-beach',
    type: 'BEACH',
    description: 'Small beach near Marjan with clear water',
    latitude: 43.5197,
    longitude: 16.4169,
    parentName: 'Split',
  },
  {
    name: 'Firule Beach',
    slug: 'firule-beach',
    type: 'BEACH',
    description: 'Small pebble beach near the city center',
    latitude: 43.5097,
    longitude: 16.4478,
    parentName: 'Split',
  },
  {
    name: 'Split Old Town',
    slug: 'split-old-town',
    type: 'ATTRACTION',
    description: 'Historic center within and around Diocletian\'s Palace',
    latitude: 43.5083,
    longitude: 16.4403,
    parentName: 'Split',
  },
  {
    name: 'Meštrović Gallery',
    slug: 'mestrovic-gallery',
    type: 'ATTRACTION',
    description: 'Museum dedicated to sculptor Ivan Meštrović',
    latitude: 43.5153,
    longitude: 16.4236,
    parentName: 'Split',
  },
  {
    name: 'Pjaca Square',
    slug: 'pjaca-square',
    type: 'ATTRACTION',
    description: 'Main square in Split Old Town (People\'s Square)',
    latitude: 43.5086,
    longitude: 16.4397,
    parentName: 'Split',
  },
  {
    name: 'Split Green Market',
    slug: 'split-green-market',
    type: 'ATTRACTION',
    description: 'Traditional open-air market selling local produce',
    latitude: 43.5089,
    longitude: 16.4417,
    parentName: 'Split',
  },
  {
    name: 'Sustipan Beach',
    slug: 'sustipan-beach',
    type: 'BEACH',
    description: 'Rocky beach with pine trees, popular for sunsets',
    latitude: 43.5058,
    longitude: 16.4278,
    parentName: 'Split',
  },
  {
    name: 'Gregory of Nin Statue',
    slug: 'gregory-of-nin-statue',
    type: 'ATTRACTION',
    description: 'Famous bronze statue with lucky toe',
    latitude: 43.5089,
    longitude: 16.4383,
    parentName: 'Split',
  },
  {
    name: 'Split Archaeological Museum',
    slug: 'split-archaeological-museum',
    type: 'ATTRACTION',
    description: 'Oldest museum in Croatia with ancient artifacts',
    latitude: 43.5119,
    longitude: 16.4350,
    parentName: 'Split',
  },
  {
    name: 'Bene Beach',
    slug: 'bene-beach',
    type: 'BEACH',
    description: 'Popular beach complex on Marjan peninsula',
    latitude: 43.5211,
    longitude: 16.4139,
    parentName: 'Split',
  },
];

async function main() {
  console.log('🌍 Seeding Dubrovnik and Split locations...');

  // First, get the parent cities
  const dubrovnik = await prisma.location.findFirst({
    where: { name: 'Dubrovnik' },
  });

  const split = await prisma.location.findFirst({
    where: { name: 'Split' },
  });

  if (!dubrovnik || !split) {
    console.error('❌ Parent cities (Dubrovnik and Split) not found. Please run the main seed first.');
    return;
  }

  console.log(`✅ Found parent cities: Dubrovnik (ID: ${dubrovnik.id}), Split (ID: ${split.id})`);

  let created = 0;
  let skipped = 0;

  for (const location of locations) {
    // Check if location already exists
    const existing = await prisma.location.findUnique({
      where: { slug: location.slug },
    });

    if (existing) {
      console.log(`⏭️  Skipping ${location.name} (already exists)`);
      skipped++;
      continue;
    }

    // Get parent ID
    const parentId = location.parentName === 'Dubrovnik' ? dubrovnik.id : split.id;

    // Create location
    await prisma.location.create({
      data: {
        name: location.name,
        slug: location.slug,
        type: location.type,
        description: location.description,
        latitude: location.latitude,
        longitude: location.longitude,
        parentId,
        isActive: true,
      },
    });

    console.log(`✅ Created: ${location.name}`);
    created++;
  }

  console.log('\n🎉 Seeding complete!');
  console.log(`   Created: ${created} locations`);
  console.log(`   Skipped: ${skipped} locations (already existed)`);
  console.log(`   Total: ${created + skipped} locations processed`);

  // Show summary
  const dubrovnikCount = await prisma.location.count({
    where: { parentId: dubrovnik.id },
  });

  const splitCount = await prisma.location.count({
    where: { parentId: split.id },
  });

  console.log('\n📊 Location Summary:');
  console.log(`   Dubrovnik attractions: ${dubrovnikCount}`);
  console.log(`   Split attractions: ${splitCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding locations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
