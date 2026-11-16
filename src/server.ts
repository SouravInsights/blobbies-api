import cluster from 'node:cluster';
import { buildApp } from './app.js';
import { config } from './config.js';

/**
 * Start one server (a worker), and shut it down cleanly on a signal so a deploy
 * or a `docker stop` drains in-flight requests instead of cutting them off.
 */
async function start(): Promise<void> {
  const app = await buildApp();

  const close = async (signal: string): Promise<void> => {
    console.info(`${signal} received, shutting down`);
    await app.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void close('SIGINT'));
  process.once('SIGTERM', () => void close('SIGTERM'));

  await app.listen({ port: config.port, host: config.host });
}

// With more than one worker, the primary forks and replaces workers that die.
// With one (the default), it runs the server directly — the simplest case for
// local development and small instances.
if (config.workers > 1 && cluster.isPrimary) {
  console.info(`Starting ${config.workers} workers`);
  for (let i = 0; i < config.workers; i += 1) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.error(`Worker ${worker.process.pid} died (${signal ?? code}), restarting`);
    cluster.fork();
  });
} else {
  await start();
}
