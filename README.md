# Blobbies API

Avatars from a URL. Give it a name and it returns the same blobby avatar the
[`blobbies`](https://www.npmjs.com/package/blobbies) library draws — **the same
bytes**, so the same URL always returns the same image, forever.

```sh
curl 'http://localhost:3000/v1/avatar/svg?name=Ira' > ira.svg
```

No database, no external services, no randomness. One deterministic function
behind a thin HTTP edge.

---

## Quick start

```sh
npm install
npm run dev            # http://localhost:3000
```

```sh
npm run build          # compile to dist/
npm start              # run the compiled server
npm test               # vitest, via Fastify inject — no port needed
npm run typecheck
```

Every setting is an environment variable with a working default, so an empty
`.env` is a valid setup. See [`.env.example`](.env.example).

---

## Endpoints

| Endpoint | What it returns |
| --- | --- |
| `GET /v1/avatar/svg` | An SVG avatar |
| `GET /v1/avatar/png` | A PNG, rasterised at `size` |
| `GET /v1/avatar/json` | `{ svg, name, letters, options, traits, blink }` |
| `GET /v1/manifest.json` | Every shape, mood, colour and layout value, as data |
| `GET /health` | `{ "status": "ok" }` |
| `GET /` | Service info and links |
| `GET /openapi.json` | The OpenAPI 3.1 spec |
| `GET /docs` | Interactive reference (Scalar) |
| `GET /llms.txt` | A short index for AI agents |

The spec is generated from the routes' own JSON Schemas, so it cannot drift
from the implementation.

---

## Options

Every option is a query parameter. All are optional — sensible values are
seeded from the name.

| Parameter | Values | Notes |
| --- | --- | --- |
| `name` | any string | The seed. Same name → same face. |
| `expression` | 22 moods (`smirk`, `wink`, `angry`, …) | Default: seeded |
| `shape` | `tall` `wide` `squat` `round` `mid` | Default: seeded |
| `color` | any CSS colour | Default: seeded |
| `palette` | comma-separated colours | Draw the seeded colour from these instead |
| `blush` | `true` `false` | Default: seeded |
| `tilt` | `-8`…`8` | Degrees |
| `variant` | integer | A different body for the same name; `0` is the original |
| `size` | integer | SVG width, or PNG pixel width (default 128, max 1024) |
| `rounded` | `true` `false` | Round the corners |
| `animate` | `false` `blink` | `blink` embeds the blink animation |

```sh
curl 'http://localhost:3000/v1/avatar/svg?name=Ira&expression=wink&color=%236CC8FF'
```

The same avatar as a 256px PNG:

```sh
curl 'http://localhost:3000/v1/avatar/png?name=Ira&size=256' > ira.png
```

Unknown parameters and unknown values are rejected with `400` and a message
naming the option — a typo tells you, rather than silently doing nothing.

---

## Caching

Output is deterministic, so responses are safe to cache forever:

```
Cache-Control: public, max-age=31536000, immutable
ETag: "…"
```

Put a CDN (or a Lightsail distribution) in front and most requests never reach
the container. The `ETag` turns a revalidated request into a `304` before the
body is sent.

---

## Self-hosting

One stateless container. No database, no calls to anyone else's servers.

### Docker

```sh
docker build -t blobbies-api .
docker run --rm -p 3000:3000 blobbies-api
```

### Docker Compose

```sh
docker compose up --build
```

The compose file runs the container read-only, with `no-new-privileges`, a
health check, and tmpfs for `/tmp`.

### Configuration

Every setting is an environment variable with a working default.

| Variable | Default | Why |
| --- | --- | --- |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Where it listens |
| `WORKERS` | `1` | Node cluster workers. Set to the vCPU count. |
| `LOGGER` | `0` | `1` for structured request logs |
| `CORS_ORIGIN` | `*` | Allow-list, or `*` for any |
| `RATE_LIMIT_MAX` | `600` | Requests per IP per window. `0` disables. |
| `RATE_LIMIT_WINDOW` | `1 minute` | Rate-limit window |
| `CACHE_CONTROL_MAX_AGE` | `31536000` | Cache duration, in seconds |

See [`.env.example`](.env.example) for the same list with comments.

### Put a CDN in front

Output is deterministic and cached forever, so a CDN turns almost every
request into a cache hit and the container only ever sees a miss. The `ETag`
handles revalidation, so `304`s never reach Node either.

### AWS Lightsail

A Lightsail Container Service takes this image directly:

1. Push the image:
   `aws lightsail push-container-image --service-name <service> --label blobbies-api --image blobbies-api`
2. Point a deployment at the pushed image, with a port `3000` open to the
   internet and the environment variables above set.
3. Attach a Lightsail distribution (CDN) in front of the public endpoint.

`trustProxy` is already on, so the rate limiter sees the real client IP rather
than the load balancer's, and set `WORKERS` to the container's vCPU count.

---

## Architecture

```
src/
  app.ts          the Fastify instance — plugins, docs, routes (the test seam)
  server.ts       listen, cluster, graceful shutdown
  config.ts       env vars, each with a default
  routes/
    avatar.ts     GET /v1/avatar/:format
    meta.ts       health, service info, manifest, llms.txt
  lib/
    options.ts    the query schema (validation + OpenAPI, one source)
    formats.ts    the format registry
test/             Fastify inject tests, including byte-parity with the library
```

The routes hold no rendering logic. `avatar.ts` turns the query into core
options and calls the library's `renderAvatarSvg`; a test asserts the HTTP body
is byte-for-byte identical to that call, so the API cannot drift from the
library.

---

## License

MIT. Self-host it, ship it, sell it.
