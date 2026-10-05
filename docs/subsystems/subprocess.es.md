# Subproceso

[English](subprocess.md) | Español

El seam de subprocesos está dividido entre una Service Definition ([dsh-subprocess](../../packages/subprocess/subprocess), `ctx.subprocess`) y un Service Provider ([dsh-subprocess-local](../../packages/subprocess/subprocess-local)); sus Consumers son otros capability seams y backends fuera de proceso: la [familia de ejecutores bash](shell.es.md) usa la salida de lotes recopilada, LSP usa pipes de protocolo sin procesar, el backend PTY usa la primitiva de terminal, y el backend de subagent ACP usa ndjson por pipes más stderr heredado. Este seam posee el espacio de nombres de entorno gestionado `DSH_*`, la depuración de credenciales compartida (`scrubbedParentEnv`) y la forma `CollectedOutput`; [dsh-shell](../../packages/shell/shell) reexporta el vocabulario para que los consumidores de bash conserven una sola raíz de importación.

Fuentes: [`packages/subprocess/subprocess/src/types.ts`](../../packages/subprocess/subprocess/src/types.ts) y [`packages/subprocess/subprocess/src/index.ts`](../../packages/subprocess/subprocess/src/index.ts)

## Resolución de ejecutables

Los directorios de trabajo de spawn, las rutas de ejecutables, los procesos ordinarios y las sesiones de terminal de un proveedor habitan el mismo espacio de nombres de rutas y procesos que el proveedor de sistema de archivos montado. `resolveExecutable(command, env?, signal?)` verifica las rutas absolutas de ejecutables o resuelve nombres simples a través del `PATH` depurado del proveedor más sustituciones deliberadas.

## Espacio de nombres de entorno gestionado y salida capturada

Las variables `DSH_*` son hechos del proceso hijo propiedad de Harness; las implementaciones descartan los nombres `DSH_*` del ambiente antes de fusionar el `env` explícito del llamante, de modo que un hecho vigente llega solo como una entrada de cadena deliberada, mientras que un tombstone `undefined` explícito elimina un valor ambiental ordinario. Cada flujo recopilado informa de su estado de truncamiento y de recuperación de spill a través de `CollectedOutput`.

```ts type-equiv
/** One environment key inside the managed {@link DSH_ENV_PREFIX} namespace. */
type DshEnvironmentKey = `${typeof DSH_ENV_PREFIX}${string}`
```

```ts type-equiv
/** Trusted DeepSeek Harness variables for one child-process execution. */
type DshEnvironment = Readonly<Record<DshEnvironmentKey, string>>
```

```ts type-equiv
/** One captured stream: the (possibly truncated) text plus recovery info. */
interface CollectedOutput {
  /** Collected text — the TAIL of the stream when truncated. */
  text: string
  /** True when bytes were dropped from `text`. */
  truncated: boolean
  /** Path to a file holding the COMPLETE stream, when truncated and available. */
  spillPath?: string
}
```

## Disposiciones de stdio al estilo de Node

La disposición de cada flujo es explícita y la elige cada consumidor: pipes sin procesar para el encuadre de protocolo (LSP JSON-RPC, ACP ndjson), inherit para diagnósticos de paso directo, y modo de recopilación para salida de lotes acotada, con el archivo spill opcional, de modo que una cola de diagnóstico (el stderr de un servidor de lenguaje) se almacena en búfer sin dejar archivos atrás.

```ts type-equiv
/**
 * stdin disposition. `'ignore'` leaves fd 0 on `/dev/null`; `'pipe'` exposes
 * {@link SubprocessHandle.stdin} for the caller's ongoing protocol writes;
 * `{ data }` writes the bytes and closes (the batch shape).
 */
type SubprocessStdinMode = 'ignore' | 'pipe' | { readonly data: string }
```

```ts type-equiv
/**
 * Bounded in-memory collection for one output stream, with an optional
 * full-stream spill file. Omitting `spill` keeps only the in-memory tail —
 * the diagnostic-tail shape (a language server's stderr); including it makes
 * the complete stream recoverable up to its cap (the bash tool shape).
 */
interface SubprocessCollect {
  /** In-memory cap in bytes; overflow keeps the TAIL. */
  maxBytes: number
  /** Full-stream spill file; absent disables spilling entirely. */
  spill?: {
    /** Whole-stream byte cap; a larger stream discards its now-incomplete spill. */
    maxBytes: number
  }
}
```

```ts type-equiv
/**
 * stdout/stderr disposition. `'pipe'` exposes the raw `Readable` for the
 * caller's protocol decoding; `'inherit'` passes the parent's descriptor
 * through (child diagnostics land on the harness's own stream); a
 * {@link SubprocessCollect} object buffers boundedly with offset-based reads.
 */
type SubprocessOutputMode = 'pipe' | 'inherit' | SubprocessCollect
```

```ts type-equiv
/** Per-stream stdio dispositions, all explicit — this seam applies no defaults. */
interface SubprocessStdio {
  stdin: SubprocessStdinMode
  stdout: SubprocessOutputMode
  stderr: SubprocessOutputMode
  /** Request a separate byte-mode duplex channel; omission creates none. */
  control?: 'pipe'
}
```

## La especificación de spawn completamente explícita

El seam no aplica valores por defecto: cada disposición, límite y directorio es explícito en la especificación, de modo que la configuración del propio llamante, y no un valor por defecto oculto del servicio de subprocesos, los decide. `argv` nunca se interpreta como shell.

```ts type-equiv
/**
 * A fully-specified spawn request. This seam applies no defaults: every
 * disposition, limit, and directory is explicit, so the caller's own config —
 * not a hidden subprocess-service default — decides them (the `dsh-shell`
 * request/spec split is the owning template).
 */
interface SubprocessSpawnSpec {
  /** Executable and arguments; `argv[0]` is the program. Never shell-interpreted here. */
  argv: readonly string[]
  /** Working directory for the child. */
  cwd: string
  /** Per-stream stdio dispositions. */
  stdio: SubprocessStdio
  /**
   * Positive finite grace period in milliseconds, no greater than
   * `MAX_TIMER_DELAY_MS`, available to the provider's termination procedure
   * and used for draining still-open collected pipes after the process exits
   * (an inherited descriptor held by a survivor cannot hold the outcome open
   * indefinitely). Providers document whether range termination is staged or
   * immediate.
   */
  graceMs: number
  /**
   * Abort signal — starts the terminate escalation on the managed range when
   * it fires. The caller owns deadlines and cause classification; this seam
   * only reacts to the abort.
   */
  signal?: AbortSignal | undefined
  /**
   * Explicit environment entries merged onto the implementation's scrubbed
   * parent base (see `scrubbedParentEnv`), with no namespace validation. A
   * string is a deliberate caller opt-in, so a forwarded credential-shaped
   * entry or current `DSH_*` fact survives the scrub; `undefined` is a
   * tombstone that removes an ordinary ambient entry from the child.
   */
  env?: NodeJS.ProcessEnv | undefined
}
```

## Identificadores: flujos, lectores y terminación del rango gestionado

Un spawn devuelve un identificador en vivo de forma síncrona mientras las identidades del objetivo y del rango gestionado permanecen privadas del proveedor. Los lectores en modo de recopilación toman desplazamientos de byte sobre todo el flujo y nunca consumen, de modo que lectores independientes no pueden robarse los deltas unos a otros; los flujos con pipe pertenecen al llamante. `terminate()` inicia el procedimiento documentado del proveedor, y `waitForExit()` observa el mismo rango gestionado por el proveedor; los proveedores escalonados pueden usar `graceMs`, mientras que los proveedores inmediatos no esperan. Los consumidores pueden construir sus propias escaleras de desmontaje sobre esas dos operaciones (el `disposeAcpChild` del backend ACP, que primero envía EOF al stdin, es la plantilla).

```ts type-equiv
/**
 * A live subprocess and its provider-managed process range. Collected output
 * remains readable after exit; piped streams belong to the caller.
 *
 * Termination and {@link SubprocessHandle.waitForExit} use the same managed
 * range. Each provider documents the range it can observe and its signalling
 * and observation limits.
 */
interface SubprocessHandle {
  /** The child's stdin, present iff spawned with `stdin: 'pipe'`. */
  readonly stdin: Writable | undefined
  /** The child's raw stdout, present iff spawned with `stdout: 'pipe'`. */
  readonly stdout: Readable | undefined
  /** The child's raw stderr, present iff spawned with `stderr: 'pipe'`. */
  readonly stderr: Readable | undefined
  /** Separate caller-owned byte channel when requested; native startup failure may leave it absent. */
  readonly control: Duplex | undefined
  /** Offset-based readers for collect-mode streams (also readable after exit). */
  readonly collected: SubprocessCollectedOutputs
  /** Resolves with spawned-command exit facts; rejects for spawn or provider failures. */
  readonly done: Promise<SubprocessOutcome>
  /**
   * Begin the provider's documented termination procedure on the managed range
   * — the seam's only termination verb. Idempotent, a no-op once that range is
   * gone, and also triggered by the spec's abort signal.
   */
  terminate(): void
  /**
   * Wait until the same managed range is empty — not just until the spawned
   * command reports its outcome, so surviving work remains observable.
   * @param signal - optional bound for the wait.
   * @returns `true` when the managed range is empty, `false` when the signal aborted first.
   * @throws when the selected provider can no longer observe its managed range.
   */
  waitForExit(signal?: AbortSignal): Promise<boolean>
}
```

```ts type-equiv
/**
 * Cursor-free incremental access to one collected output stream. Offsets are
 * whole-stream byte coordinates owned by the caller, so independent readers
 * cannot consume one another's output; `readFrom(0)` after settlement is the
 * batch result (`lossy` then means the in-memory tail lost its head — the
 * {@link CollectedOutput.truncated} fact).
 */
interface SubprocessOutputReader {
  /**
   * Read everything captured since `fromByte`. When that offset has slid out
   * of the in-memory tail window the read is `lossy` — it returns the whole
   * retained tail and the gap is only recoverable from the spill file.
   * @param fromByte - whole-stream offset to resume from (a prior read's `nextOffset`; 0 for the first read).
   * @returns the delta text, the next offset, the `lossy` flag, and the spill path when one exists.
   */
  readFrom(fromByte: number): SubprocessOutputRead
}
```

```ts type-equiv
/** One incremental {@link SubprocessOutputReader.readFrom} read. */
interface SubprocessOutputRead {
  /** Stream text from the requested offset (the whole retained tail when lossy). */
  text: string
  /** Whole-stream offset to resume from on the next read. */
  nextOffset: number
  /** True when the requested offset slid out of the in-memory tail window. */
  lossy: boolean
  /** Path to the full-stream spill file, when one was created and remains intact. */
  spillPath?: string
}
```

```ts type-equiv
/** Offset-based readers for the streams spawned in collect mode. */
interface SubprocessCollectedOutputs {
  /** Present iff stdout is a {@link SubprocessCollect}. */
  readonly stdout?: SubprocessOutputReader
  /** Present iff stderr is a {@link SubprocessCollect}. */
  readonly stderr?: SubprocessOutputReader
}
```


## Los resultados llevan solo hechos de salida

`done` informa del vocabulario del evento close de Node y ninguna clasificación de causas: el servicio termina el proceso al abortar pero nunca decide por qué (el llamante lee la señal de plazo que posee, p. ej. la división `timedOut`/`aborted` del ejecutor bash). La salida recopilada sigue siendo legible a través de `handle.collected` tras la liquidación, de modo que los llamantes por lotes y por streaming comparten una única vía de acceso.

```ts type-equiv
/**
 * Exit facts of one closed process — Node's `close`-event vocabulary.
 * Deliberately carries NO timeout or cancellation classification (the caller
 * reads the signal it owns to classify causes) and NO output: collected
 * streams stay readable through {@link SubprocessHandle.collected} after
 * settlement, so batch and streaming callers share one access path.
 */
interface SubprocessOutcome {
  /** Exit code; null when the process died from a signal. */
  exitCode: number | null
  /** Terminating signal (e.g. 'SIGTERM'); null on normal exit. */
  signal: NodeJS.Signals | null
}
```

## Primitiva de proceso de terminal

`spawnTerminal(spec)` es la primitiva de proceso sin pipes. El proveedor asigna el terminal controlador y posee el transporte de texto UTF-8, la inspección y señalización del grupo de procesos en primer plano, y una operación TERM-a-KILL esperada que alcanza la quiescencia para cada miembro de la sesión que el proveedor aún puede observar; los proveedores documentan los límites de observabilidad específicos del sustrato. El backend PTY sigue siendo responsable de la detección del prompt, la inferencia de disponibilidad, el scrollback, la política de sandbox y la propiedad de las sesiones persistentes; un `spawn()` ordinario no puede reconstruir la semántica del terminal controlador.

La especificación de terminal especifica por completo argv, cwd, sustituciones de entorno, tipo de terminal, dimensiones, gracia de limpieza, y la cancelación opcional de la asignación junto con la observación de la actividad de la shell. Su identificador expone `pid`, salida ordenada, `done`, `write`, `resize`, `inspectForeground`, `inspectActivity`, `signalForeground` y `terminate` esperado; [`SubprocessTerminalSpawnSpec` y `SubprocessTerminalHandle`](../../packages/subprocess/subprocess/src/types.ts) definen estos campos y operaciones. `resize(cols, rows)` actualiza las dimensiones del PTY en vivo y rechaza tras la salida del proceso.

`inspectActivity()` devuelve `SubprocessTerminalActivity`: `state` es `idle`, `busy` o `unknown`, y `revision` cambia con la actividad o la entrada observadas por el proveedor. Una solicitud de terminal opta por la observación soportada del ciclo de vida de la shell con `shellActivity`; el soporte específico del proveedor y los casos conservadores de desconocido están documentados por [subprocess-local](../../packages/subprocess/subprocess-local/README.md#running-terminal-sessions).

`terminalEnvironment(signal?)` devuelve `SubprocessTerminalEnvironment`: la plataforma del entorno de ejecución (`posix` o `windows`) y el `defaultShell` opcional. Estos hechos provienen del proveedor y no del servidor Web ni del navegador. `resolveExecutable` verifica los candidatos de shell; `SubprocessExecutableNotFoundError` identifica un ejecutable ausente, mientras que los fallos de proveedor y de transporte siguen siendo errores.

## Comportamiento del servicio

La Service Definition abstracta [`SubprocessRuntime`](../../packages/subprocess/subprocess/src/index.ts) especifica las coordenadas del mundo de ejecución, la resolución de ejecutables, el `spawn` ordinario y `spawnTerminal`. [`LocalSubprocessRuntime`](../../packages/subprocess/subprocess-local/src/index.ts) las provee con rangos gestionados seleccionados por plataforma, cableado por disposición, depuración de credenciales, `node-pty`, inspección de procesos de plataforma y dispose de terminación y unión. Véase [`dsh-subprocess`](../../packages/subprocess/subprocess/README.md) para el contrato de la Service Definition y [`dsh-subprocess-local`](../../packages/subprocess/subprocess-local/README.md) para la mecánica local.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxsubprocess--subprocessruntime-abstract-seam"></a>

### `ctx.subprocess` — `SubprocessRuntime` (abstract seam)

Abstract subprocess service. Subclass, implement spawn, and load the subclass as a plugin — it registers as `ctx.subprocess` (one implementation per context; loading a second throws, which is cordis' standard duplicate-service behavior).

Implementations must honor these semantics:

- Executable paths belong to one execution world shared with the mounted filesystem provider.
- spawn returns a live handle synchronously. Target identity remains provider-private; `done` resolves with the spawned command's exit facts and may reject for spawn or provider failures.
- Collect-mode readers are offset-based and non-consuming, so independent readers never consume one another's output; lossy reads report truncation and the spill file holding the complete stream when one exists. Piped streams are handed to the caller raw and never buffered here.
- SubprocessHandle.terminate (and the spec's abort signal) starts the provider's documented procedure against its managed range. SubprocessHandle.waitForExit observes that same range so a consumer-owned teardown ladder can hold each tier on real quiescence; each provider documents its signalling and observability limits.
- Disposal of the service terminates all still-running managed processes and awaits their exit.
- spawnTerminal owns terminal allocation, text transport, foreground groups, signalling, and whole-session quiescence behind one awaited termination method; readiness and persistent-shell policy stay in the PTY consumer. Its output stream ends after queued terminal output when the top-level process exits.

```ts cordis-catalog
/**
 * Resolve one configured executable in this provider's execution world.
 * Absolute paths are verified; bare names use the provider's scrubbed PATH
 * plus explicit environment overrides. Relative paths containing separators
 * are rejected: the resolution base is undefined, so providers fail loud
 * instead of guessing.
 * @param command - absolute executable path or bare PATH name.
 * @param env - explicit environment entries used for lookup.
 * @param signal - aborts remote or local lookup.
 * @returns a canonical executable path.
 */
abstract resolveExecutable( command: string, env?: Readonly<Record<string, string>>, signal?: AbortSignal, ): Promise<string>

/**
 * Inspect shell-selection facts in the provider's execution environment.
 * @param signal - cancellation of remote environment inspection.
 * @returns platform and preferred shell; executable lookup and allocation remain separate operations.
 */
abstract terminalEnvironment(signal?: AbortSignal): Promise<SubprocessTerminalEnvironment>

/**
 * Start one managed child process from a fully-specified spec; this seam
 * applies no defaults.
 * @param spec - argv, directory, stdio dispositions, grace, cancellation, and environment.
 * @returns the live process handle (streams/readers, signalling, outcome promise).
 * @throws synchronously when pre-aborted or when argv, cwd, environment, or grace is invalid before handle creation.
 */
abstract spawn(spec: SubprocessSpawnSpec): SubprocessHandle

/**
 * Allocate a real terminal and start one owned process session. This is the
 * only non-pipe process primitive: implementations own terminal byte I/O,
 * foreground groups, signals, and whole-session quiescence.
 * @param spec - fully specified argv, cwd, environment, dimensions, grace, and allocation cancellation.
 * @returns the live terminal handle after allocation succeeds.
 */
abstract spawnTerminal(spec: SubprocessTerminalSpawnSpec): Promise<SubprocessTerminalHandle>
```

Source: [`packages/subprocess/subprocess/src/index.ts`](../../packages/subprocess/subprocess/src/index.ts)
<!-- END GENERATED cordis-surface -->
