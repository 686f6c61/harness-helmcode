/**
 * The common-namespace dictionary pair. es is the source of truth for the
 * key set (Spanish-first product convention); en is checked complete against
 * it — a missing or extra en key is a compile error.
 */
export { es } from './es.ts'
export { en } from './en.ts'
export type { CommonKey } from './es.ts'
