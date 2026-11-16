import type { FastifyPluginAsync } from 'fastify';
import { renderAvatarSvg, resolveAvatar } from 'blobbies';
import { config } from '../config.js';
import { avatarQuerySchema, toAvatar, type AvatarQuery } from '../lib/options.js';
import { FORMATS, RASTER, formatParamSchema, type Format } from '../lib/formats.js';
import { svgToPng } from '../lib/raster.js';

/**
 * `GET /v1/avatar/:format` — the whole point of the service.
 *
 * The handler is deliberately thin: it turns the query into core options, calls
 * the same `renderAvatarSvg` the library exports, and sets the caching headers.
 * There is no second renderer to keep in sync, so the API cannot drift from the
 * library. Raster formats are that same SVG, rasterised.
 */
export const avatarRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { format: Format }; Querystring: AvatarQuery }>(
    '/v1/avatar/:format',
    {
      schema: {
        tags: ['Avatar'],
        summary: 'Draw an avatar',
        description:
          'Returns an avatar for a name. The output is byte-for-byte the same as the ' +
          'library renders, so the same URL always returns the same image.',
        params: formatParamSchema,
        querystring: avatarQuerySchema,
      },
    },
    async (request, reply) => {
      const { format } = request.params;
      const { name, options } = toAvatar(request.query);
      const meta = FORMATS[format];

      // Raster formats get a bigger default and a ceiling; the SVG is drawn at
      // the final pixel size so it is rendered, not upscaled.
      if (meta.raster) {
        const requested = typeof options.size === 'number' ? options.size : RASTER.defaultSize;
        options.size = Math.min(RASTER.maxSize, Math.max(RASTER.minSize, requested));
      }

      const svg = renderAvatarSvg(name, options);

      reply.header('Cache-Control', `public, max-age=${config.cacheMaxAge}, immutable`);
      reply.header('Content-Disposition', `inline; filename="avatar.${meta.extension}"`);

      if (format === 'json') {
        const resolved = resolveAvatar(name, options);
        return reply.type(meta.contentType).send({
          name: resolved.name,
          letters: resolved.letters,
          svg,
          options,
          traits: resolved.traits,
          blink: resolved.blink,
        });
      }

      if (meta.raster) {
        return reply.type(meta.contentType).send(svgToPng(svg, options.size as number));
      }

      return reply.type(meta.contentType).send(svg);
    },
  );
};
