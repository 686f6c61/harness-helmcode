/**
 * Canonical publication manifest for the documentation website.
 *
 * Markdown stays in its owning repository tier. This manifest maps each
 * canonical source into matching route trees for both site locales; when a
 * translation is absent, both routes intentionally project the available
 * source instead of copying Markdown.
 */

/** Locale key used by the VitePress site. */
export type DocsLocale = 'root' | 'en'

/** Sidebar collection rendered for one locale and top-level module. */
export type DocsSidebar =
  | 'es-guide'
  | 'es-develop'
  | 'es-reference'
  | 'en-guide'
  | 'en-develop'
  | 'en-reference'

/** A page projected into the VitePress source tree. */
export interface DocsPage {
  /** VitePress locale whose route tree owns this projection. */
  locale: DocsLocale
  /** Language of the canonical source currently projected at this route. */
  contentLocale: 'es' | 'en-US'
  /** Repository-relative canonical Markdown source. */
  source: string
  /** VitePress route, including the `.md` suffix. */
  route: string
  /** Navigation label shown in the sidebar. */
  label: string
  /** Sidebar collection that owns the page, or null for a locale home page. */
  sidebar: DocsSidebar | null
  /** Section label within the sidebar. */
  section: string
  /** Stable order within the section. */
  order: number
  /** Heading levels included in this page's VitePress outline. */
  outline?: number | readonly [number, number] | 'deep' | false
  /** Additional repository paths that resolve to this page. */
  sourceAliases?: string[]
}

interface MirroredPage {
  source: string | Record<DocsLocale, string>
  route: string
  contentLocale: DocsPage['contentLocale'] | Record<DocsLocale, DocsPage['contentLocale']>
  label: Record<DocsLocale, string>
  sidebar: Record<DocsLocale, DocsSidebar | null>
  section: Record<DocsLocale, string>
  order: number
  outline?: DocsPage['outline']
  sourceAliases?: string[] | Partial<Record<DocsLocale, string[]>>
}

type PairedPage = Omit<MirroredPage, 'source' | 'contentLocale' | 'sourceAliases'> & {
  /** English side of a sibling `foo.md` / `foo.es.md` pair. */
  source: string
  /** Language-neutral repository aliases, such as the directory of an index page. */
  sourceAliases?: string[]
}

function localized<T>(value: T | Record<DocsLocale, T>, locale: DocsLocale): T {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<DocsLocale, T>)[locale]
    : value
}

function mirroredPages(pages: MirroredPage[]): DocsPage[] {
  return pages.flatMap(page => (['root', 'en'] as const).map((locale) => {
    const aliases = page.sourceAliases === undefined
      ? undefined
      : Array.isArray(page.sourceAliases) ? page.sourceAliases : page.sourceAliases[locale]
    return {
      locale,
      contentLocale: localized(page.contentLocale, locale),
      source: localized(page.source, locale),
      route: locale === 'root' ? page.route : `en/${page.route}`,
      label: page.label[locale],
      sidebar: page.sidebar[locale],
      section: page.section[locale],
      order: page.order,
      ...(page.outline === undefined ? {} : { outline: page.outline }),
      ...(aliases === undefined ? {} : { sourceAliases: aliases }),
    }
  }))
}

function pairedPages(pages: PairedPage[]): DocsPage[] {
  return mirroredPages(pages.map((page) => {
    const spanishSource = page.source.replace(/\.md$/, '.es.md')
    const sharedAliases = page.sourceAliases ?? []
    return {
      ...page,
      source: { root: spanishSource, en: page.source },
      contentLocale: { root: 'es', en: 'en-US' },
      sourceAliases: {
        root: [...sharedAliases, page.source],
        en: [...sharedAliases, spanishSource],
      },
    }
  }))
}

const homeAndGuide = pairedPages([
  {
    source: 'docs/user/index.md',
    route: 'index.md',
    label: { root: 'NaN Harness', en: 'NaN Harness' },
    sidebar: { root: null, en: null },
    section: { root: 'Inicio', en: 'Home' },
    order: 0,
  },
  {
    source: 'docs/user/guide/index.md',
    route: 'guide/quickstart.md',
    label: { root: 'Usar la Web UI', en: 'Use the Web UI' },
    sidebar: { root: 'es-guide', en: 'en-guide' },
    section: { root: 'Guía', en: 'Guide' },
    order: 1,
    sourceAliases: ['docs/user/guide'],
  },
  {
    source: 'docs/user/guide/providers.md',
    route: 'guide/providers.md',
    label: { root: 'Configurar modelos', en: 'Configure models' },
    sidebar: { root: 'es-guide', en: 'en-guide' },
    section: { root: 'Guía', en: 'Guide' },
    order: 2,
  },
  {
    source: 'docs/user/guide/network-proxy.md',
    route: 'guide/network-proxy.md',
    label: { root: 'Proxy de red', en: 'Network proxy' },
    sidebar: { root: 'es-guide', en: 'en-guide' },
    section: { root: 'Guía', en: 'Guide' },
    order: 3,
  },
  {
    source: 'docs/user/guide/python-sdk.md',
    route: 'guide/python-sdk.md',
    label: { root: 'Python', en: 'Python' },
    sidebar: { root: 'es-guide', en: 'en-guide' },
    section: { root: 'SDK', en: 'SDK' },
    order: 1,
  },
  {
    source: 'docs/user/guide/github-review.md',
    route: 'guide/github-review.md',
    label: { root: 'Sesiones de revisión de GitHub', en: 'GitHub review sessions' },
    sidebar: { root: 'es-guide', en: 'en-guide' },
    section: { root: 'Automatización', en: 'Automation' },
    order: 1,
  },
  {
    source: 'docs/user/guide/schedule.md',
    route: 'guide/schedule.md',
    label: { root: 'Recordatorios en sesión', en: 'Session reminders' },
    sidebar: { root: 'es-guide', en: 'en-guide' },
    section: { root: 'Automatización', en: 'Automation' },
    order: 2,
  },
  {
    source: 'docs/user/guide/mcp-memory.md',
    route: 'guide/mcp-memory.md',
    label: { root: 'MCP de memoria', en: 'Memory MCP' },
    sidebar: { root: 'es-guide', en: 'en-guide' },
    section: { root: 'Integraciones', en: 'Integrations' },
    order: 1,
  },
])

const develop = pairedPages([
  {
    source: 'docs/user/develop/basic/index.md',
    route: 'develop/basic/index.md',
    label: { root: 'Tu primer plugin de Harness', en: 'Your first Harness plugin' },
    sidebar: { root: 'es-develop', en: 'en-develop' },
    section: { root: 'Fundamentos', en: 'Basics' },
    order: 1,
    sourceAliases: ['docs/user/develop/basic'],
  },
  {
    source: 'docs/user/develop/basic/tool.md',
    route: 'develop/basic/tool.md',
    label: { root: 'Construir un tool', en: 'Build a tool' },
    sidebar: { root: 'es-develop', en: 'en-develop' },
    section: { root: 'Fundamentos', en: 'Basics' },
    order: 2,
  },
  {
    source: 'docs/user/develop/basic/config.md',
    route: 'develop/basic/config.md',
    label: { root: 'Configuración de plugins', en: 'Plugin configuration' },
    sidebar: { root: 'es-develop', en: 'en-develop' },
    section: { root: 'Fundamentos', en: 'Basics' },
    order: 3,
  },
  {
    source: 'docs/user/develop/basic/publish.md',
    route: 'develop/basic/publish.md',
    label: { root: 'Empaquetar e instalar', en: 'Package and install' },
    sidebar: { root: 'es-develop', en: 'en-develop' },
    section: { root: 'Fundamentos', en: 'Basics' },
    order: 4,
  },
  {
    source: 'docs/user/develop/framework/index.md',
    route: 'develop/framework/index.md',
    label: { root: 'Ciclo de vida de plugins', en: 'Plugin lifecycle' },
    sidebar: { root: 'es-develop', en: 'en-develop' },
    section: { root: 'Framework', en: 'Framework' },
    order: 1,
    sourceAliases: ['docs/user/develop/framework'],
  },
  {
    source: 'docs/user/develop/framework/service.md',
    route: 'develop/framework/service.md',
    label: { root: 'Servicios y dependencias', en: 'Services and dependencies' },
    sidebar: { root: 'es-develop', en: 'en-develop' },
    section: { root: 'Framework', en: 'Framework' },
    order: 2,
  },
  {
    source: 'docs/user/develop/framework/events.md',
    route: 'develop/framework/events.md',
    label: { root: 'Sistema de eventos', en: 'Event system' },
    sidebar: { root: 'es-develop', en: 'en-develop' },
    section: { root: 'Framework', en: 'Framework' },
    order: 3,
  },
  {
    source: 'docs/user/develop/practice/index.md',
    route: 'develop/practice/index.md',
    label: { root: 'Capas de capacidad', en: 'Capability layering' },
    sidebar: { root: 'es-develop', en: 'en-develop' },
    section: { root: 'Práctica', en: 'Practice' },
    order: 1,
    sourceAliases: ['docs/user/develop/practice'],
  },
  {
    source: 'docs/user/develop/practice/llm-adapter.md',
    route: 'develop/practice/llm-adapter.md',
    label: { root: 'Adaptador de LLM', en: 'LLM adapter' },
    sidebar: { root: 'es-develop', en: 'en-develop' },
    section: { root: 'Práctica', en: 'Practice' },
    order: 2,
  },
  {
    source: 'docs/user/develop/practice/dynamic-cordis.md',
    route: 'develop/practice/dynamic-cordis.md',
    label: { root: 'Plugins de Harness persistentes', en: 'Persistent Harness plugins' },
    sidebar: { root: 'es-develop', en: 'en-develop' },
    section: { root: 'Práctica', en: 'Practice' },
    order: 3,
  },
])

const cordisTutorial = pairedPages(([
  ['index.md', 'Visión general', 'Overview'],
  ['01-first-plugin.md', '1. Tu primer plugin', '1. Your first plugin'],
  ['02-lifecycle-and-effects.md', '2. Ciclo de vida y efectos', '2. Lifecycle and effects'],
  ['03-services.md', '3. Servicios', '3. Services'],
  ['04-events.md', '4. Eventos', '4. Events'],
  ['05-config.md', '5. Configuración', '5. Configuration'],
  ['06-composition-and-hmr.md', '6. Composición y HMR', '6. Composition and HMR'],
  ['07-into-the-harness.md', '7. Dentro del harness', '7. Into the harness'],
] as const).map(([file, rootLabel, enLabel], order): PairedPage => ({
  source: `docs/cordis-tutorial/${file}`,
  route: `develop/cordis-tutorial/${file}`,
  label: { root: rootLabel, en: enLabel },
  sidebar: { root: 'es-develop', en: 'en-develop' },
  section: { root: 'Tutorial del framework Cordis', en: 'Cordis framework tutorial' },
  order,
  ...(file === 'index.md' ? { sourceAliases: ['docs/cordis-tutorial'] } : {}),
})))

const cordisPrimerReference = pairedPages([
  {
    source: 'docs/cordis-primer.md',
    route: 'reference/cordis-primer.md',
    label: { root: 'Introducción a Cordis', en: 'Cordis primer' },
    sidebar: { root: 'es-reference', en: 'en-reference' },
    section: { root: 'Conceptos', en: 'Concepts' },
    order: 1,
  },
])

/**
 * Subsystem pages grouped by the concern they document, as `[Spanish section,
 * English section, pages]`. One flat list of every subsystem pushed the rest of
 * the reference sidebar below the fold.
 */
const subsystemGroups = [
  ['Visión general', 'Overview', [
    ['README.md', 'Subsistemas', 'Subsystems'],
  ]],
  ['Núcleo y ámbitos', 'Core and scopes', [
    ['core.md', 'Núcleo', 'Core'],
    ['scope.md', 'Ámbitos', 'Scopes'],
    ['invariants.md', 'Invariantes de runtime', 'Runtime invariants'],
  ]],
  ['Sesiones y persistencia', 'Sessions and persistence', [
    ['session.md', 'Sesiones', 'Sessions'],
    ['session-query.md', 'Consulta de sesiones', 'Session query'],
    ['session-reference.md', 'Referencias de sesión', 'Session references'],
    ['session-title.md', 'Títulos de sesión', 'Session titles'],
    ['session-projection.md', 'Proyecciones de sesión', 'Session projections'],
    ['persistence.md', 'Persistencia de sesiones', 'Session persistence'],
    ['spill.md', 'Almacenamiento spill', 'Spill storage'],
    ['session-telemetry.md', 'Telemetría', 'SessionTelemetryBackend'],
  ]],
  ['Modelo y contexto', 'Model and context', [
    ['llm-streaming.md', 'Streaming de LLM', 'LLM streaming'],
    ['token-meter.md', 'Medición de tokens', 'Token metering'],
    ['system-prompt.md', 'Prompts del sistema', 'System prompts'],
    ['compaction.md', 'Compactación de contexto', 'Compaction'],
  ]],
  ['Ejecución y tools', 'Execution and tools', [
    ['tools.md', 'Tools', 'Tools'],
    ['shell.md', 'Ejecución de Bash', 'Bash execution'],
    ['subprocess.md', 'Subprocesos', 'Subprocesses'],
    ['terminal.md', 'Sesiones PTY', 'PTY sessions'],
    ['jobs.md', 'Tareas en segundo plano', 'Background jobs'],
    ['filesystem.md', 'Sistema de archivos', 'Filesystem'],
    ['lsp.md', 'Navegación LSP', 'LSP navigation'],
    ['ptc-runtime.md', 'Runtime de PTC', 'PTC runtime'],
    ['web.md', 'Acceso web', 'Web access'],
    ['skills.md', 'Skills', 'Skills'],
    ['workflow.md', 'Workflows', 'Workflows'],
    ['subagent.md', 'Subagents', 'Subagents'],
  ]],
  ['Política e interacción', 'Policy and interaction', [
    ['approval.md', 'Aprobaciones', 'Approvals'],
    ['permission-presets.md', 'Presets de permisos', 'Permission presets'],
    ['sandbox.md', 'Sandbox', 'Sandboxing'],
    ['plan.md', 'Modo plan', 'Plan mode'],
    ['user-questions.md', 'Interacción con el usuario', 'User interaction'],
    ['commands.md', 'Comandos humanos', 'Human commands'],
    ['goal.md', 'Goals', 'Goals'],
    ['schedule.md', 'Recordatorios programados', 'Scheduled reminders'],
  ]],
  ['Plataforma y acceso', 'Platform and access', [
    ['web-server.md', 'Servidor HTTP', 'HTTP server'],
    ['web-client.md', 'Arquitectura del Web Client', 'Web Client architecture'],
    ['client-modules.md', 'Módulos de cliente', 'Client modules'],
    ['slots.md', 'Slots de cliente', 'Client slots'],
    ['client-resources.md', 'Recursos de cliente', 'Client resources'],
    ['sidebar-right.md', 'Sidebar derecha', 'Right Sidebar'],
    ['conversation.md', 'Ensamblado de Conversation', 'Conversation assembly'],
    ['typert.md', 'Typert', 'Typert'],
    ['storage.md', 'Almacenamiento', 'Storage'],
    ['workspace.md', 'Espacios de trabajo', 'Workspaces'],
    ['settings.md', 'Ajustes de usuario', 'User settings'],
    ['credentials.md', 'Credenciales de usuario', 'User credentials'],
  ]],
] as const

const subsystemsReference = subsystemGroups.flatMap(([rootSection, enSection, files]) => pairedPages(
  files.map(([file, rootLabel, enLabel], order): PairedPage => ({
    source: `docs/subsystems/${file}`,
    route: file === 'README.md' ? 'reference/subsystems/index.md' : `reference/subsystems/${file}`,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: 'es-reference', en: 'en-reference' },
    section: { root: rootSection, en: enSection },
    order,
    // Subsystem pages carry long third-level sections a two-level outline reaches.
    outline: [2, 3],
    ...(file === 'README.md' ? { sourceAliases: ['docs/subsystems'] } : {}),
  })),
))

const reference = [
  // `docs/deepseek-llm-api-wire-extensions.md` is a repository-only provider protocol reference.
  // Projected links intentionally resolve to its GitHub source instead of a public site route.
  ...pairedPages(([
    ['docs/architecture.md', 'reference/index.md', 'Arquitectura', 'Architecture', 0],
  ] as const).map(([source, route, rootLabel, enLabel, order]): PairedPage => ({
    source,
    route,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: 'es-reference', en: 'en-reference' },
    section: { root: 'Conceptos', en: 'Concepts' },
    order,
  }))),
  ...pairedPages(([
    ['docs/capability-seams.md', 'reference/capability-seams.md', 'Servicios de capacidad', 'Capability services', 2],
    ['docs/agent-lifecycle.md', 'reference/agent-lifecycle.md', 'Ciclo de vida del agent', 'Agent lifecycle', 3],
    ['docs/tool-execution-pipeline.md', 'reference/tool-execution-pipeline.md', 'Ejecución de tools', 'Tool execution', 4],
    ['docs/api-gateway.md', 'reference/api-gateway.md', 'API Gateway', 'API Gateway', 5],
  ] as const).map(([source, route, rootLabel, enLabel, order]): PairedPage => ({
    source,
    route,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: 'es-reference', en: 'en-reference' },
    section: { root: 'Conceptos', en: 'Concepts' },
    order,
  }))),
  ...pairedPages(([
    ['docs/config-catalog.md', 'reference/config-catalog.md', 'Configuración de plugins', 'Plugin configuration'],
    ['docs/tool-catalog.md', 'reference/tool-catalog.md', 'Tool Schema', 'Tool schemas'],
    ['docs/persistence-catalog.md', 'reference/persistence-catalog.md', 'Eventos de persistencia', 'Persistence events', 'deep'],
  ] as const).map(([source, route, rootLabel, enLabel, outline], order): PairedPage => ({
    source,
    route,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: 'es-reference', en: 'en-reference' },
    section: { root: 'Referencia generada', en: 'Generated reference' },
    order,
    ...(outline === undefined ? {} : { outline }),
  }))),
  ...pairedPages(([
    ['context.md', 'Context', 'Context'],
    ['events.md', 'Events', 'Events'],
    ['fiber.md', 'Fiber', 'Fiber'],
    ['registry.md', 'Plugin Registry', 'Plugin Registry'],
    ['service.md', 'Service', 'Service'],
  ] as const).map(([file, rootLabel, enLabel], order): PairedPage => ({
    source: `docs/cordis-api/${file}`,
    route: `reference/cordis-api/${file}`,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: 'es-reference', en: 'en-reference' },
    section: { root: 'Cordis API', en: 'Cordis Core API' },
    order,
  }))),
  ...mirroredPages(([
    ['inherited.md', 'Superficie heredada', 'Inherited surface'],
  ] as const).map(([file, rootLabel, enLabel], order): MirroredPage => ({
    source: `docs/cordis-api/${file}`,
    route: `reference/cordis-api/${file}`,
    contentLocale: 'en-US',
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: 'es-reference', en: 'en-reference' },
    section: { root: 'Cordis API', en: 'Cordis Core API' },
    order: order + 5,
  }))),
  ...pairedPages(([
    ['adding-a-package.md', 'Añadir un package', 'Adding a package'],
    ['adding-a-tool.md', 'Añadir un tool', 'Adding a tool'],
    ['adding-an-llm-adapter.md', 'Añadir un adaptador de LLM', 'Adding an LLM adapter'],
    ['adding-a-settings-card.md', 'Añadir una página de ajustes', 'Adding a settings page'],
    ['extension-cookbook.md', 'Patrones de extensión', 'Extension patterns'],
  ] as const).map(([file, rootLabel, enLabel], order): PairedPage => ({
    source: `docs/cookbook/${file}`,
    route: `reference/cookbook/${file}`,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: 'es-reference', en: 'en-reference' },
    section: { root: 'Manual de desarrollo', en: 'Cookbook' },
    order,
  }))),
]

/**
 * Sidebar collections of each locale, in the order the site's navigation
 * presents them. The navigation bar and the llms.txt index both read this
 * sequence, so a new collection lands in both surfaces together.
 */
export const localeCollections = {
  root: ['es-guide', 'es-develop', 'es-reference'],
  en: ['en-guide', 'en-develop', 'en-reference'],
} as const satisfies Record<DocsLocale, readonly DocsSidebar[]>

/** A sidebar group, matched to pages by `label`. */
export interface DocsSection {
  /** Group heading, equal to the `section` field of every page it holds. */
  label: string
  /** Render the group collapsed until it holds the page being read. */
  collapsed?: boolean
}

/**
 * Every sidebar group, in the order its locale renders it.
 *
 * The subsystem groups collapse because together they outnumber the rest of the
 * reference sidebar; expanded, they push every other group below the fold.
 */
const sections: Record<DocsLocale, readonly DocsSection[]> = {
  root: [
    { label: 'Guía' }, { label: 'SDK' }, { label: 'Automatización' }, { label: 'Integraciones' },
    { label: 'Fundamentos' }, { label: 'Framework' }, { label: 'Práctica' }, { label: 'Tutorial del framework Cordis' },
    { label: 'Conceptos' }, { label: 'Referencia generada' }, { label: 'Cordis API' }, { label: 'Manual de desarrollo' },
    { label: 'Visión general' },
    { label: 'Núcleo y ámbitos', collapsed: true },
    { label: 'Sesiones y persistencia', collapsed: true },
    { label: 'Modelo y contexto', collapsed: true },
    { label: 'Ejecución y tools', collapsed: true },
    { label: 'Política e interacción', collapsed: true },
    { label: 'Plataforma y acceso', collapsed: true },
  ],
  en: [
    { label: 'Guide' }, { label: 'SDK' }, { label: 'Automation' }, { label: 'Integrations' },
    { label: 'Basics' }, { label: 'Framework' }, { label: 'Practice' }, { label: 'Cordis framework tutorial' },
    { label: 'Concepts' }, { label: 'Generated reference' }, { label: 'Cordis Core API' }, { label: 'Cookbook' },
    { label: 'Overview' },
    { label: 'Core and scopes', collapsed: true },
    { label: 'Sessions and persistence', collapsed: true },
    { label: 'Model and context', collapsed: true },
    { label: 'Execution and tools', collapsed: true },
    { label: 'Policy and interaction', collapsed: true },
    { label: 'Platform and access', collapsed: true },
  ],
}

/**
 * Placement and collapse behavior of one sidebar group.
 *
 * @param locale - Route tree whose sidebar is being built.
 * @param label - Section label carried by the pages in the group.
 * @returns The declared group, plus its zero-based position in the locale.
 * @throws When the locale declares no placement for the label. Ranking by list
 *   membership alone would sort an undeclared group silently ahead of every
 *   declared one.
 */
export function sectionSpec(locale: DocsLocale, label: string): DocsSection & { index: number } {
  const declared = sections[locale]
  const section = declared.find(candidate => candidate.label === label)
  if (section === undefined) throw new Error(`Sidebar section "${label}" has no placement in the ${locale} locale.`)
  return { ...section, index: declared.indexOf(section) }
}

/** Every canonical page published by the documentation website. */
export const docsPages: DocsPage[] = [
  ...homeAndGuide,
  ...develop,
  ...cordisTutorial,
  ...cordisPrimerReference,
  ...subsystemsReference,
  ...reference,
]

/**
 * Pages of one sidebar collection, in the order the sidebar lists them.
 *
 * @param locale - Route tree whose sidebar is being built.
 * @param collection - Sidebar collection to read.
 * @returns The collection's pages, ordered by section placement then by `order`.
 */
export function orderedPages(locale: DocsLocale, collection: DocsSidebar): DocsPage[] {
  return docsPages
    .filter(page => page.locale === locale && page.sidebar === collection)
    .sort((left, right) => (
      sectionSpec(locale, left.section).index - sectionSpec(locale, right.section).index
      || left.order - right.order
    ))
}

/**
 * Site-relative link for a published route.
 *
 * @param route - Manifest route, including its `.md` suffix.
 * @returns The link VitePress serves the route at.
 */
export function routeLink(route: string): string {
  return `/${route.replace(/(?:index)?\.md$/, '')}`
}

/**
 * Where a top-level navigation item lands.
 *
 * The target is derived rather than written down: a collection whose first page
 * is renamed or reordered would otherwise leave the navigation bar pointing at
 * a route the manifest no longer publishes.
 *
 * @param locale - Route tree the navigation item belongs to.
 * @param collection - Sidebar collection the item opens.
 * @returns Site-relative link of the collection's first page.
 * @throws When the collection publishes no page.
 */
export function landingLink(locale: DocsLocale, collection: DocsSidebar): string {
  const first = orderedPages(locale, collection)[0]
  if (first === undefined) throw new Error(`Sidebar collection "${collection}" publishes no page.`)
  return routeLink(first.route)
}
