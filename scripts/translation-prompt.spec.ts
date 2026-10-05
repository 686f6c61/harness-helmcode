/** Unit tests for the prompt-v7 content and unchanged three-section protocol. */

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  consumeTranslationResponse,
  parseTranslationResponse,
  renderTranslationPrompt,
  renderTranslationRequest,
  renderTranslationResponse,
} from './translation-prompt.ts'

const root = resolve(import.meta.dirname, '..')
const document = readFileSync(join(root, 'docs/i18n/translation-prompt.md'), 'utf8')
const terminology = '| English | Español |\n|---|---|\n| agent | agent |'

const retainedExamples = [
  ['### Colloquial verb → Professional verb', 'The repo pins pnpm@11.7.0 in package.json', 'El repositorio fija pnpm@11.7.0 en package.json'],
  ['### Run-on sentence → Natural phrasing with pause', 'Read docs/architecture.md before changing anything under packages/.', 'Antes de modificar cualquier contenido bajo packages/, lee primero docs/architecture.md.'],
  ['### Stiff passive voice → Active and natural', 'a green gate means the pair was confirmed consistent at these exact contents, not that the confirmation was sound.', 'una puerta en verde significa que el par se confirmó consistente con estos contenidos exactos, no que la confirmación fuera acertada.'],
  ['### Invented word → Natural expression', 'A sidecar record of both blob hashes makes consistency checkable', 'Un registro sidecar de ambos blob hashes hace que la consistencia sea verificable'],
  ['### Em-dash → Colon/period', 'FIXME — an issue that should block a new release.', 'FIXME: un problema que debe bloquear una nueva versión.'],
  ['### Overly literal → Meaningful rendering', 'awkward phrasing is easier to notice when you read the translation without comparing it with the source', 'al leer la traducción sin compararla con la fuente, es más fácil notar las frases poco naturales'],
  ['### Terminology — do not translate what should be kept in English', 'typed service seams, and explicit extension points', 'seams de servicio tipados y puntos de extensión explícitos'],
  ['### Slang/jargon → Professional phrasing', 'The committed agent workflow lives in .agents/skills/dsh-translate-docs', 'El flujo de trabajo de agent integrado en el repositorio vive en .agents/skills/dsh-translate-docs'],
  ['### "For humans" — translate the intent, not the word', 'For humans, start with the development guide', 'Para desarrolladores: empieza con la guía de desarrollo'],
  ['### Code block comments — NEVER translate', '# full-screen TUI coding agent (needs DEEPSEEK_API_KEY)', 'keep exactly as-is, byte-for-byte'],
  ['### Language switcher — flip direction', 'English | [Español](README.es.md)', '[English](README.md) | Español'],
]

describe('translation prompt rendering', () => {
  it('renders both directions with every placeholder resolved', () => {
    const en = renderTranslationPrompt(document, { sourceLanguage: 'English', sourceFilename: 'guide.md', terminology })
    expect(en).toContain('from English to Spanish')
    expect(en).toContain(terminology)
    expect(en).not.toContain('{{')
    expect(en).toContain('plain source stays plain (DEBE)')
    expect(en).toContain('For an English target, use the established English technical term')
    expect(en).toContain('does a Spanish target use an established Spanish rendering')
    expect(en).toContain('does an English target use the established English technical term')
    expect(en).toContain('The parser removes exactly one framing escape')
    const es = renderTranslationPrompt(document, { sourceLanguage: 'Spanish', sourceFilename: 'guide.es.md', terminology })
    expect(es).toContain('from Spanish to English')
  })

  it('contains every embedded example', () => {
    for (const example of retainedExamples) {
      for (const fragment of example) expect(document).toContain(fragment)
    }
  })

  it('states the selected v7 safeguards', () => {
    const rendered = renderTranslationPrompt(document, { sourceLanguage: 'English', sourceFilename: 'guide.md', terminology })
    expect(rendered).toContain('## Priority')
    expect(rendered).toContain('### Faithfulness')
    expect(rendered).toContain('do not invent a filename or switcher')
    expect(rendered).toContain('Never invent responsibility merely to avoid a passive construction')
    expect(rendered).toContain('Never vary a terminology-table form, defined concept, or contract verb merely for stylistic variety')
    expect(rendered).toContain('Spanish output uses its `.es.md` path')
    expect(rendered).toContain('belongs to the active bilingual corpus')
    expect(rendered).toContain('a missing counterpart in that corpus is an error')
    expect(rendered).toContain('exact query/fragment suffix')
    expect(rendered).toContain('Return exactly three raw XML sections')
  })

  it('rejects a template with unknown or missing placeholders', () => {
    const alien = document.replaceAll('{{terminology}}', '{{terms_prompt}}')
    expect(() => renderTranslationPrompt(alien, { sourceLanguage: 'English', sourceFilename: 'guide.md', terminology })).toThrow(/unsupported placeholder/)
    const missing = document.replaceAll('{{terminology}}', '')
    expect(() => renderTranslationPrompt(missing, { sourceLanguage: 'English', sourceFilename: 'guide.md', terminology })).toThrow(/required placeholder/)
  })

  it('rejects unmatched placeholder delimiters', () => {
    for (const delimiter of ['{{', '}}']) {
      const malformed = document.replace('Your task is to translate', `Your task ${delimiter} is to translate`)
      expect(() => renderTranslationPrompt(malformed, {
        sourceLanguage: 'English',
        sourceFilename: 'guide.md',
        terminology,
      })).toThrow(/malformed placeholder syntax/)
    }
  })

  it('assembles bare few-shot turns before the real source document', () => {
    const request = renderTranslationRequest(document, {
      sourceLanguage: 'English',
      sourceFilename: 'guide.md',
      sourceDocument: '# Guide\n\nNew source.',
      terminology,
      examples: [{ english: '# Example\n\nEnglish.', spanish: '# Ejemplo\n\nEspañol.' }],
    })
    expect(request.targetFilename).toBe('guide.es.md')
    expect(request.messages.map(message => message.role)).toEqual(['system', 'user', 'assistant', 'user'])
    expect(request.messages.slice(1).map(message => message.content)).toEqual([
      '# Example\n\nEnglish.',
      '# Ejemplo\n\nEspañol.',
      '# Guide\n\nNew source.',
    ])

    const reverse = renderTranslationRequest(document, {
      sourceLanguage: 'Spanish',
      sourceFilename: 'guide.es.md',
      sourceDocument: '# Guía\n\nNueva fuente.',
      terminology,
      examples: [{ english: '# Example\n\nEnglish.', spanish: '# Ejemplo\n\nEspañol.' }],
    })
    expect(reverse.targetFilename).toBe('guide.md')
    expect(reverse.messages.slice(1).map(message => message.content)).toEqual([
      '# Ejemplo\n\nEspañol.',
      '# Example\n\nEnglish.',
      '# Guía\n\nNueva fuente.',
    ])
  })
})

describe('translation response sections', () => {
  it('round-trips Markdown bodies', () => {
    const response = { translation: '# Título\n\nCuerpo **negrita**.', review: '- [Tone] Una corrección.\n- Sin correcciones', final: '# Título\n\nVersión final.' }
    expect(parseTranslationResponse(renderTranslationResponse(response))).toEqual(response)
  })

  it('tolerates a fenced xml wrapper around the whole response', () => {
    const fenced = '```xml\n<translation>\nA\n</translation>\n\n<review>\n- Sin correcciones\n</review>\n\n<final>\nA\n</final>\n```'
    expect(parseTranslationResponse(fenced).final).toBe('A')
  })

  it('keeps an inline close tag inside prose from terminating the section', () => {
    const doc = { translation: 'the wire format uses </translation> as its close tag', review: '- Sin correcciones', final: 'F' }
    expect(parseTranslationResponse(renderTranslationResponse(doc))).toEqual(doc)
  })

  it('round-trips wrapper-tag lines inside Markdown bodies', () => {
    const doc = {
      translation: '```xml\n</translation>\n```',
      review: '- [Structure] Preserved `<final>` on its own line.',
      final: 'literal delimiters\n</final>\n\\</final>',
    }
    const rendered = renderTranslationResponse(doc)
    expect(parseTranslationResponse(rendered)).toEqual(doc)
    expect(() => parseTranslationResponse(rendered.replace('\\</translation>', '</translation>'))).toThrow(/duplicate <translation>/)
  })

  it('rejects a duplicate section appearing before final', () => {
    const early = '<translation>\nA\n</translation>\n<translation>\nB\n</translation>\n<review>\nR\n</review>\n<final>\nF\n</final>'
    expect(() => parseTranslationResponse(early)).toThrow(/duplicate <translation>/)
  })

  it('rejects missing, unterminated, or duplicated sections', () => {
    expect(() => parseTranslationResponse('<translation>\nA\n</translation>')).toThrow(/missing or unterminated <review>/)
    expect(() => parseTranslationResponse('<translation>\nA')).toThrow(/missing or unterminated <translation>/)
    const dup = '<translation>\nA\n</translation>\n<review>\nR\n</review>\n<final>\nF\n</final>\n<final>\nG\n</final>'
    expect(() => parseTranslationResponse(dup)).toThrow(/duplicate <final>/)
    expect(() => parseTranslationResponse(`${renderTranslationResponse({ translation: 'A', review: 'R', final: 'F' })}\nstray`))
      .toThrow(/content is not allowed outside/)
  })

  it('inserts or corrects the target switcher after parsing a new-pair response', () => {
    const response = renderTranslationResponse({
      translation: '# Guía\n\nBorrador.',
      review: '- Sin correcciones',
      final: '# Guía\n\nEnglish | [Español](guide.es.md)\n\nVersión final.',
    })
    expect(consumeTranslationResponse(response, { sourceLanguage: 'English', sourceFilename: 'guide.md' }).final).toBe([
      '# Guía',
      '',
      '[English](guide.md) | Español',
      '',
      'Versión final.',
      '',
    ].join('\n'))
  })

  it('preserves YAML frontmatter before inserting the target switcher', () => {
    const response = renderTranslationResponse({
      translation: '# Guía\n\nBorrador.',
      review: '- Sin correcciones',
      final: [
        '---',
        'layout: home',
        '---',
        '',
        '# Guía',
        '',
        'Versión final.',
      ].join('\n'),
    })
    expect(consumeTranslationResponse(response, { sourceLanguage: 'English', sourceFilename: 'guide.md' }).final).toBe([
      '---',
      'layout: home',
      '---',
      '',
      '# Guía',
      '',
      '[English](guide.md) | Español',
      '',
      'Versión final.',
      '',
    ].join('\n'))
  })

  it('rejects unterminated YAML frontmatter before the target H1', () => {
    const response = renderTranslationResponse({
      translation: '# Guía\n\nBorrador.',
      review: '- Sin correcciones',
      final: '---\nlayout: home\n\n# Guía\n\nVersión final.',
    })
    expect(() => consumeTranslationResponse(response, {
      sourceLanguage: 'English',
      sourceFilename: 'guide.md',
    })).toThrow(/unterminated YAML frontmatter/)
  })

  it('rejects a source filename that contradicts the translation direction', () => {
    expect(() => renderTranslationPrompt(document, {
      sourceLanguage: 'Spanish',
      sourceFilename: 'guide.md',
      terminology,
    })).toThrow(/does not match source language Spanish/)
  })

  it('inserts the English target switcher for a Spanish source', () => {
    const response = renderTranslationResponse({
      translation: '# Guide\n\nDraft.',
      review: '- [None] No corrections.',
      final: '# Guide\n\nFinal.',
    })
    expect(consumeTranslationResponse(response, {
      sourceLanguage: 'Spanish',
      sourceFilename: 'guide.es.md',
    }).final).toContain('\n\nEnglish | [Español](guide.es.md)\n\n')
  })
})
