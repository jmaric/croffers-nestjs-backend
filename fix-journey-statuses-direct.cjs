const { PrismaClient } = require('./generated/prisma/client');

const prisma = new PrismaClient();

const JourneyStatus = {
  PLANNING: 'PLANNING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  PENDING_CHANGES: 'PENDING_CHANGES',
  COMPLETED: 'COMPLETED',
};

async function fixJourneyStatuses() {
  try {
    console.log('🔧 Fixing journey statuses directly via database...\n');

    // Get user ID 2's journeys (john@example.com)
    const journeys = await prisma.journey.findMany({
      where: { userId: 2 },
      include: {
        segments: {
          include: {
            booking: true,
          },
        },
      },
    });

    console.log(`Found ${journeys.length} journey(ies) for user 2\n`);

    let updatedCount = 0;

    for (const journey of journeys) {
      const segmentsWithBookings = journey.segments.filter((seg) => seg.booking);

      if (segmentsWithBookings.length === 0) {
        console.log(`Journey ${journey.id} (${journey.name}): No bookings - keeping status ${journey.status}`);
        continue;
      }

      // Check booking states
      const allCancelled = segmentsWithBookings.every(
        (seg) => seg.booking && seg.booking.status === 'CANCELLED'
      );

      const hasActiveBookings = segmentsWithBookings.some(
        (seg) =>
          seg.booking &&
          (seg.booking.status === 'PENDING' || seg.booking.status === 'CONFIRMED')
      );

      const hasCancelledBySupplier = segmentsWithBookings.some(
        (seg) =>
          seg.booking &&
          seg.booking.status === 'CANCELLED' &&
          seg.booking.cancellationReason &&
          seg.booking.cancellationReason.includes('supplier')
      );

      let newStatus = journey.status;

      if (allCancelled) {
        newStatus = JourneyStatus.CANCELLED;
      } else if (hasCancelledBySupplier && hasActiveBookings) {
        newStatus = JourneyStatus.PENDING_CHANGES;
      } else if (!hasActiveBookings && journey.status === JourneyStatus.CONFIRMED) {
        newStatus = JourneyStatus.CANCELLED;
      }

      if (newStatus !== journey.status) {
        await prisma.journey.update({
          where: { id: journey.id },
          data: { status: newStatus },
        });
        console.log(
          `Journey ${journey.id} (${journey.name}): ${journey.status} → ${newStatus}`
        );
        updatedCount++;
      } else {
        console.log(`Journey ${journey.id} (${journey.name}): ${journey.status} (no change)`);
      }
    }

    console.log(`\n✅ Fixed ${updatedCount} journey status(es)!\n`);
    console.log('✨ Done! Refresh your dashboard to see the changes.');
  } catch (error) {
    console.error('❌ Error fixing journey statuses:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixJourneyStatuses();
