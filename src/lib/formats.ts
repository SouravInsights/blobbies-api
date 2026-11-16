/**
 * The output formats.
 *
 * SVG and JSON need no native dependencies; PNG is rasterised with `resvg`.
 * JPEG, WebP and AVIF are a thin step on top (rasterise to PNG, then convert),
 * so they slot in here without touching the route.
 */
export const FORMATS = {
  svg: { contentType: 'image/svg+xml; charset=utf-8', extension: 'svg', raster: false },
  png: { contentType: 'image/png', extension: 'png', raster: true },
  json: { contentType: 'application/json; charset=utf-8', extension: 'json', raster: false },
} as const;

export type Format = keyof typeof FORMATS;

export const FORMAT_NAMES = Object.keys(FORMATS) as Format[];

/** Raster responses get a larger default and a hard ceiling. */
export const RASTER = { defaultSize: 128, minSize: 16, maxSize: 1024 } as const;

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
