import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { renderAvatarSvg } from 'blobbies';
import { buildApp } from '../src/app.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('GET /v1/avatar/svg', () => {
  it('is byte-for-byte the same as the library', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/avatar/svg?name=Ira' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('image/svg+xml');
    expect(response.body).toBe(renderAvatarSvg('Ira'));
  });

  it('applies the options', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/avatar/svg?name=Ira&expression=wink&size=96&blush=false',
    });

    expect(response.body).toBe(
      renderAvatarSvg('Ira', { expression: 'wink', size: 96, blush: false }),
    );
  });

  it('caches forever and carries an ETag', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/avatar/svg?name=Ira' });

    expect(response.headers['cache-control']).toContain('immutable');
    expect(response.headers['etag']).toBeTruthy();
  });

  it('answers 304 when the ETag still matches', async () => {
    const first = await app.inject({ method: 'GET', url: '/v1/avatar/svg?name=Ira' });
    const second = await app.inject({
      method: 'GET',
      url: '/v1/avatar/svg?name=Ira',
      headers: { 'if-none-match': first.headers['etag'] as string },
    });

    expect(second.statusCode).toBe(304);
    expect(second.body).toBe('');
  });

  it('draws the same face for the same name, every time', async () => {
    const a = await app.inject({ method: 'GET', url: '/v1/avatar/svg?name=Deterministic' });
    const b = await app.inject({ method: 'GET', url: '/v1/avatar/svg?name=Deterministic' });

    expect(a.body).toBe(b.body);
  });

  it('rejects a mood it does not know, and says which option', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/avatar/svg?expression=bogus' });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('expression');
  });

  it('rejects a query it does not know', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/avatar/svg?name=Ira&bogus=1' });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a format it does not offer yet', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/avatar/webp?name=Ira' });

    expect(response.statusCode).toBe(400);
  });
});

describe('GET /v1/avatar/json', () => {
  it('returns the SVG and the decisions behind it', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/avatar/json?name=Ira' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.svg).toBe(renderAvatarSvg('Ira'));
    expect(body.letters).toBe('IR');
    expect(body.traits.color).toBeTruthy();
  });
});
