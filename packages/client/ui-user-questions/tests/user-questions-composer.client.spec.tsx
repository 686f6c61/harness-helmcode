// @vitest-environment jsdom
import type { GlobalStandardProps } from '@deepseek-ai/dsh-client-ui-slots'
import { useSyncExternalStore } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { AskUserQuestionAnswerItem } from '@deepseek-ai/dsh-user-questions/types'
import { createWaterfallRequest, PendingQuestion, type QuestionCardSnapshot, type QuestionComposerProps } from '../src/client/contract/slots.ts'
import { createQuestionDraftStore } from '../src/client/draft-store.ts'
import { QuestionComposer as Composer, parseRecommendedLabel } from '../src/client/QuestionComposer.tsx'
import { en, es } from '../src/client/locales.ts'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/en.ts'
import { es as commonEs } from '@deepseek-ai/dsh-client-locale/src/locales/es.ts'

// Every session-scope fixture carries the resource hook the resources plugin merges into GlobalStandardProps.
const useResource = (() => ({ status: 'none' as const, value: undefined, failure: undefined, reload: () => {} })) as GlobalStandardProps['useResource']
const usePanelInfo: GlobalStandardProps['usePanelInfo'] = selector => selector({ activePanelId: null })

afterEach(cleanup)


const SID = 's1' as SessionId

const seatOver = (dict: Record<string, string>, common: Record<string, string>): QuestionComposerProps['t'] =>
  (key => dict[key] ?? common[key] ?? key)

type SessionState = Parameters<Parameters<QuestionComposerProps['useSession']>[0]>[0]
type ConversationState = Parameters<Parameters<QuestionComposerProps['useConversation']>[0]>[0]
type ChatState = Parameters<Parameters<QuestionComposerProps['useChat']>[0]>[0]
type TrajectoryState = Parameters<Parameters<QuestionComposerProps['useTrajectory']>[0]>[0]
type InputState = Parameters<Parameters<QuestionComposerProps['useInput']>[0]>[0]
type AttentionState = Parameters<Parameters<QuestionComposerProps['useSessionStatus']>[0]>[0]

const sessionState: SessionState = {
  sessionId: SID,
  pendingSubmissions: [],
  running: false,
  subagent: null,
  removed: false,
  openState: 'open',
  openError: null,
  hasMore: false,
  loadingOlder: false,
  promptError: null,
  blank: false,
  lastAgentError: null,
  promptAttempted: false,
  awaitingFirstTurn: false,
}
const sessionList = {
  ids: [SID],
  byId: { [SID]: { id: SID, displayTitle: 'Session', running: false, retainedBy: {}, blank: false, updatedAt: 0 } },
  phase: 'ready' as const,
  projectionsBySession: {},
}
const attentionState: AttentionState = new Map()
const workspaceState = {
  items: [],
  archivedSessionIds: [],
  pinnedSessionIds: [],
  state: 'idle' as const,
  phase: 'ready' as const,
  error: null,
}
const conversationState: ConversationState = {
  views: { get: () => undefined, grouped: () => undefined },
  activeTargets: new Set(),
}
const emptyKeys: readonly string[] = []
const emptyNodeSource = { getSnapshot: () => undefined, subscribe: () => () => {} }
const chatState: ChatState = {
  order: emptyKeys,
  nodes: {
    get: () => undefined,
    source: () => emptyNodeSource,
    turnDataSource: () => { throw new Error('unused') },
    processSource: () => emptyNodeSource,
    values: () => [],
  },
  locations: { getTurn: () => emptyKeys, getStep: () => emptyKeys },
  navigation: { items: () => [] },
  timeline: { turnOrder: [], turns: new Map() },
  legacy: {
    nodes: [],
    turnTimings: new Map(),
    turnEnds: new Map(),
    partial: null,
    runningCalls: [],
  },
}
const trajectoryState: TrajectoryState = {
  eventNodes: [],
  eventLocations: new Map(),
  requests: [],
  callSchemas: new Map(),
  partial: null,
  runningCalls: [],
}
const inputState: InputState = {
  draft: '',
  attachmentIds: [],
  draftRev: 0,
  phase: 'plain',
  occurrences: [],
  queue: [],
}

/** Framework standard-kit stubs: the composer consumes the locale and draft-store seats;
 *  the composed props type mandates delivery of the rest (framework hooks are
 *  plain stubs per the client testing discipline). */
const kitBase: Omit<QuestionComposerProps, 'matched' | 'useStore' | 'useQuestionCard' | 'actions'> = {
  renderSlot: () => null,
  SessionProvider: ({ children }) => children,
  session: undefined,
  sessionId: SID,
  pendingInteraction: undefined,
  useSession: selector => selector(sessionState),
  useSessions: selector => selector(sessionList),
  usePanelInfo, useResource,
  useSessionStatus: selector => selector(attentionState),
  useSessionRetainInfo: () => undefined,
  useWorkspaces: selector => selector(workspaceState),
  useConversation: selector => selector(conversationState),
  useChat: selector => selector(chatState),
  useTrajectory: selector => selector(trajectoryState),
  useProjection: (() => undefined),
  useInput: selector => selector(inputState),
  inputActions: {
    captureInsertion: () => ({ start: 0, end: 0, draftRev: 0 }),
    insertText: () => false,
    setDraft: () => { throw new Error('unused') },
    addAttachments: () => { throw new Error('unused') },
    removeAttachment: () => { throw new Error('unused') },
    pruneAttachments: () => { throw new Error('unused') },
    submit: () => { throw new Error('unused') },
  },
  // The seat's key domain is question ∪ common.
  t: seatOver(es, commonEs),
}

let kit: Omit<QuestionComposerProps, 'matched' | 'useQuestionCard'>
let draftInstance: ReturnType<ReturnType<typeof createQuestionDraftStore>['create']>

function QuestionComposer(props: Omit<QuestionComposerProps, 'useQuestionCard'>) {
  const source = props.matched
  const useQuestionCard = ((_key: string, selector?: (value: QuestionCardSnapshot | undefined) => unknown) => {
    const value = useSyncExternalStore(source.subscribe, source.getSnapshot)
    return selector === undefined ? value : selector(value)
  }) as QuestionComposerProps['useQuestionCard']
  return <Composer {...props} useQuestionCard={useQuestionCard} />
}

beforeEach(() => {
  localStorage.clear()
  const instance = createQuestionDraftStore().create(SID)
  draftInstance = instance
  const useStore: QuestionComposerProps['useStore'] = selector => useSyncExternalStore(
    listener => instance.subscribe(listener),
    () => selector(instance.getSnapshot()),
    () => selector(instance.getSnapshot()),
  )
  kit = { ...kitBase, useStore, actions: instance.actions }
})

const QUESTIONS: PendingQuestion['questions'] = [
  {
    id: 'profile', header: 'Preferencias', question: 'Elegir el tipo de candidato',
    detail: 'Elegir según la prioridad de las vacantes actuales.',
    options: [
      { label: 'Perfil de ejecución (Recommended)', description: 'Prioriza la entrega de ingeniería.' },
      { label: 'Perfil de investigación', description: 'Prioriza la capacidad de investigación.' },
    ],
  },
  {
    id: 'detail', question: 'Añadir sus requisitos',
  },
  {
    id: 'signals', question: 'Elegir señales importantes (multiselección)', multiSelect: true,
    options: [{ label: 'Diseño de sistemas' }, { label: 'Calidad del código' }, { label: 'Criterio de producto' }],
  },
]

/** Pending waterfall fixture with observable Client response methods. */
function wait(questions: PendingQuestion['questions'] = QUESTIONS, deadline?: number) {
  const carrier = new PendingQuestion(SID, questions)
  const request = createWaterfallRequest(deadline, undefined, (channel) => { carrier.detachWaterfall(channel) })
  carrier.attachWaterfall(request.channel)
  const answer = vi.spyOn(carrier, 'answer')
  const dismiss = vi.spyOn(carrier, 'dismiss')
  void request.result.catch(() => {})
  return { carrier, answer, dismiss }
}

const answerBatch = (answers: object[]) => ({ answers })

describe('QuestionComposer', () => {
  it('a blocking request shows no wait status before or after the first edit, exactly as before timed questions', () => {
    // The blocking card never carried a countdown, so there is nothing for a
    // held or frozen label to describe; the header keeps only the question and its two controls.
    const { carrier } = wait()
    const view = render(<QuestionComposer matched={carrier} {...kit} />)
    const status = () => view.container.querySelector('[class*="waitStatus"]')

    expect(status()).toBeNull()
    expect(screen.queryByText('Esperando hasta que responda')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: /Perfil de ejecución/ }))
    expect(carrier.snapshot()).toMatchObject({ waitState: 'editing', countdown: undefined })
    expect(status()).toBeNull()
    expect(screen.queryByText('Esperando hasta que responda')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tómese su tiempo' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Descartar todas las preguntas' })).toBeTruthy()
  })

  it('keeps a recommended default selected without pausing a timed wait', () => {
    const { carrier } = wait(QUESTIONS, Date.now() + 30_000)
    try {
      const view = render(<QuestionComposer matched={carrier} {...kit} />)
      expect(screen.getByRole('radio', { name: /Perfil de ejecución/ }).getAttribute('aria-checked')).toBe('true')
      expect(carrier.snapshot().countdown?.running).toBe(true)

      fireEvent.click(screen.getByLabelText('Pregunta siguiente'))
      view.unmount()
      render(<QuestionComposer matched={carrier} {...kit} />)
      expect(carrier.snapshot().countdown?.running).toBe(true)
      expect(screen.getByText('2 / 3')).toBeTruthy()
    } finally {
      carrier.timeout()
    }
  })

  it('treats Enter on an unselected option as submit, without selecting it', () => {
    const { carrier, answer } = wait([{
      id: 'mode', question: 'Which mode?', options: [{ label: 'Alpha' }, { label: 'Beta' }],
    }])
    render(<QuestionComposer matched={carrier} {...kit} />)
    const option = screen.getByRole('radio', { name: 'Alpha' })
    expect(fireEvent.keyDown(option, { key: 'Enter' })).toBe(false)
    expect(option.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('status').textContent).toBe('Complete esta pregunta primero.')
    expect(answer).not.toHaveBeenCalled()
  })

  it('collects single, custom, and multi-select answers before one batch submit', () => {
    const { carrier, answer } = wait()
    render(<QuestionComposer matched={carrier} {...kit} />)

    expect(screen.getByText('Preferencias')).toBeTruthy()
    expect(screen.getByText('1 / 3')).toBeTruthy()
    expect(screen.getByText('Recomendado')).toBeTruthy()
    expect(screen.getByText('Perfil de ejecución')).toBeTruthy()
    expect(screen.getByRole('radio', { name: /Perfil de ejecución/ }).getAttribute('aria-checked')).toBe('true')
    const detail = screen.getByText('Elegir según la prioridad de las vacantes actuales.')
    const scrollRegion = detail.closest('[data-question-scroll]')
    expect(scrollRegion).toBeTruthy()
    expect(scrollRegion?.contains(screen.getByRole('radio', { name: /Perfil de ejecución/ }))).toBe(true)
    expect(scrollRegion?.contains(screen.getByText('Siguiente').closest('button'))).toBe(false)
    fireEvent.click(screen.getByRole('radio', { name: /Perfil de ejecución/ }))

    expect(screen.getByText('2 / 3')).toBeTruthy()
    // detail is per-question: the second question carries none.
    expect(screen.queryByText('Elegir según la prioridad de las vacantes actuales.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rellenar respuesta' })).toBeNull()
    const custom = screen.getByPlaceholderText('Escriba su respuesta')
    fireEvent.change(custom, { target: { value: 'Capaz de diagnosticar problemas en producción de forma independiente' } })
    fireEvent.keyDown(custom, { key: 'Enter' })

    expect(screen.getByText('3 / 3')).toBeTruthy()
    // The model's question text renders verbatim — no marker filtering.
    expect(screen.getByText('Elegir señales importantes (multiselección)')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Diseño de sistemas' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Diseño de sistemas' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Diseño de sistemas' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Calidad del código' }))
    const multiCustom = screen.getByPlaceholderText('Escriba su respuesta')
    fireEvent.change(multiCustom, { target: { value: 'Habilidades de comunicación' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Criterio de producto' }))
    expect(screen.getByRole('checkbox', { name: 'Diseño de sistemas' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('checkbox', { name: 'Calidad del código' }).getAttribute('aria-checked')).toBe('true')
    expect((multiCustom as HTMLInputElement).value).toBe('Habilidades de comunicación')
    fireEvent.keyDown(multiCustom, { key: 'Enter' })

    // The domain face encoded the whole batch into one carrier envelope.
    expect(answer).toHaveBeenCalledWith(answerBatch([
      { id: 'profile', selected: ['Perfil de ejecución (Recommended)'] },
      { id: 'detail', selected: [], custom: 'Capaz de diagnosticar problemas en producción de forma independiente' },
      { id: 'signals', selected: ['Diseño de sistemas', 'Calidad del código', 'Criterio de producto'], custom: 'Habilidades de comunicación' },
    ]))
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Enviando…' }).disabled).toBe(true)
  })

  it('renders plan detail through the shared assistant Markdown primitive', () => {
    const { carrier } = wait([{
      id: 'plan',
      question: '¿Aprobar este plan?',
      detail: '# Plan de implementación\n\n- **Validar primero** el estado actual\n- Modificar `QuestionComposer`',
      options: [{ label: 'Aprobar' }],
    }])
    const view = render(<QuestionComposer matched={carrier} {...kit} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Plan de implementación' })).toBeTruthy()
    expect(view.container.querySelector('strong')?.textContent).toBe('Validar primero')
    expect(view.container.querySelector('code')?.textContent).toBe('QuestionComposer')
    expect(view.container.querySelectorAll('li')).toHaveLength(2)
  })

  it('skips individual questions without discarding earlier answers', () => {
    const { carrier, answer } = wait()
    render(<QuestionComposer matched={carrier} {...kit} />)

    expect(screen.getByRole('radio', { name: /Perfil de ejecución/ }).getAttribute('aria-checked')).toBe('true')
    expect((screen.getByText('Siguiente').closest('button') as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByRole('radio', { name: 'Perfil de investigación' }))
    expect(screen.getByText('2 / 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Omitir' }))
    expect(screen.getByText('3 / 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Omitir' }))

    expect(answer).toHaveBeenCalledWith(answerBatch([
      { id: 'profile', selected: ['Perfil de investigación'] },
      { id: 'detail', selected: [] },
      { id: 'signals', selected: [] },
    ]))
  })

  it('keeps IME Enter inside the custom input until composition finishes', () => {
    const { carrier, answer } = wait()
    render(<QuestionComposer matched={carrier} {...kit} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Perfil de investigación' }))
    const custom = screen.getByPlaceholderText('Escriba su respuesta')
    fireEvent.change(custom, { target: { value: 'Entrada de texto' } })

    fireEvent.keyDown(custom, { key: 'Enter', isComposing: true })
    expect(screen.getByText('2 / 3')).toBeTruthy()
    expect(answer).not.toHaveBeenCalled()

    fireEvent.keyDown(custom, { key: 'Enter', keyCode: 229 })
    expect(screen.getByText('2 / 3')).toBeTruthy()
    expect(answer).not.toHaveBeenCalled()

    fireEvent.keyDown(custom, { key: 'Enter' })
    expect(screen.getByText('3 / 3')).toBeTruthy()
  })

  it('shows the inline custom input, reports missing answers, and supports pager navigation', () => {
    const { carrier, answer } = wait()
    render(<QuestionComposer matched={carrier} {...kit} />)

    expect(screen.getByPlaceholderText('Escriba su respuesta')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Perfil de ejecución' }))
    const emptyCustom = screen.getByPlaceholderText('Escriba su respuesta')
    fireEvent.keyDown(emptyCustom, { key: 'Enter', shiftKey: true })
    expect(screen.getByText('2 / 3')).toBeTruthy()
    fireEvent.keyDown(emptyCustom, { key: 'Enter' })
    expect(screen.getByText('Seleccione una opción o escriba una respuesta personalizada.')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Pregunta siguiente'))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Criterio de producto' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(screen.getByText('Complete esta pregunta primero.')).toBeTruthy()
    expect(screen.getByText('2 / 3')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Pregunta anterior'))
    expect(screen.getByText('1 / 3')).toBeTruthy()
    expect(answer).not.toHaveBeenCalled()
  })

  it('answers over multiple lines: both fields grow with the draft and keep Shift+Enter a newline', () => {
    const { carrier, answer } = wait()
    render(<QuestionComposer matched={carrier} {...kit} />)

    // Both question shapes answer into a textarea, so the engine soft-wraps a
    // long answer and Shift+Enter breaks the line natively.
    const inline = screen.getByPlaceholderText('Escriba su respuesta')
    expect(inline.tagName).toBe('TEXTAREA')

    const multiline = 'Primera línea\nSegunda línea'
    fireEvent.change(inline, { target: { value: multiline } })
    // The hidden height ruler carries the draft plus the trailing newline the
    // textarea's own last line needs, so the box is as tall as the answer.
    expect(inline.previousElementSibling?.textContent).toBe(`${multiline}\n`)
    // Shift+Enter belongs to the field, never to the flow.
    fireEvent.keyDown(inline, { key: 'Enter', shiftKey: true })
    expect(screen.getByText('1 / 3')).toBeTruthy()

    fireEvent.keyDown(inline, { key: 'Enter' })
    const optionless = screen.getByPlaceholderText('Escriba su respuesta')
    expect(optionless.tagName).toBe('TEXTAREA')
    fireEvent.change(optionless, { target: { value: multiline } })
    expect(optionless.previousElementSibling?.textContent).toBe(`${multiline}\n`)
    fireEvent.keyDown(optionless, { key: 'Enter', shiftKey: true })
    expect(screen.getByText('2 / 3')).toBeTruthy()

    fireEvent.keyDown(optionless, { key: 'Enter' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Diseño de sistemas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    // Line breaks reach the model verbatim: nothing along the way flattens them.
    expect(answer).toHaveBeenCalledWith(answerBatch([
      { id: 'profile', selected: [], custom: multiline },
      { id: 'detail', selected: [], custom: multiline },
      { id: 'signals', selected: ['Diseño de sistemas'] },
    ]))
  })

  it('surfaces cancellation failures and re-arms the controls', async () => {
    const { carrier, dismiss } = wait()
    dismiss
      .mockRejectedValueOnce(new Error('Error en la primera cancelación'))
      .mockRejectedValueOnce(new Error('Error en la segunda cancelación'))
    render(<QuestionComposer matched={carrier} {...kit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Descartar todas las preguntas' }))
    expect(await screen.findByText('Error en la primera cancelación')).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Omitir' }).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Descartar todas las preguntas' }))
    expect(await screen.findByText('Error en la segunda cancelación')).toBeTruthy()
  })

  it('surfaces answer rejection and resets local drafts for a different request', async () => {
    const first = wait()
    const view = render(<QuestionComposer matched={first.carrier} {...kit} />)

    fireEvent.click(screen.getByRole('radio', { name: /Perfil de investigación/ }))
    expect(screen.getByText('2 / 3')).toBeTruthy()
    const second = wait()
    second.answer
      .mockRejectedValueOnce(new Error('Red interrumpida'))
      .mockRejectedValueOnce('Error de cadena')
    view.rerender(<QuestionComposer matched={second.carrier} {...kit} />)
    expect(screen.getByRole('radio', { name: /Perfil de investigación/ }).getAttribute('aria-checked')).toBe('false')

    fireEvent.click(screen.getByRole('radio', { name: /Perfil de ejecución/ }))
    const custom = screen.getByPlaceholderText('Escriba su respuesta')
    fireEvent.change(custom, { target: { value: 'x' } })
    fireEvent.keyDown(custom, { key: 'Enter' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Diseño de sistemas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(second.answer).toHaveBeenNthCalledWith(1, answerBatch([
      { id: 'profile', selected: ['Perfil de ejecución (Recommended)'] },
      { id: 'detail', selected: [], custom: 'x' },
      { id: 'signals', selected: ['Diseño de sistemas'] },
    ]))
    expect(await screen.findByText('Red interrumpida')).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Enviar' }).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Error de cadena')).toBeTruthy()
  })

  it('renders chrome copy through the English dictionary', () => {
    const { carrier } = wait([{ id: 'detail', question: 'Añadir sus requisitos' }])
    render(<QuestionComposer matched={carrier} {...kit} t={seatOver(en, commonEn)} />)
    expect(screen.getByLabelText('Dismiss all questions')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy()
    expect(screen.getByPlaceholderText('Type your answer')).toBeTruthy()
  })

  it('restores the current page and drafts after the strict Session entry remounts', () => {
    const pending = wait()
    const view = render(<QuestionComposer matched={pending.carrier} {...kit} />)
    fireEvent.click(screen.getByRole('radio', { name: /Perfil de investigación/ }))
    const custom = screen.getByPlaceholderText('Escriba su respuesta')
    fireEvent.change(custom, { target: { value: 'Conservar este borrador' } })
    expect(screen.getByText('2 / 3')).toBeTruthy()

    view.unmount()
    render(<QuestionComposer matched={pending.carrier} {...kit} />)

    expect(screen.getByText('2 / 3')).toBeTruthy()
    expect(screen.getByPlaceholderText<HTMLTextAreaElement>('Escriba su respuesta').value).toBe('Conservar este borrador')
    fireEvent.click(screen.getByLabelText('Pregunta anterior'))
    expect(screen.getByRole('radio', { name: /Perfil de investigación/ }).getAttribute('aria-checked')).toBe('true')
  })
})

describe('PendingQuestion domain face', () => {
  it('exposes its Client render identity and scoped request values', () => {
    const question = new PendingQuestion(SID, QUESTIONS)
    expect(question.key).toMatch(/^question:[0-9a-f]{32}:\d+$/)
    expect(new PendingQuestion(SID, QUESTIONS).key).not.toBe(question.key)
    expect(question.sessionId).toBe(SID)
    expect(question.questions).toBe(QUESTIONS)
  })

  it('does not restore an old unnamed request draft into a new card', () => {
    draftInstance.actions.replace('question:1', {
      index: 7,
      drafts: [{ selected: ['stale'], custom: '', skipped: false }],
    })
    const question = new PendingQuestion(SID, QUESTIONS)
    render(<QuestionComposer matched={question} {...kit} />)

    expect(question.key).not.toBe('question:1')
    expect(screen.getByText('1 / 3')).toBeTruthy()
    expect(screen.queryByText('stale')).toBeNull()
  })

  it('ignores persisted progress that no longer matches the question batch', () => {
    const carrier = new PendingQuestion(SID, QUESTIONS, ToolCallId('stale-progress'))
    draftInstance.actions.replace(carrier.key, { index: 7, drafts: [] })

    render(<QuestionComposer matched={carrier} {...kit} />)

    expect(screen.getByRole('heading', { name: QUESTIONS[0]!.question })).toBeTruthy()
    expect(screen.getByText(`1 / ${QUESTIONS.length}`)).toBeTruthy()
  })

  it('collapses the card to the header strip and expands it back', () => {
    const { carrier } = wait()
    render(<QuestionComposer matched={carrier} {...kit} />)
    // Expanded: the option list is visible.
    expect(screen.getByRole('radiogroup')).toBeTruthy()
    // Collapse: options leave the tree; the title and minimize toggle stay.
    fireEvent.click(screen.getByLabelText(es['nav.minimize']))
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.getByText('Elegir el tipo de candidato')).toBeTruthy()
    // Expand: the options return (the toggle label flips while collapsed).
    fireEvent.click(screen.getByLabelText(es['nav.maximize']))
    expect(screen.getByRole('radiogroup')).toBeTruthy()
    // Expanded again: the toggle reports expanded and the option list is back.
    expect(screen.getByLabelText(es['nav.minimize']).getAttribute('aria-expanded')).toBe('true')
  })

  it('keeps the collapse toggle out of the cancel path and preserves drafts across collapse', () => {
    const { carrier, answer } = wait()
    render(<QuestionComposer matched={carrier} {...kit} />)
    fireEvent.click(screen.getByRole('radio', { name: /Perfil de ejecución/ }))
    // Single-select auto-advances to the second question; collapse and expand
    // must not lose either the picked option or the current position.
    fireEvent.click(screen.getByLabelText(es['nav.minimize']))
    fireEvent.click(screen.getByLabelText(es['nav.maximize']))
    const custom = screen.getByPlaceholderText(es['custom.placeholder'])
    fireEvent.change(custom, { target: { value: 'Capaz de diagnosticar problemas en producción de forma independiente' } })
    // Re-expanding must not steal focus back into the textarea: it was
    // autofocused on first presentation, so focus stays on the expand toggle.
    expect(document.activeElement).not.toBe(custom)
    fireEvent.click(screen.getByLabelText('Pregunta siguiente'))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Diseño de sistemas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(answer).toHaveBeenCalledWith(answerBatch([
      { id: 'profile', selected: ['Perfil de ejecución (Recommended)'] },
      { id: 'detail', custom: 'Capaz de diagnosticar problemas en producción de forma independiente', selected: [] },
      { id: 'signals', selected: ['Diseño de sistemas'] },
    ]))
  })
})

describe('parseRecommendedLabel', () => {
  it('recognizes English and Spanish suffixes without changing ordinary labels', () => {
    expect(parseRecommendedLabel('Fast (Recommended)')).toEqual({ label: 'Fast', recommended: true })
    expect(parseRecommendedLabel('Prudente（recomendado）')).toEqual({ label: 'Prudente', recommended: true })
    expect(parseRecommendedLabel('Prudente (recomendado)')).toEqual({ label: 'Prudente', recommended: true })
    expect(parseRecommendedLabel('Plain')).toEqual({ label: 'Plain', recommended: false })
  })
})

const TIMED: PendingQuestion['questions'] = [{
  id: 'scope', question: 'Elegir el alcance', options: [{ label: 'Solo herramientas' }, { label: 'Todo' }],
}]

/** A timed card as the Remote Event listener builds it: waterfall channel with a Client-decided deadline. */
function timedCard(deadline: number, callId = ToolCallId('ask-timed')) {
  const carrier = new PendingQuestion(SID, TIMED, callId)
  const request = createWaterfallRequest(deadline, undefined, (channel) => { carrier.detachWaterfall(channel) })
  carrier.attachWaterfall(request.channel)
  void request.result.catch(() => {})
  return { carrier, request }
}

describe('timed card', () => {
  it.each([true, false])('does not autofocus before claiming and respects manual focus until readiness: %s', async (stillFocused) => {
    vi.useFakeTimers()
    const carrier = new PendingQuestion(SID, [{ id: 'free', question: 'Añadir una aclaración' }], ToolCallId('claiming'))
    const request = createWaterfallRequest(Date.now() + 2_000, undefined,
      (channel) => { carrier.detachWaterfall(channel) })
    try {
      render(<QuestionComposer matched={carrier} {...kit} />)
      const field = screen.getByPlaceholderText(es['custom.placeholder'])
      expect(document.activeElement).not.toBe(field)

      fireEvent.focus(field)
      if (!stillFocused) fireEvent.blur(field, { relatedTarget: document.body })
      act(() => { carrier.attachWaterfall(request.channel) })
      expect(carrier.snapshot().countdown).toEqual({ remainingMs: 2_000, running: !stillFocused })
      if (stillFocused) {
        await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
        expect(carrier.snapshot().channel).toBe('waterfall')
        fireEvent.blur(field, { relatedTarget: document.body })
        expect(carrier.snapshot().countdown).toEqual({ remainingMs: 2_000, running: true })
      }
    } finally {
      act(() => { request.channel.resolve({ answers: [{ id: 'free', selected: [] }] }) })
      await request.result
      cleanup()
      carrier.close()
      vi.useRealTimers()
    }
  })

  it('pauses a pristine countdown while the answer surface has focus and resumes its remainder on blur', async () => {
    vi.useFakeTimers()
    try {
      const { carrier, request } = timedCard(Date.now() + 2_000)
      let settled = false
      void request.result.then(() => { settled = true }, () => { settled = true })
      render(<QuestionComposer matched={carrier} {...kit} />)
      const option = screen.getByRole('radio', { name: 'Solo herramientas' })

      fireEvent.focus(option)
      expect(carrier.snapshot()).toMatchObject({ waitState: 'focused', countdown: { running: false } })
      expect(screen.getByText(/En pausa/)).toBeTruthy()
      await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
      expect(settled).toBe(false)

      fireEvent.blur(option, { relatedTarget: document.body })
      expect(carrier.snapshot()).toMatchObject({ waitState: 'counting' })
      await act(async () => { await vi.advanceTimersByTimeAsync(2_100) })
      expect(settled).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the first edited draft indefinite and restores that choice after remount', async () => {
    vi.useFakeTimers()
    try {
      const first = timedCard(Date.now() + 1_000)
      let firstSettled = false
      void first.request.result.then(() => { firstSettled = true }, () => { firstSettled = true })
      const view = render(<QuestionComposer matched={first.carrier} {...kit} />)

      fireEvent.click(screen.getByRole('radio', { name: 'Solo herramientas' }))
      expect(first.carrier.snapshot()).toMatchObject({ waitState: 'editing', countdown: { running: false } })
      expect(draftInstance.getSnapshot().progressByRequest[first.carrier.key]?.wait).toBe('editing')
      await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
      expect(firstSettled).toBe(false)

      view.unmount()
      const restored = timedCard(Date.now() + 1_000)
      let restoredSettled = false
      void restored.request.result.then(() => { restoredSettled = true }, () => { restoredSettled = true })
      render(<QuestionComposer matched={restored.carrier} {...kit} />)
      await act(async () => { await Promise.resolve() })
      expect(restored.carrier.snapshot()).toMatchObject({ waitState: 'editing', countdown: { running: false } })
      expect(screen.getByText('Esperando hasta que responda')).toBeTruthy()
      await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
      expect(restoredSettled).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('counts down locally, settles the waterfall with ASK_TIMED_OUT at zero, and waits for the projection', async () => {
    vi.useFakeTimers()
    try {
      const { carrier, request } = timedCard(Date.now() + 1_500)
      const rejection = expect(request.result).rejects.toMatchObject({ name: 'UserQuestionError', code: 'ASK_TIMED_OUT' })
      render(<QuestionComposer matched={carrier} {...kit} />)
      expect(screen.getByText(/Continuando en/)).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Tómese su tiempo' })).toBeTruthy()
      await act(async () => { await vi.advanceTimersByTimeAsync(2_100) })

      await rejection
      expect(carrier.snapshot()).toEqual({
        state: 'open', waitState: 'counting', countdown: undefined,
        channel: 'none', closed: false,
      })
      expect(screen.queryByText(/Continuando en/)).toBeNull()
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Enviar' }).disabled).toBe(true)

      const answer = vi.fn(async () => true)
      act(() => {
        carrier.attachRpc({ answer })
        carrier.setState('continued')
      })
      expect(screen.getByText('El trabajo continuó; aún puede responder')).toBeTruthy()
      fireEvent.click(screen.getByRole('radio', { name: 'Solo herramientas' }))
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Enviar' }).disabled).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
      await act(async () => { await Promise.resolve() })
      expect(answer).toHaveBeenCalledWith({ answers: [{ id: 'scope', selected: ['Solo herramientas'] }] })
    } finally {
      vi.useRealTimers()
    }
  })

  it('lets the user cancel this countdown and keep the request blocking', async () => {
    vi.useFakeTimers()
    try {
      const { carrier, request } = timedCard(Date.now() + 1_000)
      let settled = false
      void request.result.then(() => { settled = true }, () => { settled = true })
      render(<QuestionComposer matched={carrier} {...kit} />)

      fireEvent.click(screen.getByRole('button', { name: 'Tómese su tiempo' }))

      expect(screen.queryByText(/Continuando en/)).toBeNull()
      expect(screen.queryByRole('button', { name: 'Tómese su tiempo' })).toBeNull()
      await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
      expect(settled).toBe(false)
      expect(carrier.snapshot()).toMatchObject({ channel: 'waterfall', waitState: 'waiting' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('re-arms the controls with a resubmit hint when a sent answer is dropped', async () => {
    const { carrier, request } = timedCard(Date.now() + 60_000)
    render(<QuestionComposer matched={carrier} {...kit} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Solo herramientas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await expect(request.result).resolves.toEqual({ answers: [{ id: 'scope', selected: ['Solo herramientas'] }] })
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Enviando…' }).disabled).toBe(true)
    expect(draftInstance.getSnapshot().progressByRequest[carrier.key]).toBeDefined()

    act(() => { carrier.setState('continued') })

    expect(screen.getByText('La respuesta no llegó antes de que el trabajo continuara; envíela de nuevo.')).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Solo herramientas' }).getAttribute('aria-checked')).toBe('true')
    const answer = vi.fn(async () => true)
    act(() => { carrier.attachRpc({ answer }) })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await vi.waitFor(() => { expect(answer).toHaveBeenCalledWith({ answers: [{ id: 'scope', selected: ['Solo herramientas'] }] }) })
  })

  it('steers an RPC reply, hides the panel, and rejects a duplicate before discard', async () => {
    const carrier = new PendingQuestion(SID, TIMED, ToolCallId('ask-retry'))
    const answer = vi.fn(async () => true)
    const hide = vi.fn()
    answer.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('a reply is already queued for this question'))
    carrier.attachRpc({ answer })
    carrier.attachSeat({ hide })
    carrier.setState('continued')
    render(<QuestionComposer matched={carrier} {...kit} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Solo herramientas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await vi.waitFor(() => { expect(hide).toHaveBeenCalledOnce() })
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Enviar' }).disabled).toBe(false)
    expect(screen.queryByText(es['status.sent'])).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('a reply is already queued for this question')).toBeTruthy()
    expect(answer).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await vi.waitFor(() => { expect(answer).toHaveBeenCalledTimes(3) })
    await vi.waitFor(() => {
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Enviar' }).disabled).toBe(false)
    })
  })

  it('unlocks an older reply when the rendered channel lags its continued state', async () => {
    const carrier = new PendingQuestion(SID, TIMED, ToolCallId('ask-stale-channel'))
    const hide = vi.fn()
    carrier.attachRpc({ answer: vi.fn(async () => true) })
    carrier.attachSeat({ hide })
    carrier.setState('continued')
    const rendered = { ...carrier.snapshot(), state: 'open' as const, channel: 'waterfall' as const }
    const useQuestionCard = ((_key: string, selector?: (value: QuestionCardSnapshot | undefined) => unknown) =>
      selector === undefined ? rendered : selector(rendered)) as QuestionComposerProps['useQuestionCard']
    render(<Composer matched={carrier} {...kit} useQuestionCard={useQuestionCard} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Solo herramientas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await vi.waitFor(() => { expect(hide).toHaveBeenCalledOnce() })
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Enviar' }).disabled).toBe(false)
  })

  it('closing a continued panel only withdraws it from the seat and sends nothing', async () => {
    const carrier = new PendingQuestion(SID, TIMED, ToolCallId('ask-continued'))
    const answer = vi.fn(async () => true)
    const hide = vi.fn()
    carrier.attachRpc({ answer })
    carrier.attachSeat({ hide })
    carrier.setState('continued')
    render(<QuestionComposer matched={carrier} {...kit} />)

    expect(screen.getByText('El trabajo continuó; aún puede responder')).toBeTruthy()
    expect(screen.queryByText(/Continuando en/)).toBeNull()
    // The close button names the reopen path, not a dismissal of the question.
    expect(screen.queryByLabelText('Descartar todas las preguntas')).toBeNull()
    fireEvent.click(screen.getByLabelText('Cerrar el panel; reábralo desde la llamada de herramienta'))

    await vi.waitFor(() => { expect(hide).toHaveBeenCalledOnce() })
    expect(answer).not.toHaveBeenCalled()
    expect(carrier.snapshot()).toMatchObject({ state: 'continued', channel: 'rpc', closed: false })
  })

  it('closing a card-keyed panel with no channel left still just withdraws it', () => {
    const carrier = new PendingQuestion(SID, TIMED, ToolCallId('ask-gap'))
    const hide = vi.fn()
    carrier.attachSeat({ hide })
    render(<QuestionComposer matched={carrier} {...kit} />)

    fireEvent.click(screen.getByLabelText('Cerrar el panel; reábralo desde la llamada de herramienta'))

    expect(hide).toHaveBeenCalledOnce()
    expect(screen.queryByText('No se puede enviar ahora; inténtelo de nuevo en un momento.')).toBeNull()
  })

  it('reports an unavailable channel instead of cancelling into the gap', () => {
    // A request the Host never named: closing it is the cancellation, so with
    // no channel to carry the rejection there is nothing to do but say so.
    const carrier = new PendingQuestion(SID, TIMED)
    render(<QuestionComposer matched={carrier} {...kit} />)

    fireEvent.click(screen.getByLabelText('Descartar todas las preguntas'))

    expect(screen.getByText('No se puede enviar ahora; inténtelo de nuevo en un momento.')).toBeTruthy()
  })

  it('prunes drafts no card owns on mount and clears its own draft when the card closes', () => {
    kit.actions.replace('question:stale', { index: 0, drafts: [{ selected: [], custom: 'old', skipped: false }] })
    const { carrier } = timedCard(Date.now() + 60_000)
    render(<QuestionComposer matched={carrier} {...kit} />)

    expect(draftInstance.getSnapshot().progressByRequest['question:stale']).toBeUndefined()
    fireEvent.click(screen.getByRole('radio', { name: 'Todo' }))
    expect(draftInstance.getSnapshot().progressByRequest[carrier.key]?.drafts[0]?.selected).toEqual(['Todo'])

    act(() => { carrier.close() })

    expect(draftInstance.getSnapshot().progressByRequest[carrier.key]).toBeUndefined()
  })
})

const REVIEWED_CALL = 'ask-answered'
/** One settled call's answers in record order, which is not the question order. */
const RECORDED: readonly AskUserQuestionAnswerItem[] = [
  { id: 'signals', selected: [] },
  { id: 'profile', selected: ['Perfil de ejecución (Recommended)'] },
  { id: 'detail', selected: [], custom: 'Capaz de diagnosticar problemas en producción de forma independiente' },
]
/** A record whose multi-select answer used the custom row beside a checked option. */
const RECORDED_CUSTOM: readonly AskUserQuestionAnswerItem[] = [
  { id: 'profile', selected: ['Perfil de investigación'] },
  { id: 'detail', selected: [], custom: 'Capaz de diagnosticar problemas en producción de forma independiente' },
  { id: 'signals', selected: ['Diseño de sistemas'], custom: 'Habilidades de comunicación' },
]

/** A read-only card as the panel provider builds it from a settled call's transcript record. */
function reviewCard(review: readonly AskUserQuestionAnswerItem[] = RECORDED) {
  const carrier = new PendingQuestion(SID, QUESTIONS, ToolCallId(REVIEWED_CALL), undefined, review)
  const hide = vi.fn()
  carrier.attachSeat({ hide })
  return { carrier, hide }
}

describe('review card', () => {
  it('walks a settled call record with every answer surface frozen', () => {
    const { carrier } = reviewCard()
    render(<QuestionComposer matched={carrier} {...kit} />)

    expect(screen.getByText(es['review.status'])).toBeTruthy()
    // The recorded selection is paired by question id, not by record order.
    const chosen = screen.getByRole<HTMLButtonElement>('radio', { name: 'Perfil de ejecución' })
    expect(chosen.getAttribute('aria-checked')).toBe('true')
    expect(chosen.disabled).toBe(true)
    // Nothing is left to send, and the unused free-text field would read as
    // somewhere to type.
    expect(screen.queryByRole('button', { name: 'Omitir' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Enviar' })).toBeNull()
    expect(screen.queryByPlaceholderText('Escriba su respuesta')).toBeNull()

    fireEvent.click(screen.getByLabelText('Pregunta siguiente'))

    expect(screen.getByText('2 / 3')).toBeTruthy()
    const optionless = screen.getByPlaceholderText<HTMLTextAreaElement>('Escriba su respuesta')
    expect(optionless.value).toBe('Capaz de diagnosticar problemas en producción de forma independiente')
    expect(optionless.disabled).toBe(true)
    expect(document.activeElement).not.toBe(optionless)

    fireEvent.click(screen.getByLabelText('Pregunta siguiente'))

    expect(screen.getByText('3 / 3')).toBeTruthy()
    expect(screen.getByText(es['review.skipped'])).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Diseño de sistemas' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.queryByPlaceholderText('Escriba su respuesta')).toBeNull()
  })

  it('reads the record back instead of a draft the live card left under the same key', () => {
    kit.actions.replace(PendingQuestion.keyOf(SID, REVIEWED_CALL), {
      index: 2,
      drafts: [
        { selected: [], custom: 'Borrador no enviado', skipped: false },
        { selected: [], custom: '', skipped: false },
        { selected: ['Calidad del código'], custom: '', skipped: false },
      ],
    })
    const { carrier } = reviewCard(RECORDED_CUSTOM)
    render(<QuestionComposer matched={carrier} {...kit} />)

    // The page the live card was on is restored; its half-typed answers are not.
    expect(screen.getByText('3 / 3')).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Diseño de sistemas' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('checkbox', { name: 'Calidad del código' }).getAttribute('aria-checked')).toBe('false')
    const custom = screen.getByPlaceholderText<HTMLTextAreaElement>('Escriba su respuesta')
    expect(custom.value).toBe('Habilidades de comunicación')
    expect(custom.disabled).toBe(true)

    fireEvent.click(screen.getByLabelText('Pregunta anterior'))
    fireEvent.click(screen.getByLabelText('Pregunta anterior'))

    expect(screen.getByRole('radio', { name: 'Perfil de investigación' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByDisplayValue('Borrador no enviado')).toBeNull()
  })

  it('closing a read-only panel withdraws it and sends nothing', () => {
    const { carrier, hide } = reviewCard()
    render(<QuestionComposer matched={carrier} {...kit} />)

    // The card is keyed by its tool call, so closing names the reopen path.
    expect(screen.queryByLabelText(es['nav.cancel'])).toBeNull()
    fireEvent.click(screen.getByLabelText(es['nav.close']))

    expect(hide).toHaveBeenCalledOnce()
    expect(carrier.snapshot()).toEqual({
      state: 'open', waitState: 'counting', countdown: undefined,
      channel: 'none', closed: false,
    })
  })

  it('renders the read-only copy through the English dictionary', () => {
    const { carrier } = reviewCard()
    render(<QuestionComposer matched={carrier} {...kit} t={seatOver(en, commonEn)} />)

    expect(screen.getByText(en['review.status'])).toBeTruthy()
    fireEvent.click(screen.getByLabelText(en['nav.next']))
    fireEvent.click(screen.getByLabelText(en['nav.next']))
    expect(screen.getByText(en['review.skipped'])).toBeTruthy()
  })
})
