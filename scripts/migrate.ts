import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '../src/server/db/client';

async function main() {
  if (!db) {
    console.log('No DB configured');
    return;
  }
  
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './migrations' });
  console.log('Migrations complete.');
  await pool?.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

