import { createApp } from './app.js';
import { env } from './config/env.js';
import { verifySupabaseConnection } from './config/supabase.js';

async function start() {
  await verifySupabaseConnection();
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`TrustCom API running on http://localhost:${env.port}`);
    console.log(`Client URL: ${env.clientUrl}`);
    console.log('Database: Supabase PostgreSQL (auth_users table)');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  console.error(
    'Tip: Run database-migrations/create-auth-users-table.sql in Supabase SQL Editor if the table is missing.'
  );
  process.exit(1);
});
