import type { IconProps } from './icons/props.ts'

/**
 * Artboard of {@link BRAND_MARK_PATH}: the official mark artwork spans
 * x 0..115 within a 157-unit square, so consumers render it with
 * `viewBox="-21 0 157 157"` to keep the mark centered.
 */
export const BRAND_MARK_VIEWBOX = { x: -21, y: 0, width: 157, height: 157 }

/**
 * The official NaN mark path data (the Helmcode hexagon cube), exported for
 * consumers that compose their own svg (entrance effects, masks) around the
 * same geometry. A single even-odd filled path: the rounded hexagon outline
 * around the cube faces that meet at the center edge.
 */
export const BRAND_MARK_PATH =
  'M57.5 13C54.9373 13 52.3747 13.6439 50.1323 14.9317L7.20752 39.8829'
  + 'C2.72284 42.4585 0 47.2878 0 52.439V105.561C0 110.712 2.72284 115.541 7.20752 118.117'
  + 'L50.1323 143.068C52.3747 144.356 54.9373 145 57.5 145C60.0627 145 62.6253 144.356 64.8677 143.068'
  + 'L107.792 118.117C112.277 115.541 115 110.712 115 105.561V52.439'
  + 'C115 47.2878 112.277 42.4585 107.792 39.8829L64.8677 14.9317'
  + 'C62.6253 13.6439 60.0627 13 57.5 13ZM57.5 36.8244L20.0055 56.7423L57.4199 77.8294'
  + 'V122.302H57.5L97.6901 99.0459V60.285L57.5 36.8244Z'

/**
 * Render the official NaN mark (the Helmcode hexagon cube).
 * @param props.size - width in px (default 24; the mark artboard is square).
 * @param props.className - extra class for layout placement.
 * @returns the logo svg (aria-hidden; pair with the wordmark for accessibility).
 */
export function BrandMark({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={(size * BRAND_MARK_VIEWBOX.height) / BRAND_MARK_VIEWBOX.width}
      className={className}
      viewBox={`${BRAND_MARK_VIEWBOX.x} ${BRAND_MARK_VIEWBOX.y} ${BRAND_MARK_VIEWBOX.width} ${BRAND_MARK_VIEWBOX.height}`}
      fill="none"
      aria-hidden="true"
    >
      <path d={BRAND_MARK_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}
