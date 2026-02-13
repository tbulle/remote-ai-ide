import { buildApp } from './app.js';
import { appConfig } from './config/index.js';
import { sessionManager } from './services/session-manager.js';

async function main() {
  const app = await buildApp();

  // Clean up stale sessions every 5 minutes
  sessionManager.startCleanup(5 * 60 * 1000, appConfig.sessionTimeoutMs);

  try {
    await app.listen({ port: appConfig.port, host: appConfig.host });
    console.log(`Server listening on ${appConfig.host}:${appConfig.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async () => {
    sessionManager.stopCleanup();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
