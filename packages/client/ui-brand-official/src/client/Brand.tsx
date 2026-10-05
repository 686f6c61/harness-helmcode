import { BrandMark, BrandWordmark } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/** Official brand ink (Helmcode blue) for the expanded logo row. */
const OFFICIAL_BRAND_COLOR = '#4934E1'

/**
 * Render the official mark with the presentation requested by its host surface:
 * the full blue Helmcode lockup in the expanded logo row, the plain mark in the
 * collapsed rail where only a square glyph fits.
 * @param props - Host-supplied mark presentation.
 * @returns the official NaN mark.
 */
export function OfficialBrandMark({ size, placement }: SidebarBrandMarkOwnerProps) {
  if (placement === 'rail') return <BrandMark size={size} />
  return (
    <span style={{ color: OFFICIAL_BRAND_COLOR, display: 'inline-flex' }}>
      <BrandWordmark size={size} />
    </span>
  )
}

/**
 * Render the official name artwork without its independently slotted mark.
 * @returns the official name wordmark.
 */
export function OfficialBrandName() {
  return <BrandWordmark includeMark={false} />
}
