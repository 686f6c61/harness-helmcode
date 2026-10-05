/** Shared provider display order for the composer and command model pickers. */

/**
 * Put the built-in NaN Builders provider first, preserving every other relative order.
 * @param groups - Provider groups in catalog order.
 * @returns a sorted copy; model order within each group is unchanged.
 */
export function orderModelProviders<T extends { readonly id: string }>(groups: readonly T[]): T[] {
  return groups.toSorted((left, right) =>
    (left.id === 'nan-builders' ? 0 : 1) - (right.id === 'nan-builders' ? 0 : 1))
}
