/**
 * The avatar query surface.
 *
 * One schema, used twice: Fastify validates and coerces the query string with
 * it, and `@fastify/swagger` publishes it as the OpenAPI parameter list. Adding
 * an option is a one-line change here — there is no second place to update.
 */
import { EXPRESSIONS, SHAPES } from 'blobbies';
import type { AvatarAnimate, AvatarExpression, AvatarOptions, AvatarShape } from 'blobbies';

export interface AvatarQuery {
  /** The seed. The same name always draws the same face. */
  name?: string;
  expression?: AvatarExpression;
  shape?: AvatarShape;
  color?: string;
  /** Comma-separated colours, e.g. `#f00,#0f0`. */
  palette?: string;
  blush?: boolean;
  tilt?: number;
  variant?: number;
  size?: number;
  rounded?: boolean;
  animate?: 'false' | 'blink';
}

export const avatarQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      maxLength: 128,
      description: 'The seed. The same name always draws the same face.',
      examples: ['Ira', 'Sourav Nanda'],
    },
    expression: {
      type: 'string',
      enum: [...EXPRESSIONS],
      description: 'The mood. Defaults to one seeded from the name.',
      examples: ['smirk', 'wink'],
    },
    shape: {
      type: 'string',
      enum: [...SHAPES],
      description: 'The egg shape. Defaults to one seeded from the name.',
    },
    color: {
      type: 'string',
      maxLength: 64,
      description: 'Any CSS colour. Defaults to one seeded from the name.',
      examples: ['#6CC8FF'],
    },
    palette: {
      type: 'string',
      maxLength: 1024,
      description: 'Comma-separated colours to draw the seeded colour from.',
    },
    blush: { type: 'boolean', description: 'Show the blush. Defaults to a seeded coin flip.' },
    tilt: { type: 'number', minimum: -8, maximum: 8, description: 'Tilt in degrees.' },
    variant: {
      type: 'integer',
      minimum: 0,
      maximum: 1_000_000,
      description: 'A different body for the same name. `0` is the original look.',
    },
    size: {
      type: 'integer',
      minimum: 1,
      maximum: 4096,
      description: 'Rendered size in pixels (SVG only). Default 48.',
    },
    rounded: { type: 'boolean', description: 'Round the corners.' },
    animate: {
      type: 'string',
      enum: ['false', 'blink'],
      description:
        '`blink` embeds the blink animation (works in an `<img>`). Defaults to a still avatar.',
    },
  },
} as const;

/**
 * Turn a validated query into the core's options. Kept separate from the route
 * so it can be read, and tested, on its own.
 */
export function toAvatar(query: AvatarQuery): { name: string; options: AvatarOptions } {
  const { name = '', ...rest } = query;
  const options: AvatarOptions = {};

  if (rest.expression) options.expression = rest.expression;
  if (rest.shape) options.shape = rest.shape;
  if (rest.color) options.color = rest.color;
  if (rest.palette) {
    const palette = rest.palette
      .split(',')
      .map((colour) => colour.trim())
      .filter(Boolean);
    if (palette.length > 0) options.palette = palette;
  }
  if (rest.blush !== undefined) options.blush = rest.blush;
  if (rest.tilt !== undefined) options.tilt = rest.tilt;
  if (rest.variant !== undefined) options.variant = rest.variant;
  if (rest.size !== undefined) options.size = rest.size;
  if (rest.rounded) options.rounded = true;
  if (rest.animate) options.animate = (rest.animate === 'false' ? false : rest.animate) as AvatarAnimate;

  return { name, options };
}
