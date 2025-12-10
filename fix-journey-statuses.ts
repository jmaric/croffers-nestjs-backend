import axios from 'axios';

async function fixJourneyStatuses() {
  try {
    console.log('🔧 Fixing journey statuses...\n');

    // You'll need to replace this with your actual auth token
    // You can get it from the browser's localStorage or from a login response
    const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

    if (AUTH_TOKEN === 'your-auth-token-here') {
      console.error('❌ Please set your AUTH_TOKEN environment variable');
      console.log('\nTo get your token:');
      console.log('1. Open your browser console on the frontend');
      console.log('2. Run: localStorage.getItem("token")');
      console.log('3. Copy the token and run:');
      console.log('   AUTH_TOKEN=your-token npx tsx fix-journey-statuses.ts\n');
      process.exit(1);
    }

    const response = await axios.post(
      'http://localhost:3333/api/v1/journeys/recalculate-all-statuses',
      {},
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      }
    );

    console.log('✅ Journey statuses recalculated successfully!\n');
    console.log(`📊 Updated ${response.data.updated} journey(ies)\n`);

    if (response.data.journeys && response.data.journeys.length > 0) {
      console.log('Journey statuses:');
      response.data.journeys.forEach((journey: any) => {
        console.log(`  - Journey ${journey.id}: ${journey.status}`);
      });
    }

    console.log('\n✨ Done! Refresh your dashboard to see the changes.');
  } catch (error: any) {
    console.error('❌ Error fixing journey statuses:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.data?.message || error.message}`);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

fixJourneyStatuses();
