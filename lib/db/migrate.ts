import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql/node';
import { migrate } from 'drizzle-orm/libsql/migrator';

config({
  path: '.env.local',
});

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const db = drizzle({ connection: {
    url: process.env.DATABASE_URL!, 
    authToken: process.env.DATABASE_AUTH_TOKEN!
  }});


  console.log('⏳ Running migrations...');

  const start = Date.now();
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  const end = Date.now();

  console.log('✅ Migrations completed in', end - start, 'ms');
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
