/**
 * The output formats.
 *
 * SVG and JSON need no native dependencies. Raster formats (PNG, JPEG, WebP,
 * AVIF) are added here as they land, so a route only has to look up a format.
 */
export const FORMATS = {
  svg: { contentType: 'image/svg+xml; charset=utf-8', extension: 'svg' },
  json: { contentType: 'application/json; charset=utf-8', extension: 'json' },
} as const;

export type Format = keyof typeof FORMATS;

export const FORMAT_NAMES = Object.keys(FORMATS) as Format[];

export const formatParamSchema = {
  type: 'object',
  required: ['format'],
  properties: {
    format: {
      type: 'string',
      enum: FORMAT_NAMES,
      description: 'The output format.',
    },
  },
} as const;
