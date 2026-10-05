/** refreshIfLoaded: background invalidations must not wake an unopened page. */

import { describe, expect, it, vi } from 'vitest'
import { refreshIfLoaded } from '../src/client/index.ts'

/** A store double with a controllable snapshot and a load spy. */
function controllerOf(status: string): { store: unknown; load: ReturnType<typeof vi.fn>; controller: never } {
  const load = vi.fn()
  const controller = {
    store: { getSnapshot: () => ({ status }) },
    load,
  }
  return { store: controller.store, load, controller: controller as never }
}

describe('refreshIfLoaded', () => {
  it('refetches when the page has already been loaded', () => {
    const { load, controller } = controllerOf('ready')
    refreshIfLoaded(controller)
    expect(load).toHaveBeenCalledOnce()
  })

  it('leaves an unopened page (idle) untouched', () => {
    const { load, controller } = controllerOf('idle')
    refreshIfLoaded(controller)
    expect(load).not.toHaveBeenCalled()
  })
})
