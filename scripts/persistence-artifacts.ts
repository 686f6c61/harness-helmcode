/** Render complete persistence documentation pairs without Git or file mutation. */

import { readFileSync } from 'node:fs'
import { hasLanguageSwitcher } from './translation-links.ts'
import {
  computeTranslationPairingRecord, renderTranslationPairingRecord, translationPairPaths,
} from './translation-pairing-record.ts'
import {
  languageSwitcherTargets, parseTranslationMarkdown, parseTranslationPairingManifest,
  requiresSourceLanguageSwitcher, translationPairSourcePredicate,
  translationStructureDiff, translationStructureSignature,
} from './translation-pairing.ts'

const isTranslationPairSource = translationPairSourcePredicate(parseTranslationPairingManifest(
  readFileSync(new URL('./translation-pairing.manifest.json', import.meta.url), 'utf8'),
))

/** One repository-relative generated file and its complete UTF-8 content. */
export interface PersistenceArtifact {
  readonly path: string
  readonly content: string
}

/**
 * Check a pair's code, structure and localized links, then render its three files.
 * Link existence remains the Markdown gate's responsibility.
 * @param root - checkout root used to resolve relative link identities.
 * @param source - repository-relative English document path.
 * @param en - complete authored or generated English Markdown.
 * @param es - complete authored or generated Spanish Markdown.
 * @returns the documents and their matching consistency sidecar, without writing files.
 */
export function renderPersistencePair(root: string, source: string, en: string, es: string): PersistenceArtifact[] {
  const paths = translationPairPaths(source)
  const sourceTree = parseTranslationMarkdown(en)
  const esTree = parseTranslationMarkdown(es)
  const sourceTargets = languageSwitcherTargets(paths.source)
  const esTargets = languageSwitcherTargets(paths.es)
  if (!hasLanguageSwitcher(esTree, es, sourceTargets)
    || requiresSourceLanguageSwitcher(source) && !hasLanguageSwitcher(sourceTree, en, esTargets)) {
    throw new Error(`${source}: both authored languages need their counterpart switcher`)
  }
  const context = { repoRoot: root, isTranslationPairSource, repositoryFileExists: () => true }
  const errors = translationStructureDiff(
    translationStructureSignature(sourceTree, esTargets, { ...context, sourcePath: paths.source, markdown: en }),
    translationStructureSignature(esTree, sourceTargets, { ...context, sourcePath: paths.es, markdown: es }),
  )
  if (errors.length > 0) throw new Error(`${source}: bilingual structure mismatch: ${errors.join('; ')}`)
  return [
    { path: paths.source, content: en },
    { path: paths.es, content: es },
    { path: paths.meta, content: renderTranslationPairingRecord(paths, computeTranslationPairingRecord(paths, en, es, context)) },
  ]
}
