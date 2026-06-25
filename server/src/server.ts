import app from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { startReminderWorker } from './modules/reminders';

async function main() {
  // Verify database connection before accepting traffic
  await prisma.$connect();
  console.log('✅  Database connected');

  startReminderWorker();
  app.listen(env.PORT, () => {
    console.log(`🚀  Server running on http://localhost:${env.PORT}`);
    console.log(`    Environment : ${env.NODE_ENV}`);
    console.log(`    Client origin: ${env.CLIENT_ORIGIN}`);
  });
}

main().catch((err) => {
  console.error('❌  Failed to start server:', err);
  process.exit(1);
});
