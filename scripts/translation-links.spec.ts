/** Regression coverage for locale-aware bilingual Markdown links. */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  normalizeTranslationMarkdownLinks,
  rewriteTranslationLinkLocales,
  translationLinkLocaleViolations,
  type TranslationLinkContext,
} from './translation-links.ts'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) removeFixtureSafely(root)
})

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-translation-links-'))
  roots.push(root)
  mkdirSync(join(root, 'docs/section'), { recursive: true })
  mkdirSync(join(root, 'packages'), { recursive: true })
  writeFileSync(join(root, 'docs/guide.md'), '# Guide\n')
  writeFileSync(join(root, 'docs/guide.es.md'), '# Guía\n')
  writeFileSync(join(root, 'docs/reference.md'), '# Overview\n')
  writeFileSync(join(root, 'docs/reference.es.md'), '# Resumen\n')
  writeFileSync(join(root, 'docs/unpaired.md'), '# Only\n')
  writeFileSync(join(root, 'docs/section/index.md'), '# Section\n')
  writeFileSync(join(root, 'docs/section/index.es.md'), '# Sección\n')
  writeFileSync(join(root, 'packages/outside.md'), '# Outside\n')
  writeFileSync(join(root, 'packages/outside.es.md'), '# Fuera de alcance\n')
  return root
}

function linkContext(
  root: string,
  sourcePath: string,
  repositoryFileExists?: (repoPath: string) => boolean,
): TranslationLinkContext {
  return {
    repoRoot: root,
    sourcePath,
    isTranslationPairSource: path => path.startsWith('docs/'),
    ...(repositoryFileExists === undefined ? {} : { repositoryFileExists }),
  }
}

function expectUnchangedLinkInput(root: string, input: string): void {
  const context = linkContext(root, 'docs/guide.md')
  expect(translationLinkLocaleViolations(input, context)).toEqual([])
  expect(rewriteTranslationLinkLocales(input, context)).toEqual({ content: input, rewritten: 0 })
  expect(normalizeTranslationMarkdownLinks(input, context)).toBe(input)
}

describe('translation link locale validation', () => {
  it('rejects a Spanish link to the English sibling with an exact diagnostic', () => {
    const root = fixture()
    expect(translationLinkLocaleViolations(
      '# Guía\n\nCuerpo.\n\n[Resumen](reference.md?view=full#overview)\n',
      linkContext(root, 'docs/guide.es.md'),
    )).toEqual([{
      sourcePath: 'docs/guide.es.md',
      line: 5,
      url: 'reference.md?view=full#overview',
      expectedUrl: 'reference.es.md?view=full#overview',
    }])
  })

  it('rewrites an encoded exact filename without changing its query or fragment suffix', () => {
    const root = fixture()
    const input = '[Resumen](reference%2Emd?view=full&amp;mode=all#overview)\n'
    expect(translationLinkLocaleViolations(
      input,
      linkContext(root, 'docs/guide.es.md'),
    )[0]).toMatchObject({
      url: 'reference%2Emd?view=full&amp;mode=all#overview',
      expectedUrl: 'reference.es.md?view=full&amp;mode=all#overview',
    })
    expect(rewriteTranslationLinkLocales(input, linkContext(root, 'docs/guide.es.md'))).toEqual({
      content: '[Resumen](reference.es.md?view=full&amp;mode=all#overview)\n',
      rewritten: 1,
    })
  })

  it('encodes each exact path segment with only RFC 3986 unreserved characters', () => {
    const root = fixture()
    const input = '[Conservar](a%29%23%3Fb%2Emd?view=full#section)\n'
    const repositoryFiles = new Set(['docs/a)#?b.md', 'docs/a)#?b.es.md'])
    expect(rewriteTranslationLinkLocales(
      input,
      linkContext(root, 'docs/guide.es.md', path => repositoryFiles.has(path)),
    )).toEqual({
      content: '[Conservar](a%29%23%3Fb.es.md?view=full#section)\n',
      rewritten: 1,
    })
  })

  it('accepts the target-locale sibling and an out-of-scope target with its own sibling', () => {
    const root = fixture()
    expect(translationLinkLocaleViolations(
      '[paired](reference.es.md) [outside](../packages/outside.md)\n',
      linkContext(root, 'docs/guide.es.md'),
    )).toEqual([])
  })

  it('does not fall back when an active target is missing its locale sibling', () => {
    const root = fixture()
    expect(translationLinkLocaleViolations(
      '[missing](unpaired.md)\n',
      linkContext(root, 'docs/guide.es.md'),
    )[0]).toMatchObject({ expectedUrl: 'unpaired.es.md' })
  })

  it('requires English sources to use the English sibling', () => {
    const root = fixture()
    expect(translationLinkLocaleViolations(
      '[Reference](reference.es.md)\n',
      linkContext(root, 'docs/guide.md'),
    )[0]).toMatchObject({
      url: 'reference.es.md',
      expectedUrl: 'reference.md',
    })
  })

  it('does not infer an index page from a directory target', () => {
    const root = fixture()
    const input = '[Section](section/)\n'
    expect(translationLinkLocaleViolations(input, linkContext(root, 'docs/guide.es.md'))).toEqual([])
    expect(rewriteTranslationLinkLocales(input, linkContext(root, 'docs/guide.es.md')))
      .toEqual({ content: input, rewritten: 0 })
  })

  it('exempts the language switcher target explicitly', () => {
    const root = fixture()
    expect(translationLinkLocaleViolations(
      '# Guía\n\n[English](guide.md) | Español\n',
      linkContext(root, 'docs/guide.es.md'),
      ['guide.md'],
    )).toEqual([])
  })

  it('does not exempt an ordinary body link to the counterpart', () => {
    const root = fixture()
    const markdown = '# Guía\n\n[English](guide.md) | Español\n\n[Cuerpo](guide.md)\n'
    expect(translationLinkLocaleViolations(
      markdown,
      linkContext(root, 'docs/guide.es.md'),
      ['guide.md'],
    )).toEqual([{
      sourcePath: 'docs/guide.es.md',
      line: 5,
      url: 'guide.md',
      expectedUrl: 'guide.es.md',
    }])
    expect(rewriteTranslationLinkLocales(
      markdown,
      linkContext(root, 'docs/guide.es.md'),
      ['guide.md'],
    ).content).toBe('# Guía\n\n[English](guide.md) | Español\n\n[Cuerpo](guide.es.md)\n')
  })

  it('uses the selected content plane for target existence without deriving scope from siblings', () => {
    const root = fixture()
    const staged = new Set(['docs/reference.md', 'docs/reference.es.md'])
    expect(translationLinkLocaleViolations(
      '[Resumen](reference.md)\n',
      linkContext(root, 'docs/guide.es.md', path => staged.has(path)),
    )).toHaveLength(1)
    staged.delete('docs/reference.es.md')
    expect(translationLinkLocaleViolations(
      '[Resumen](reference.md)\n',
      linkContext(root, 'docs/guide.es.md', path => staged.has(path)),
    )).toHaveLength(1)
    staged.delete('docs/reference.md')
    expect(translationLinkLocaleViolations(
      '[Resumen](reference.md)\n',
      linkContext(root, 'docs/guide.es.md', path => staged.has(path)),
    )).toEqual([])
  })
})

describe('translation link rewriting and normalization', () => {
  it('rewrites only the destination while preserving the suffix and title', () => {
    const root = fixture()
    const input = '[Resumen](reference.md?view=full&amp;mode=all#overview "reference.md title")\n'
    expect(rewriteTranslationLinkLocales(
      input,
      linkContext(root, 'docs/guide.es.md'),
    )).toEqual({
      content: '[Resumen](reference.es.md?view=full&amp;mode=all#overview "reference.md title")\n',
      rewritten: 1,
    })
  })

  it('rewrites link definitions without changing their labels', () => {
    const root = fixture()
    expect(rewriteTranslationLinkLocales(
      '[Resumen][ref]\n\n[ref]: <reference.md#overview> "title"\n',
      linkContext(root, 'docs/guide.es.md'),
    ).content).toBe('[Resumen][ref]\n\n[ref]: <reference.es.md#overview> "title"\n')
  })

  it('uses only the first duplicate reference definition', () => {
    const root = fixture()
    expect(translationLinkLocaleViolations(
      '[Resumen][ref]\n\n[ref]: reference.es.md\n[ref]: reference.md\n',
      linkContext(root, 'docs/guide.es.md'),
    )).toEqual([])
  })

  it('does not treat an image-only definition as a document link', () => {
    const root = fixture()
    const input = '![preview][asset]\n\n[asset]: reference.es.md#overview\n'
    expectUnchangedLinkInput(root, input)
  })

  it.each([
    '<https://example.com/reference.md>\n',
    'https://example.com/reference.md\n',
  ])('leaves GFM autolink source unchanged: %s', (input) => {
    const root = fixture()
    expectUnchangedLinkInput(root, input)
  })

  it('normalizes only paired locale paths and retains other bytes', () => {
    const root = fixture()
    const english = '[Reference](reference.md#overview) [Outside](../packages/outside.md)\n'
    const spanish = '[Reference](reference.es.md#overview) [Outside](../packages/outside.md)\n'
    expect(normalizeTranslationMarkdownLinks(
      english,
      linkContext(root, 'docs/guide.md'),
    )).toBe(normalizeTranslationMarkdownLinks(
      spanish,
      linkContext(root, 'docs/guide.es.md'),
    ))
  })

  it('retains authored query bytes during normalization', () => {
    const root = fixture()
    const escaped = '[Reference](reference.md?x=1&amp;y=2#overview)\n'
    const literal = '[Reference](reference.es.md?x=1&y=2#overview)\n'
    expect(normalizeTranslationMarkdownLinks(
      escaped,
      linkContext(root, 'docs/guide.md'),
    )).not.toBe(normalizeTranslationMarkdownLinks(
      literal,
      linkContext(root, 'docs/guide.es.md'),
    ))
  })
})
