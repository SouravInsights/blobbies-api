import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('production headers', () => {
  it('lets avatars be embedded from other origins', async () => {
    // The default helmet policy is `same-origin`, which would block every
    // `<img src="https://api…">`. Avatars must be `cross-origin`.
    const response = await app.inject({ method: 'GET', url: '/v1/avatar/svg?name=Ira' });

    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('echoes a request id', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('advertises the rate limit', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.headers['x-ratelimit-limit']).toBe('600');
    expect(response.headers['x-ratelimit-remaining']).toBeTruthy();
  });

  it('names the option when a value is not allowed', async () => {
    const body = (
      await app.inject({ method: 'GET', url: '/v1/avatar/svg?expression=bogus' })
    ).json();

    expect(body.param).toBe('expression');
    expect(body.message).toContain('expression');
  });

  it('names an option it does not know', async () => {
    const body = (
      await app.inject({ method: 'GET', url: '/v1/avatar/svg?name=Ira&colour=red' })
    ).json();

    expect(body.param).toBe('colour');
    expect(body.message).toContain('colour');
  });
});
