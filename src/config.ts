/**
 * Configuration.
 *
 * Everything comes from the environment and everything has a working default,
 * so an empty `.env` is a valid setup. See `.env.example` for the full list.
 */

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

/**
 * `*` allows any origin (the API is read-only and public). Anything else is a
 * comma-separated allow-list, e.g. `https://app.example.com,https://example.com`.
 */
function readOrigins(value: string | undefined): true | string[] {
  if (value === undefined || value.trim() === '' || value.trim() === '*') return true;
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const config = {
  port: readNumber(process.env.PORT, 3000),
  host: process.env.HOST ?? '0.0.0.0',
  /** Fastify's request log. On for a deployed instance, off for a quiet local run. */
  logger: readBoolean(process.env.LOGGER, false),
  /** Node cluster workers. More than one is right on a multi-core box. */
  workers: Math.max(1, readNumber(process.env.WORKERS, 1)),
  cors: { origin: readOrigins(process.env.CORS_ORIGIN) },
  rateLimit: {
    /** Requests per window per IP. `0` disables the limiter. */
    max: readNumber(process.env.RATE_LIMIT_MAX, 600),
    window: process.env.RATE_LIMIT_WINDOW ?? '1 minute',
  },
  /**
   * Same URL → same bytes, forever, so this can be very long. `immutable` tells
   * the browser not to revalidate at all within the window; an ETag covers the
   * rest.
   */
  cacheMaxAge: readNumber(process.env.CACHE_CONTROL_MAX_AGE, 60 * 60 * 24 * 365),
} as const;

export type Config = typeof config;
