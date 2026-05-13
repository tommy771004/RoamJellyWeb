import { db } from '../src/server/db/client';
import { flights } from '../src/server/db/schema';

async function clearFlights() {
  console.log('Clearing fake flights...');
  try {
    if (db) {
      await db.delete(flights);
      console.log('Successfully cleared all flights.');
    } else {
      console.log('No DB connection.');
    }
  } catch (error) {
    console.error('Failed to clear flights:', error);
  }
  process.exit(0);
}

clearFlights();
