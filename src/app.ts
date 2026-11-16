import fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import etag from '@fastify/etag';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';
import swagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import { config } from './config.js';
import { errorHandler } from './lib/errors.js';
import { avatarRoutes } from './routes/avatar.js';
import { metaRoutes } from './routes/meta.js';

/**
 * Build the Fastify instance.
 *
 * Kept separate from `server.ts` so tests can build an app and use `inject`
 * without opening a port. `buildApp` is the seam that makes the whole service
 * testable.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: config.logger ? { level: 'info' } : false,
    // Lightsail sits behind a proxy; without this the rate limiter sees the
    // proxy's IP and every client shares one bucket.
    trustProxy: true,
    // Accept a caller's request id so one request can be traced end to end.
    requestIdHeader: 'x-request-id',
    ajv: {
      customOptions: {
        // Fastify strips unknown query params by default. Typing a param name
        // wrong should tell you, not silently do nothing, so we reject them.
        removeAdditional: false,
      },
    },
  });

  app.setErrorHandler(errorHandler);

  await app.register(cors, { origin: config.cors.origin });
  await app.register(helmet, {
    // The docs page loads Scalar from a CDN with inline scripts; a strict CSP
    // would break it. The API itself serves no HTML worth locking down.
    contentSecurityPolicy: false,
    // Avatars are embedded cross-origin (`<img src="https://api…">`), so the
    // default `same-origin` policy would block them. This must be `cross-origin`.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  });

  // Output is deterministic, so an ETag is free and turns repeat requests into
  // 304s before the body is ever sent.
  await app.register(etag);

  if (config.rateLimit.max > 0) {
    await app.register(rateLimit, {
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.window,
    });
  }

  // Shed load instead of collapsing when the event loop backs up.
  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxEventLoopUtilization: 0.98,
    exposeStatusRoute: false,
    pressureHandler: (_request, reply) => {
      reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'The service is under heavy load. Please retry shortly.',
      });
    },
  });

  // The OpenAPI spec is generated from the routes' own JSON Schemas — there is
  // no hand-written spec to fall out of date.
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Blobbies API',
        description:
          'Avatars from a URL. Deterministic — the same URL always returns the same image.',
        version: '0.1.0',
        license: { name: 'MIT', url: 'https://github.com/SouravInsights/blobbies/blob/main/LICENSE' },
      },
      tags: [
        { name: 'Avatar', description: 'Draw an avatar from a name.' },
        { name: 'Service', description: 'Health, capability manifest and machine-readable indexes.' },
      ],
    },
  });

  await app.register(metaRoutes);
  await app.register(avatarRoutes);

  // The spec, for anyone who wants it without reading the docs UI.
  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger());

  // The interactive reference, at /docs.
  await app.register(scalar, { routePrefix: '/docs' });

  // Echo the request id so a client can quote it in a bug report.
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  return app;
}
