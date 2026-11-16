import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Set the limit before the app (and its config) is imported, so this file gets
// a low limit without shipping a low default. Vitest isolates each test file.
process.env.RATE_LIMIT_MAX = '2';
process.env.RATE_LIMIT_WINDOW = '1 minute';

const { buildApp } = await import('../src/app.js');

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('rate limiting', () => {
  it('sheds a caller that goes over the limit', async () => {
    const first = await app.inject({ method: 'GET', url: '/health' });
    const second = await app.inject({ method: 'GET', url: '/health' });
    const third = await app.inject({ method: 'GET', url: '/health' });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
    expect(third.json().error).toBe('Too Many Requests');
  });
});
