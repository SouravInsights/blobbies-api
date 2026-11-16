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

describe('service endpoints', () => {
  it('answers a liveness probe', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('describes itself at the root', async () => {
    const body = (await app.inject({ method: 'GET', url: '/' })).json();
    expect(body.name).toBe('blobbies-api');
    expect(body.engine.contract).toBe(1);
    expect(body.endpoints.docs).toBe('/docs');
  });

  it('serves the engine manifest', async () => {
    const body = (await app.inject({ method: 'GET', url: '/v1/manifest.json' })).json();
    expect(body.engine).toBe('blobbies');
    expect(body.expressions).toHaveLength(22);
    expect(body.shapes).toHaveLength(5);
    expect(body.palette).toHaveLength(9);
  });

  it('serves a short index for agents', async () => {
    const response = await app.inject({ method: 'GET', url: '/llms.txt' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('/v1/avatar.svg');
  });
});
