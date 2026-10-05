/** Animated NaN mark mask and static SVG fallback for the running Chat status. */
import css from './ChatView.module.css'

const REST_PATH = 'M1.33 8L4.67 2L11.33 2L14.67 8L11.33 14L4.67 14Z'
  + 'M3.77 8A2.1 2.1 0 1 0 7.97 8A2.1 2.1 0 1 0 3.77 8Z'
  + 'M8.03 8A2.1 2.1 0 1 0 12.23 8A2.1 2.1 0 1 0 8.03 8Z'

/**
 * Render the decorative running icon; the APNG asset owns its animation timing.
 * @returns mask and static SVG selected by browser capabilities and accessibility preferences.
 */
export function RunningWhaleTail() {
  return (
    <span className={css.runningIcon} aria-hidden="true">
      <span className={css.runningWhaleAnimated} />
      <svg className={css.runningWhaleStill} width="100%" height="100%" viewBox="0 0 16 16" fill="none">
        <path d={REST_PATH} stroke="currentColor" strokeWidth={1} />
      </svg>
    </span>
  )
}
