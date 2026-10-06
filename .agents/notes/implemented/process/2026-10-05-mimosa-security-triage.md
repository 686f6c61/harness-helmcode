# Triage del escaneo Mimosa (2026-10-05)

Registro de clasificación del escaneo de seguridad Mimosa sobre este repositorio
(profundidad `deep`, histórico `scan-2026-10-05T06-41-35.469Z-d3e5f36b55df`,
proyecto `project-d2e32b4fd2a97fce9807a116`). El escaneo terminó con fases
parciales (`scanner_enobufs`): la completitud es inconclusa, así que este
documento clasifica lo hallado, no certifica ausencia de vulnerabilidades.

## Cifras globales

738 hallazgos estáticos: 351 `high` y 387 `medium`. Por clase declarada:
627 `other-security` (la mayoría bajo el título genérico «疑似跨文件污点»,
sospecha de taint multi-fichero), 41 `command-injection`, 40
`hardcoded-credential`, 23 `code-injection`, 6 `ssrf`, 1 `xxe`.

## Distribución por ubicación

| Cubeta | Hallazgos | Lectura |
| --- | --- | --- |
| Bundles construidos (`lib/`, `dist/`) | 533 | Duplicados compilados del código fuente o artefactos vendor; el scanner recorre `src/` y su salida `lib/` (p. ej. `inspector` session.ts: 9 en src y 9 en lib). No se auditan por separado. |
| Scripts de build/CI (`scripts/`, `apps/*/scripts/`) | 155 | Herramientas de desarrollo y empaquetado (electron, code-signing, benchmarks); invocan comandos por diseño. |
| `src/` | 50 | Clasificados abajo uno a uno. |

## Clasificación de los 50 hallazgos en `src/`

- **Función del producto (heredados del upstream DeepSeek Harness):** los
  `code-injection` en evaluadores y loaders (`cordis-client-runner/evaluator.ts`,
  `cordis-host-runner/sandbox.ts`, `webworker-runtime/module-loader.ts`,
  `web-app/index.ts`) reflejan que el harness ejecuta código generado por el
  LLM: es su razón de ser, dentro de los sandboxes del producto. Los
  `command-injection` en `sandbox-local`, `subprocess-local/process-inspector.ts`,
  `webworker-runtime` (transform, child_process), `lazy-require`, `flock` y
  `command-manager-entry` son los ejecutores del shell tool. Los `ssrf` en
  `web-document.ts`, `file-upload` y las sesiones CDP del `inspector` son
  peticiones de red solicitadas por el modelo/usuario, no superficies de
  confianza.
- **Falsos positivos de credenciales (7 en src):** identificadores que contienen
  `apiKey`/`password` en cadenas de i18n y nombres de canal IPC
  (`onboardingApiKey`, `welcomeApiKey`, `saveApiKey`, locales de web-search y
  document-preview). No hay ninguna credencial material en el árbol fuente; la
  única clave sensible del proyecto vive exclusivamente como secret de GitHub
  (`NAN_BUILDERS_API_KEY`) y nunca en ficheros.
- **Taint heurístico multi-fichero (13 en src):** «疑似跨文件污点» sobre el host
  IPC de escritorio y las sesiones CDP; el scanner marca flujos, no vulnerabilidades
  concretas. Sin prueba de explotación tras revisión manual del muestreo.

## Hallazgos en ficheros modificados por el fork

El fork toca 327 ficheros TypeScript de producto desde el punto de bifurcación
(`639ed01539`). 24 hallazgos caen en ficheros tocados, revisados uno a uno:
locales i18n renombrados, scripts de empaquetado (`dev.ts`, `package-target.ts`,
`package-installed-update.ts`, `test-workspace-updates.ts`) y el taint
heurístico de `desktop-host/src/index.ts`. Los cambios del fork en esos ficheros
fueron renombres, retirada de telemetría y cadenas de UI: **ningún hallazgo
corresponde a código nuevo introducido por el fork**. La ruta NaN
(`api.nan.builders`, dialecto OpenAI-completions) no aparece en ningún hallazgo.

## Limpieza previa

La sonda temporal `SPILLPROBE` usada durante la investigación de spill se
retiró de `src/` antes del escaneo final; el histórico de hallazgos no contiene
ninguna mención (`SPILLPROBE findings: 0`).

## Conclusión y seguimiento

- Sin vulnerabilidades reales identificadas en el triage de los 738 hallazgos:
  son heurísticas de taint genéricas aplicadas a un harness de agentes cuya
  función declarada es ejecutar código, comandos y peticiones dirigidos por el
  LLM, más duplicados en bundles y falsos positivos de credenciales.
- Pendiente no bloqueante: re-ejecutar Mimosa con completitud total (las fases
  parciales `scanner_enobufs` impiden afirmar cobertura exhaustiva) cuando el
  entorno lo permita, y comparar contra este histórico como línea base.
