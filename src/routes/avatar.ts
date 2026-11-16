import type { FastifyPluginAsync } from 'fastify';
import { renderAvatarSvg, resolveAvatar } from 'blobbies';
import { config } from '../config.js';
import { avatarQuerySchema, toAvatar, type AvatarQuery } from '../lib/options.js';
import { FORMATS, formatParamSchema, type Format } from '../lib/formats.js';

/**
 * `GET /v1/avatar/:format` — the whole point of the service.
 *
 * The handler is deliberately thin: it turns the query into core options, calls
 * the same `renderAvatarSvg` the library exports, and sets the caching headers.
 * There is no second renderer to keep in sync, so the API cannot drift from the
 * library.
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
      const svg = renderAvatarSvg(name, options);
      const meta = FORMATS[format];

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

      return reply.type(meta.contentType).send(svg);
    },
  );
};
