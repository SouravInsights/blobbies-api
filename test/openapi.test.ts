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

describe('the documentation', () => {
  it('publishes an OpenAPI 3.1 spec built from the routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/openapi.json' });

    expect(response.statusCode).toBe(200);
    const spec = response.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.paths['/v1/avatar/{format}']).toBeTruthy();
    expect(spec.paths['/v1/avatar/{format}'].get.parameters.length).toBeGreaterThan(5);
  });

  it('serves the Scalar reference under /docs', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs/' });

    expect(response.statusCode).toBe(200);
    expect(response.body.toLowerCase()).toContain('scalar');
  });
});
