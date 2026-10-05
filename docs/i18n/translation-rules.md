# Translation rules

English | [Español](translation-rules.es.md)

How to translate between the two sides of a documentation pair in this repo. Both languages carry equal authority ([README.md](README.md)): a change is authored in either language, and that side is the source for that update — these rules govern producing or updating the counterpart. They bind humans and agents equally. Routine agent work translates the changed content directly in one terminology-guided pass; the extended [.agents/skills/dsh-translate-docs](../../.agents/skills/dsh-translate-docs/SKILL.md) workflow runs only when the user explicitly invokes it. Rule levels follow RFC 2119 usage: **MUST** / **MUST NOT** are gate- or review-blocking; **SHOULD** needs a stated reason to deviate; **MAY** is discretionary.

## Faithfulness

- The counterpart *MUST* say what the authored side says — no added behavior, prerequisites, warnings, version claims, or examples, and no dropped ones. If the pair disagrees on substance, neither language wins by default: fix the side that is wrong, then bring the other along in the same change.
- The counterpart *SHOULD* read as natural technical writing in its own language, not word-by-word gloss. Translate meaning, restructure sentences where the target grammar wants it, and keep the author's register — terse stays terse.
- Do not translate the untranslatable: if a sentence resists natural rendering because it leans on an idiom of the source language, translate the idea, not the idiom.

## Voice

- The register is calibrated by [style-samples.md](style-samples.md) — human-approved gold pairs, one per document genre. The counterpart MUST match the target-language side of the nearest sample; where its voice and a prose voice rule disagree, the sample wins. Spanish targets use neutral institutional technical Spanish; English targets use concise professional developer prose.
- Write as a native technical author restating the content, not as a translator transposing sentences, while preserving every source clause: nothing added, nothing dropped — fluency never justifies losing a clause.
- Give sentences an explicit actor when the target language would otherwise obscure it; for Spanish, replace vague passives or abstract subjects with the actual actor (el sistema, la puerta, el revisor) or use the natural reflexive passive.
- Prefer established target-language engineering idiom over calques (falso positivo/negativo for false positive/negative, línea roja de aplicación for enforcement frontier); localize metaphors instead of transplanting them, and unpack noun chains where the target language requires it.
- Split long paragraphs by semantic unit — one idea per paragraph. Paragraph boundaries MAY differ from the source; the structural signature does not count paragraphs.
- When translating into Spanish, category nouns use Spanish with a first-mention English annotation when the English name is canonical in this repo (manual de referencia (cookbook)); when translating into English, use the conventional English category name. Literal directory or file references stay code-formatted English.

## Structure preservation

The pairing gate checks heading depths, fenced code blocks, table row and column counts, list kinds, ordered-list starts, list item counts, link locale, and semantic targets. Preserve the rest of the frame manually; the paired files MUST match one to one in:

- heading hierarchy (same levels, same order — heading TEXT is translated),
- list shape and numbering,
- tables (same columns, same row order; header cells translated per terminology),
- fenced code blocks — **byte-identical, including comments**; the pairing signature compares their info strings and contents, and ` ```ts ` blocks compile under `doc-typecheck`,
- inline code spans (commands, flags, config keys, file paths, event names, API names, version numbers) — verbatim, never translated or reformatted,
- links and anchors: every relative document link MUST keep the same semantic target and exact query/fragment suffix. When the target belongs to the active bilingual corpus, the English side uses its `.md` path and the Spanish side uses its `.es.md` path; a missing counterpart in that corpus is an error, while targets outside it keep the original path. External URLs, images, and pure in-page fragments stay unchanged. The language switcher remains the explicit cross-locale exception, and a README rendered outside GitHub MAY use the canonical public repository URL to its exact counterpart as documented in [README.md](README.md). Link TEXT is translated.

The repo's Markdown conventions apply to `.es.md` files unchanged: one physical line per paragraph (`verify-md-wrap`), resolving relative links (`verify-md-links`), exactly one trailing newline.

## Terminology

- [terminology.md](terminology.md) is the source of truth in both directions. Before translating, load it; every listed term MUST follow its row and its "No traducir como" prohibitions. A Spanish target uses the "Español" column and its "Primera aparición" annotation; an English target uses the "English" column without adding a Spanish gloss.
- For a Spanish target, an unlisted technical term MAY use an established rendering from a major Spanish-language OSS or vendor source (Kubernetes Spanish localization, MDN Spanish docs, the Microsoft Spanish style guide, big-tech project docs), cited in the PR. Without such precedent it MUST stay in English and be listed under «términos pendientes» (pending terms) with a suggested rendering.
- For an English target, use the established English technical term. If the source term has no unambiguous established equivalent, preserve it with a short explanatory gloss and list it under pending terms. Neither direction may invent a rendering inline; a decided term enters [terminology.md](terminology.md) in the same PR or a follow-up.

## Typography

These rules govern the Spanish side; the English side follows the repo's normal Markdown conventions (root `AGENTS.md`). The orthographic rules below follow the [RAE](https://www.rae.es/) orthography, the [Kubernetes Spanish localization guide](https://kubernetes.io/es/docs/contribute/localization/), the [Vue.js docs-es translation conventions](https://github.com/vuejs-translations/docs-es), and the [Microsoft Spanish style guide](https://learn.microsoft.com/en-us/globalization/reference/microsoft-style-guides):

- MUST open questions and exclamations with the inverted marks `¿` and `¡` and close them with `?` and `!` — `¿Qué registra el plugin?`. Never drop the opening mark.
- MUST write accents per RAE orthography, including on capital letters: `Configuración`, never `Configuracion`; `informática` terms keep their tildes wherever the RAE requires them.
- Spanish uses ordinary half-width punctuation and normal spacing. Unlike CJK targets, no special spacing rules apply around Latin words, code spans, or numerals: `cada plugin registra 3 tools`.
- Spanish prose *SHOULD* prefer colons, periods, commas, or parentheses over em dashes. Keep an em dash (—) only when no other punctuation preserves the sentence naturally.
- Proper nouns keep their canonical casing: GitHub, TypeScript, DeepSeek — never `github`/`Github` unless quoting code.
- The register is formal-neutral; address the reader as `tú` when a direct address is needed, never `usted`, and prefer infinitive or impersonal instructions (instalar, ejecutar) in procedures and UI-style text (matches the Vue and Kubernetes Spanish conventions and this repo's direct voice).
- Emphasis markers (`**bold**`, `*italic*`) stay on the same spans as the source; Spanish uses italics sparingly in technical prose — do not substitute quotation marks or other decoration, and do not add emphasis the source does not carry.
- Quotation marks in Spanish prose are « » or " "; code spans and verbatim English text keep their original marks.

## Quality bar

- A pair is done when a bilingual engineer reading either file alone gets everything a reader of the other gets — same facts, same caveats, same tone — and nothing extra.
- Run `pnpm run verify-translation-pairing` and the rest of `doc-sync` for records, switchers, heading depths, code blocks, table row and column counts, list kinds, ordered-list starts, list item counts, links, and repository Markdown rules. Human review owns list and table order, noncanonical list numbering, inline code, emphasis, meaning, terminology, and tone.

## References

Authorities cited by these rules, for humans and agents who want the underlying reasoning:

- [RAE — Diccionario de la lengua española y Ortografía](https://www.rae.es/) — the formal orthographic baseline: accentuation, punctuation, and the inverted marks.
- [Kubernetes Spanish localization guide](https://kubernetes.io/es/docs/contribute/localization/) — terminology and register practice from a large Spanish localization team.
- [Vue.js docs-es translations](https://github.com/vuejs-translations/docs-es) — per-term translate/keep decisions and tone in a developer-docs project of the same shape as this one.
- [Microsoft Spanish style guide](https://learn.microsoft.com/en-us/globalization/reference/microsoft-style-guides) — the vendor-localization baseline for software Spanish.
- [FundéuRAE](https://www.fundeu.es/) — recommendations for Spanish in technical and journalistic writing, including anglicism policy (when to keep an English term and how to gloss it).
