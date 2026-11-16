import { createRequire } from 'node:module';
import type { FastifyPluginAsync } from 'fastify';
import { CONTRACT_VERSION } from 'blobbies';

const require = createRequire(import.meta.url);

/**
 * The engine's own capability manifest — every shape, mood, colour and layout
 * value — served straight from the installed `blobbies` package, so it can never
 * describe a different version than the one drawing the avatars.
 */
const manifest = require('blobbies/manifest.json') as unknown;
const engineVersion = (require('blobbies/package.json') as { version: string }).version;

const SERVICE = {
  name: 'blobbies-api',
  engine: { name: 'blobbies', version: engineVersion, contract: CONTRACT_VERSION },
  endpoints: {
    avatar: '/v1/avatar/{format}?name=Ira',
    manifest: '/v1/manifest.json',
    openapi: '/openapi.json',
    docs: '/docs',
    llms: '/llms.txt',
  },
} as const;

const LLMS_TXT = `# Blobbies API

> Avatars from a URL. Deterministic: the same URL always returns the same image.

## Endpoints

- \`GET /v1/avatar/svg?name=Ira\` — an SVG avatar. Also \`json\`.
- \`GET /v1/manifest.json\` — every shape, mood and colour, as data.
- \`GET /openapi.json\` — the OpenAPI specification.
- \`GET /docs\` — interactive reference.

## Options

\`name\` (the seed), \`expression\`, \`shape\`, \`color\`, \`palette\`, \`blush\`,
\`tilt\`, \`variant\`, \`size\`, \`rounded\`, \`animate\`.

## Caching

Responses are \`immutable\` and carry an \`ETag\`. Cache them forever.
`;

export const metaRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['Service'],
        summary: 'Liveness probe',
      },
    },
    async () => ({ status: 'ok' }),
  );

  app.get(
    '/',
    {
      schema: {
        tags: ['Service'],
        summary: 'Service info',
        description: 'What this is, which engine version it runs, and where the docs are.',
      },
    },
    async () => SERVICE,
  );

  app.get(
    '/v1/manifest.json',
    {
      schema: {
        tags: ['Service'],
        summary: 'Capability manifest',
        description:
          'Every shape, mood, colour and layout value the engine knows, as data. ' +
          'Useful for building clients and for AI agents.',
      },
    },
    async (_request, reply) =>
      reply
        .header('Cache-Control', 'public, max-age=3600')
        .type('application/json; charset=utf-8')
        .send(manifest),
  );

  app.get(
    '/llms.txt',
    {
      schema: {
        tags: ['Service'],
        summary: 'A short index for AI agents',
      },
    },
    async (_request, reply) =>
      reply.header('Cache-Control', 'public, max-age=3600').type('text/plain; charset=utf-8').send(LLMS_TXT),
  );
};
