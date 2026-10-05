# Almacenamiento spill

[English](spill.md) | Español

El almacenamiento spill, un [capability seam](../../.agents/notes/implemented/architecture/2026-07-08-tool-output-spill-files.md), persiste texto proporcionado por el llamante y devuelve un localizador orientado al modelo con indicaciones de recuperación. Su Service Definition es [dsh-spill](../../packages/spill/spill) (`ctx.spillStore`) y su Service Provider local es [dsh-spill-local](../../packages/spill/spill-local). Entre los consumidores están la [política de resultados de tool](../../packages/spill/spill-policy) y las [referencias de sesión](../../packages/context/session-reference/README.md). El spill es opcional, no forma parte de la [espina dorsal del agent loop (bucle de agent)](core.es.md); los consumidores son responsables de las decisiones de previsualización y spill, mientras que el almacenamiento guarda el texto suministrado de forma literal.

Fuente: [`packages/spill/spill/src/types.ts`](../../packages/spill/spill/src/types.ts)

## La solicitud de guardado

`saveText` es la única operación del servicio: persiste `content` de forma literal y devuelve un localizador opaco, una pista de recuperación proporcionada por el backend y el número exacto de bytes. La solicitud lleva el espacio de nombres de almacenamiento en el momento del guardado (`owner`), datos descriptivos del productor (`source`, nunca control de acceso) y un `suggestedName` que el backend puede usar como pista de nombrado, no como ruta. Una fuente de tipo tool identifica la llamada a tool real; una fuente de tipo session-reference identifica la sesión de origen capturada, mientras que su owner es la sesión de destino que recibe el contexto.

```ts type-equiv
/** One request to persist text to a spill artifact. */
interface SaveTextSpill {
  owner: SpillOwner
  source: SpillSource
  /**
   * A caller-suggested base name (e.g. `web_fetch.txt`). The backend sanitizes
   * it to a single safe path segment before use — it is a hint, never a path.
   */
  suggestedName: string
  /** The full text to persist (UTF-8). */
  content: string
}
```

```ts type-equiv
/**
 * Save-time storage namespace for a spilled artifact. The session id lets a
 * backend group storage under the producing session, but the returned
 * {@link SpillLocator} is the model-facing handle. Forked sessions inherit
 * locators already present in the seeded log; those artifacts are not copied or
 * re-owned, and spills produced after the fork use the child session id.
 */
interface SpillOwner {
  sessionId: SessionId
}
```

Una limpieza por período de retención puede expirar localizadores antiguos junto con otros artefactos antiguos de la sesión; el seam spill no define una política de limpieza por sesión.

```ts type-equiv
/**
 * Producer of a spilled artifact. Tool results carry their model-issued call id;
 * session references identify the captured source session instead. Descriptive
 * source description only, never access control.
 */
type SpillSource = {
  kind: 'tool'
  /** The tool whose result was spilled (e.g. `web_fetch`). */
  toolName: string
  /** The model-issued call id the result belongs to. */
  callId: ToolCallId
  /** A short human label for the artifact (e.g. `result`). */
  label: string
} | {
  kind: 'session-reference'
  /** Session whose projected conversation was captured. */
  sessionId: SessionId
  /** Host-provided label for the referenced session. */
  label: string
}
```

## El resultado

```ts type-equiv
/** A saved spill artifact: its locator, byte length, and backend-specific retrieval guidance. */
interface SpillRef {
  locator: SpillLocator
  bytes: number
  retrievalHint: string
}
```

`SpillLocator` es un identificador [Branded](core.es.md#branded-ids) orientado al modelo que devuelve el backend. El backend local lo representa como una ruta del sistema de archivos; un backend remoto o de base de datos puede representarlo como una URI, una clave o un token de comando. Los consumidores lo tratan como opaco y lo presentan junto con `retrievalHint` en lugar de asumir que `read` es siempre el mecanismo de recuperación adecuado.

```ts type-equiv
/**
 * Opaque model-facing handle for one spilled artifact. A local backend may use a
 * filesystem path; a remote or database backend may use a URI or key. Consumers
 * render it with {@link SpillRef.retrievalHint}, but do not parse it.
 */
type SpillLocator = Branded<'SpillLocator'>
```

## El servicio

`SpillStore` (`ctx.spillStore`, definido en [`packages/spill/spill/src/index.ts`](../../packages/spill/spill/src/index.ts)) es un servicio abstracto de un solo método: `saveText(input) → Promise<SpillRef>`. Persiste el `content` COMPLETO y RECHAZA ante un fallo real de almacenamiento (permisos, ENOSPC, backend no disponible). El seam solo posee el almacenamiento: sin política de retención, sin reemplazo de resultados de tool, sin API de recuperación ni de búsqueda.

El backend local ([dsh-spill-local](../../packages/spill/spill-local)) escribe bajo `<root>/session-<hash>/<random>-<safeName>`: una raíz privada (0700) configurada o creada de forma diferida, un subdirectorio de sesión `sha256(sessionId)` y una escritura exclusiva solo para el propietario (`open(path, 'wx', 0o600)`) de modo que un symlink plantado no pueda redirigirla. Su `locator` es la ruta local y su `retrievalHint` indica al modelo que use `read` o `grep` sobre esa ruta. El consumidor de política ([dsh-spill-policy](../../packages/spill/spill-policy)) reemplaza un resultado de texto o imagen que supera `maxInlineTokens` por contenido ordenado de cabeza y cola más una dirección spill, en modo de mejor esfuerzo: un fallo al guardar conserva el resultado en línea original en lugar de convertir una llamada exitosa en un `isError`.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxspillstore--spillstore-abstract-seam"></a>

### `ctx.spillStore` — `SpillStore` (abstract seam)

Abstract spill storage service. Subclass, implement saveText, and load the subclass as a plugin — it registers as `ctx.spillStore` (one implementation per context; loading a second throws, cordis' standard duplicate-service behavior).

Semantics every implementation must honor:

- saveText persists the FULL `content` verbatim and returns an opaque locator, exact byte length, and model-facing retrieval guidance.
- Storage is scoped by the request's SaveTextSpill.owner session; the backend chooses a private (not world-readable) location and a collision-free name derived from — never equal to — the caller's `suggestedName`.
- `saveText` REJECTS on a real storage failure (permissions, ENOSPC, backend unavailable); the caller decides how to degrade (the spill policy treats a rejection as best-effort and keeps the inline result).

```ts cordis-catalog
/**
 * Persist `input.content` to a session-scoped spill artifact.
 * @param input - the owner, caller-supplied source fields, suggested name, and full text to save.
 * @returns the saved artifact's {@link SpillRef}; rejects on a storage failure.
 */
abstract saveText(input: SaveTextSpill): Promise<SpillRef>
```

Source: [`packages/spill/spill/src/index.ts`](../../packages/spill/spill/src/index.ts)
<!-- END GENERATED cordis-surface -->
