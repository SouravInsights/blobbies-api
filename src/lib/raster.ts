import { Resvg } from '@resvg/resvg-js';

/**
 * Rasterise an SVG to PNG.
 *
 * `resvg` is the SVG renderer; it renders at the requested pixel width rather
 * than scaling a bitmap, so text and strokes stay crisp. The size is clamped
 * before this is called, so a URL cannot ask for a 100000px image.
 */
export function svgToPng(svg: string, size: number): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  });
  return Buffer.from(resvg.render().asPng());
}
