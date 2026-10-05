/** Desktop welcome presentation; the credential write stays in the preload. */
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { WelcomeApi } from '../welcome-api.ts'

/**
 * Render the standalone welcome flow using shell-owned operations and localized copy.
 * @param props.api - isolated preload API; no credentials reach the renderer.
 * @returns the key page with fixed bottom actions.
 */
export function Welcome({ api }: { api: WelcomeApi }) {
  const { messages: m } = api
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const mounted = useRef(true)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    mounted.current = true
    document.documentElement.lang = api.id
    document.title = m.welcomeTitle
    input.current?.focus()
    return () => { mounted.current = false }
  }, [api, m.welcomeTitle])

  async function saveKey(event: FormEvent) {
    event.preventDefault()
    if (busyRef.current) return
    const value = draft.trim()
    if (!/^[\x21-\x7e]+$/.test(value) || /^[A-Z][A-Z0-9_]*=[^=]/.test(value)
      || ((value.startsWith('"') || value.startsWith("'") || value.charCodeAt(0) === 96) && value.at(-1) === value[0])) {
      setError(value === '' ? m.welcomeKeyBlank : m.welcomeKeyInvalid)
      input.current?.focus()
      return
    }
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const result = await api.saveApiKey(value)
      if (!mounted.current) return
      if (result.ok) setDraft('')
      else setError(m.welcomeKeyFailed)
    } catch {
      if (mounted.current) setError(m.welcomeKeyFailed)
    } finally {
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }
  async function skip() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await api.skip()
      if (mounted.current) setDraft('')
    } catch {
      if (mounted.current) setError(m.welcomeContinueFailed)
    } finally {
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return <>
    <div className="titlebar" aria-hidden="true" />
    <main className="welcome" aria-labelledby="key-title">
      <img className="brand" src="assets/welcome-brand.svg" alt="" width="297" height="56" />
      <form id="key-form" className="key-form" noValidate onSubmit={(event) => { void saveKey(event) }} aria-busy={busy}>
        <header className="key-heading"><h1 id="key-title">{m.welcomeKeyTitle}</h1><p id="key-description">{m.welcomeKeyDescription}</p></header>
        <div className="key-field">
          <label className="visually-hidden" htmlFor="key-input">{m.welcomeKeyPlaceholder}</label>
          <input ref={input} id="key-input" type="password" autoComplete="new-password" autoCapitalize="off" spellCheck={false} required
            aria-describedby="key-description key-error" aria-invalid={error !== ''} placeholder={m.welcomeKeyPlaceholder}
            value={draft} disabled={busy} onChange={(event) => { setDraft(event.target.value); setError('') }} />
          <p id="key-error" className="key-error" role="alert" hidden={error === ''}>{error}</p>
        </div>
      </form>
      <div id="key-actions" className="actions">
        <button id="save-key" className="primary" type="submit" form="key-form" disabled={busy || draft.trim() === ''}>{m.welcomeKeySave}</button>
        <button id="skip-key" className="secondary" type="button" disabled={busy} onClick={() => { void skip() }}>{m.welcomeKeyLater}</button>
      </div>
    </main>
  </>
}
