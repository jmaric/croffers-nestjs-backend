import { PrismaClient } from './generated/prisma/client/client.ts';
const prisma = new PrismaClient();

async function checkJourneyData() {
  // Get the most recent journey
  const journey = await prisma.journey.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      segments: {
        include: {
          service: true,
          departureLocation: true,
          arrivalLocation: true,
        },
        orderBy: { segmentOrder: 'asc' },
      },
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  console.log('\n=== MOST RECENT JOURNEY ===');
  console.log('Journey ID:', journey?.id);
  console.log('User:', journey?.user.email);
  console.log('Created:', journey?.createdAt);
  console.log('Name:', journey?.name);
  console.log('Status:', journey?.status);
  console.log('\n=== SEGMENTS ===');
  console.log('Total segments:', journey?.segments.length || 0);

  if (journey?.segments) {
    journey.segments.forEach((seg, index) => {
      console.log(`\nSegment ${index + 1}:`);
      console.log('  - Type:', seg.segmentType);
      console.log('  - Service ID:', seg.serviceId);
      console.log('  - Service exists:', !!seg.service);
      console.log('  - Service name:', seg.service?.name || 'NULL');
      console.log('  - Departure:', seg.departureLocation?.name || 'NULL');
      console.log('  - Arrival:', seg.arrivalLocation?.name || 'NULL');
      console.log('  - Price:', seg.price.toString());
    });
  }

  await prisma.$disconnect();
}

checkJourneyData().catch(console.error);