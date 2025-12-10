import { PrismaClient } from './generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkJourney() {
  const journey = await prisma.journey.findFirst({
    where: { totalPrice: 900 },
    orderBy: { createdAt: 'desc' },
    include: {
      originLocation: true,
      destLocation: true,
      segments: {
        orderBy: { segmentOrder: 'asc' },
        include: {
          departureLocation: true,
          arrivalLocation: true,
          service: true,
        }
      }
    }
  });

  if (journey) {
    console.log('\n=== JOURNEY DETAILS ===');
    console.log(`Journey ID: ${journey.id}`);
    console.log(`Origin: ${journey.originLocation.name} (ID: ${journey.originLocationId})`);
    console.log(`Destination: ${journey.destLocation.name} (ID: ${journey.destLocationId})`);
    console.log(`Total Price: €${journey.totalPrice}`);
    console.log(`Created: ${journey.createdAt}`);
    console.log(`\nSegments: ${journey.segments.length}`);

    journey.segments.forEach((seg, i) => {
      console.log(`\n  Segment ${i + 1}:`);
      console.log(`    Type: ${seg.segmentType}`);
      console.log(`    Service: ${seg.service?.name || 'N/A'}`);
      console.log(`    From: ${seg.departureLocation?.name || 'N/A'} (ID: ${seg.departureLocationId})`);
      console.log(`    To: ${seg.arrivalLocation?.name || 'N/A'} (ID: ${seg.arrivalLocationId})`);
      console.log(`    Price: €${seg.price}`);
      console.log(`    Metadata:`, seg.metadata);
    });
  }

  await prisma.$disconnect();
  await pool.end();
}

checkJourney().catch(console.error);