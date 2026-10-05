// @vitest-environment jsdom

/** OnboardingModal chrome: root inerting, title focus, and non-modal variants. */

import { render, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { OnboardingModal } from '../src/client/OnboardingModal.tsx'

afterEach(cleanup)

describe('OnboardingModal', () => {
  it('inerts the app root while open and restores it on unmount', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.append(root)
    try {
      const view = render(createElement('div', null, OnboardingModal({
        title: 'Set up models',
        children: createElement('p', null, 'body text'),
      })))
      await waitFor(() => expect(root.inert).toBe(true))
      view.unmount()
      expect(root.inert ?? false).toBe(false)
    } finally {
      root.remove()
    }
  })

  it('tolerates a missing app root without crashing', () => {
    document.getElementById('root')?.remove()
    const view = render(createElement('div', null, OnboardingModal({ title: 'No root', children: createElement('p', null, 'x') })))
    expect(view.getByText('x')).toBeDefined()
    view.unmount()
  })

  it('focuses the title when asked and leaves it unfocused otherwise', async () => {
    const focusView = render(createElement('div', null, OnboardingModal({
      title: 'Focused', focusTitle: true, children: createElement('p', null, 'x'),
    })))
    await waitFor(() => expect(document.activeElement?.tagName).toBe('H2'))
    focusView.unmount()

    const plain = render(createElement('div', null, OnboardingModal({ title: 'Plain', children: createElement('p', null, 'x') })))
    expect(document.activeElement?.tagName).not.toBe('H2')
    plain.unmount()
  })
})
