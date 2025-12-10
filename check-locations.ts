import { PrismaClient } from './generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkLocations() {
  console.log('\n=== ALL SPLIT AND HVAR LOCATIONS ===');
  const locations = await prisma.location.findMany({
    where: {
      OR: [
        { slug: { contains: 'split' } },
        { slug: { contains: 'hvar' } }
      ]
    },
    orderBy: { id: 'asc' }
  });

  locations.forEach(loc => {
    console.log(`ID: ${loc.id}, Name: "${loc.name}", Slug: "${loc.slug}", Type: ${loc.type}, ParentID: ${loc.parentId}`);
  });

  console.log('\n=== FERRY SERVICES ===');
  const ferries = await prisma.transportService.findMany({
    where: {
      transportType: { in: ['FERRY', 'SPEEDBOAT'] }
    },
    include: {
      service: true,
      departureLocation: true,
      arrivalLocation: true,
    }
  });

  ferries.forEach(ferry => {
    console.log(`\nService: ${ferry.service.name}`);
    console.log(`  Type: ${ferry.transportType}`);
    console.log(`  Departure: ${ferry.departureLocation.name} (ID: ${ferry.departureLocationId})`);
    console.log(`  Arrival: ${ferry.arrivalLocation.name} (ID: ${ferry.arrivalLocationId})`);
    console.log(`  Price: €${ferry.service.price}`);
  });

  await prisma.$disconnect();
  await pool.end();
}

checkLocations().catch(console.error);