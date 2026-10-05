# Runtime PTC

[English](ptc-runtime.md) | Español

El [capability seam](../../.agents/notes/implemented/architecture/2026-06-13-capability-seams.md) de ejecución PTC suministra `ctx.ptcRuntime` a través de [dsh-ptc-runtime](../../packages/ptc-runtime/ptc-runtime). Ejecuta un programa contra bindings del anfitrión e informa de la salida, el fallo y los hechos de sandbox aplicables. La ejecución PTC es opcional y no forma parte de [la espina dorsal del agent loop](core.es.md). La [fundación PTC](../../.agents/notes/implemented/feature/2026-06-15-ptc.md) posee la presentación del registry, el [contrato de retorno tipado](../../.agents/notes/implemented/feature/2026-07-20-ptc-typed-tool-returns.md) posee los valores de binding y la [decisión de Node en sandbox](../../.agents/notes/implemented/architecture/2026-09-11-sandboxed-node-ptc-runtime.md) posee el proveedor de ejecución entregado.

Fuente: [`packages/ptc-runtime/ptc-runtime/src/types.ts`](../../packages/ptc-runtime/ptc-runtime/src/types.ts)

## La ejecución: entra la solicitud, sale el resultado

`PtcRunRequest` contiene el programa, los bindings, la cancelación y las opciones de ejecución opcionales. El `resolve` del proveedor valida las opciones soportadas y aplica sus valores por defecto de despliegue; `run` recibe un `PtcRunSpec` con una elección explícita de directorio y de plazo. Un timeout omitido usa los valores por defecto del proveedor, un número solicita un presupuesto de tiempo transcurrido acotado, y `null` solicita no tener plazo de tiempo transcurrido. Los proveedores rechazan las opciones no soportadas antes de la ejecución:

```ts type-equiv
/**
 * Caller inputs for one program. The provider's resolve method validates supported
 * options and supplies directory, deadline, and authority before execution.
 */
interface PtcRunRequest {
  /**
   * The program source, in the runtime's {@link ../index.ts | language}. It
   * runs as the body of an async function: top-level `await` and `return`
   * are available, and the completion value becomes
   * {@link PtcRunResult.value}.
   */
  program: string
  /** Host functions exposed to the program, one global object per namespace. */
  bindings: PtcBindingNamespace[]
  /** Working directory in the mounted filesystem and subprocess execution world. */
  cwd?: string
  /**
   * Elapsed execution budget in milliseconds. Omission uses provider defaults;
   * null requests no deadline. Providers validate and cap numeric budgets or reject unsupported choices.
   */
  timeoutMs?: number | null
  /** Resolved authority for this execution. Providers without confinement reject an explicit policy. */
  sandboxPolicy?: SandboxExecutionPolicy
  /**
   * Abort the run: the runtime stops the program (hard, even mid-loop) and
   * resolves with a {@link PtcRunFailure} of kind `'abort'`. In-flight
   * binding calls are the CALLER's to settle — the runtime only stops asking.
   */
  signal?: AbortSignal
}
```

```ts type-equiv
/** Fully resolved execution inputs; run never supplies a missing directory or deadline choice. */
interface PtcRunSpec extends PtcRunRequest {
  /** Absolute directory in the provider's execution world. */
  cwd: string
  /** Positive finite elapsed budget in milliseconds after provider capping, or null for no deadline. */
  timeoutMs: number | null
}
```

```ts type-equiv
/** File confinement applied to a program, independently of its terminal outcome. */
interface PtcRunSandbox {
  /** File-effect mode used for this execution. */
  mode: SandboxMode
  /** Program failure text matched backend diagnostics; not enforcement proof or an exhaustive denial record. */
  denied: boolean
  /** Completeness reported by the selected confining backend; absent for full access. */
  enforcement?: SandboxEnforcement
}
```

Los fallos del programa se resuelven a través de `PtcRunResult.error`; las entradas de llamante inválidas pueden rechazarse antes de la ejecución. El modo de sandbox, la denegación observada y la completitud de la aplicación son hechos separados, de modo que un programa exitoso no prueba por sí solo que se aplicara cada restricción solicitada:

```ts type-equiv
/**
 * The outcome of one run. An error is a FIELD on a resolved result, never a
 * rejection of `run()` — reporting a failed program is the caller's job, not
 * an exception path.
 */
interface PtcRunResult {
  /** Applied file policy and observed denial, when the provider enforces file policy. */
  sandbox?: PtcRunSandbox
  /**
   * The program's completion value (its top-level `return`), when it ran to
   * completion and the value crossed the runtime's lossless-JSON boundary.
   * Invalid or over-limit completions fail the run instead of substituting a
   * rendered string; a failed or value-less run leaves this absent.
   */
  value?: PtcJsonValue
  /**
   * Captured text. Each source channel preserves emission order; interleaving
   * across independent channels is backend-dependent. Bounded only as part of
   * the outer result.
   */
  logs: string[]
  /** Present iff the run failed; see {@link PtcRunFailure} for the taxonomy. */
  error?: PtcRunFailure
}
```

## Bindings: funciones del anfitrión como globales del programa

Cada `PtcBindingNamespace` se convierte en un objeto global de callables async; PTC pasa `tools`. Los argumentos y las resoluciones deben ser JSON sin pérdida. Los proveedores imponen sus propios topes de transporte; el seam no fija un límite uniforme de bytes de binding. Un descriptor opcional de clase de error crea rechazos tipados visibles para el programa sin nombrar a un consumidor dentro del runtime. Los nombres de binding son propiedades propias, de modo que `__proto__` no puede atravesar un prototipo:

```ts type-equiv
/**
 * Program-visible typed rejection for one binding namespace. The runtime
 * injects a real error constructor under `name`; rejected member calls become
 * its instances and expose the exact member name through
 * `memberNameProperty`. Both strings are runtime data rather than knowledge
 * of a particular consumer such as PTC mode.
 */
interface PtcBindingErrorClass {
  /** Constructor global and resulting `Error.name`; same portable identifier rule as {@link PtcBindingNamespace.global}. */
  name: string
  /**
   * Non-empty own property for the member name. The portable exclusion set is
   * `RESERVED_ERROR_MEMBERS` plus dunder-form names (`__x__`, non-empty
   * middle), enforced identically by every backend; any other name —
   * identifiers or not — is accepted everywhere.
   */
  memberNameProperty: string
}
```

```ts type-equiv
/**
 * A named group of {@link PtcBindingFunction}s the runtime exposes to the
 * program as one global object (e.g. `tools`). Function names are arbitrary
 * strings — a runtime must treat names like `__proto__` or `constructor` as
 * ordinary own properties (null-prototype construction), never as prototype
 * collisions.
 */
interface PtcBindingNamespace {
  /**
   * The global identifier the program sees. Must match the LANGUAGE-PORTABLE
   * identifier subset `[A-Za-z_][A-Za-z0-9_]*` and no language's reserved
   * words, so the same namespace list works against every backend regardless
   * of `language` — a JS-only spelling like `$tools` is rejected by design,
   * not just by the Python backend. Names that satisfy the identifier rule but
   * name a backend-owned slot (`RESERVED_BINDING_GLOBALS`, e.g. `console`,
   * `__dsh_main__`) are also refused everywhere; see its declaration for the
   * exact set and why each entry is reserved.
   */
  global: string
  /** The callable members, keyed by the exact name the program calls. */
  functions: Record<string, PtcBindingFunction>
  /** Optional program-visible typed rejection contract for this namespace. */
  errorClass?: PtcBindingErrorClass
}
```

```ts type-equiv
/** A lossless JSON value transferable through the dependency-light Service Definition. */
type PtcJsonValue = null | boolean | number | string | PtcJsonValue[] | { [key: string]: PtcJsonValue }
```

```ts type-equiv
/**
 * One host-side function exposed to the program as an async callable. The
 * runtime bridges calls to it (possibly across a serialization boundary), so
 * `args` and the resolution value MUST be lossless JSON. A runtime rejects a
 * lossy or non-cloneable value with a descriptive error rather than corrupting
 * the run. No seam-level byte cap applies to a binding resolution. A rejection
 * of this function surfaces inside the program as a rejection of the
 * corresponding call.
 */
type PtcBindingFunction = (args: unknown) => Promise<PtcJsonValue>
```

## Salida capturada y taxonomía de fallos

Los logs son strings planos. Cada canal de origen conserva el orden de emisión, mientras que el intercalado entre canales independientes depende del backend porque los metadatos de canal no forman parte del seam. El runtime captura la salida de consola y de stream del programa, y los consumidores solo renderizan el texto. Las implementaciones acotan el array de logs externo serializado más el payload de valor de finalización o mensaje de fallo; la sintaxis fija de la envoltura del resultado y los espacios en blanco de presentación del consumidor no forman parte de ese balance de payload variable. El desbordamiento es un fallo explícito en lugar de una sustitución de valor en banda.

Los tipos de fallo son **resultados ortogonales informados de forma independiente** (según [defensive-patterns](../defensive-patterns.es.md)): una expiración de presupuesto no es una excepción, un abort no es un timeout, y una muerte del sustrato (p. ej. OOM) no es ninguna de las dos:

```ts type-equiv
/**
 * Why a run failed. The kinds are orthogonal outcomes reported independently
 * (per docs/defensive-patterns.md): a budget expiry is not an exception, an
 * abort is not a timeout, and a substrate death is neither.
 *
 * - `'exception'` — the program threw or failed to parse/transform.
 * - `'timeout'` — an implementation-owned budget expired; the message says which.
 * - `'abort'` — {@link PtcRunRequest.signal} fired.
 * - `'worker-exit'` — the execution substrate died without settling (e.g. OOM).
 * - `'invalid-output'` — the completion value was not lossless JSON.
 * - `'output-limit'` — the serialized outer logs/value/diagnostic exceeded the configured cap.
 * - `'protocol'` — the program sent invalid or over-budget control traffic.
 * - `'sandbox-unavailable'` — required confinement could not be established.
 */
interface PtcRunFailure {
  /** The failure class (see the interface doc for each kind's meaning). */
  kind: 'exception' | 'timeout' | 'abort' | 'worker-exit' | 'invalid-output' | 'output-limit' | 'protocol' | 'sandbox-unavailable'
  /** Human-readable detail, suitable for feeding back to a model to self-correct. */
  message: string
}
```

## El servicio

`PtcRuntime` está definido en [`src/index.ts`](../../packages/ptc-runtime/ptc-runtime/src/index.ts). `resolve(request)` devuelve entradas de ejecución completas, y `run(spec)` las ejecuta. `executionInstructions` suministra guía de uso propiedad del proveedor para la presentación al consumidor. `timeout` informa del valor por defecto y del máximo de tiempo transcurrido configurados cuando se soportan sobrescrituras por llamada; `resolve` sigue validando y acotando cada solicitud. `language` selecciona la presentación de programa soportada; `isolation` describe el sustrato sin reclamar seguridad. `sandboxMode` anuncia el soporte de política de archivos, con `undefined` para un proveedor que no suministra confinamiento. Cada implementación mantiene el estado del programa separado entre ejecuciones y termina y espera las ejecuciones activas durante el dispose.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxptcruntime--ptcruntime-abstract-seam"></a>

### `ctx.ptcRuntime` — `PtcRuntime` (abstract seam)

Registers one `ctx.ptcRuntime` implementation. Program, budget, abort, and substrate failures resolve in PtcRunResult; only Service Definition contract misuse rejects. Implementations bridge structured-cloneable bindings, materialize each declared namespace rejection class, treat programs as hostile peers, isolate runs from one another, and terminate and await in-flight runs during disposal.

```ts cordis-catalog
/**
 * Resolve supported options and provider defaults before execution.
 * @param request - Program, bindings, cancellation and optional execution choices.
 * @returns Complete directory, deadline and supported authority for run.
 * @throws When an explicit choice is invalid or unsupported by this provider.
 */
abstract resolve(request: PtcRunRequest): PtcRunSpec

/**
 * Execute resolved inputs; program outcomes resolve as result fields.
 * @param spec - directory, deadline, program, bindings, cancellation and supported policy.
 * @returns Captured output and the execution outcome.
 */
abstract run(spec: PtcRunSpec): Promise<PtcRunResult>
```

Source: [`packages/ptc-runtime/ptc-runtime/src/index.ts`](../../packages/ptc-runtime/ptc-runtime/src/index.ts)
<!-- END GENERATED cordis-surface -->
