import { createApp } from './app.js';
import { env } from './config/env.js';
import { verifySupabaseConnection } from './config/supabase.js';

async function start() {
  await verifySupabaseConnection();
  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`TrustCom API running on http://localhost:${env.port}`);
    console.log(`Client URL: ${env.clientUrl}`);
    console.log('Database: Supabase PostgreSQL (auth_users table)');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${env.port} is already in use. Stop the other process or set PORT in server/.env.\n` +
          `Windows: netstat -ano | findstr :${env.port}  then  taskkill /PID <pid> /F`
      );
      process.exit(1);
    }
    throw err;
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  console.error(
    'Tip: Run database-migrations/create-auth-users-table.sql in Supabase SQL Editor if the table is missing.'
  );
  process.exit(1);
});
