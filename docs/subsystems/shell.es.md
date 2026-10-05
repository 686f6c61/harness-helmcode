# Ejecutor de shell

[English](shell.md) | Español

El seam de ejecución de shell usa [dsh-shell](../../packages/shell/shell) como Service Definition en `ctx.shell`. El [grupo de paquetes shell](../../packages/shell/README.md) lista sus proveedores Bash y PowerShell y los Consumers orientados al modelo. Los ids genéricos de tareas en segundo plano, su propiedad y sus controles viven en [jobs.md](jobs.es.md); este seam devuelve un identificador de proceso sin registro de tarea. La mecánica de rangos gestionados vive tras el [seam de subprocess](subprocess.es.md).

Fuente: [`packages/shell/shell/src/types.ts`](../../packages/shell/shell/src/types.ts)

## Espacio de nombres gestionado del entorno de shell

Las variables `DSH_*` son datos de procesos hijos propiedad del Harness. La tool bash orientada al modelo las recoge mediante `ctx.shellEnv` y las pasa a través de `ShellExecRequest.dshEnv`; el servicio de subprocess elimina los nombres `DSH_*` heredados antes de fusionar el snapshot actual. El vocabulario `DshEnvironmentKey`/`DshEnvironment` pertenece al [seam de subprocess](subprocess.es.md) y `dsh-shell` lo reexporta.

## Solicitud frente a spec: la división de `resolve()`

El seam separa la **solicitud orientada al modelo/plugin** (`workdir`/`timeoutMs`/`stdoutMaxBytes` opcionales, rellenados desde la config o la política de la solicitud) del **spec completamente resuelto** sobre el que actúa el ejecutor (esos campos obligatorios). La capa de tool llama a `ctx.shell.resolve(request)` entre ambas (la regla del repositorio «explícito > implícito en los límites de paquete»); un `ShellExecSpec` porta valores resueltos.

```ts type-equiv
/**
 * A caller's execution REQUEST: `workdir` and `timeoutMs` are optional and
 * filled by {@link ShellExecutor.resolve} from the implementation's config.
 * This is the model-/plugin-facing shape; pass it to `resolve()` to obtain a
 * fully-resolved {@link ShellExecSpec}.
 */
interface ShellExecRequest {
  command: string
  /** Working directory override (default: implementation-configured). */
  workdir?: string | undefined
  /** Timeout override in milliseconds (implementations cap it). */
  timeoutMs?: number | undefined
  /** Deadline policy at `timeoutMs` expiry (default `'kill'`). */
  onExpiry?: ShellExpiryPolicy | undefined
  /**
   * Foreground stdout capture budget in bytes. Absent uses the executor's
   * default output cap. Trusted in-process consumers use this when they must
   * parse complete stdout up to their own bounded limit; the model-facing bash
   * tool does not expose it as a parameter.
   */
  stdoutMaxBytes?: number | undefined
  /** Abort signal — implementations kill the command when it fires, and treat a signal that is already aborted as fired. */
  signal?: AbortSignal | undefined
  /**
   * Bytes to write to the command's stdin, then close it. Absent leaves stdin
   * closed/empty (the default for model-driven tool calls). Set by in-process
   * plugins (e.g. the hooks bridges, which write a hook command's JSON payload
   * to its stdin); the model-facing bash tool does not expose it as a parameter
   * (a model that needs stdin uses shell syntax like a heredoc or a pipe).
   */
  stdin?: string | undefined
  /**
   * Ordinary environment entries for the command, merged after the credential
   * scrub. Managed facts belong in {@link dshEnv}, which merges after this
   * map, so an entry here can never displace one. Set by in-process plugins
   * (the hooks bridges set `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT`, …); the
   * model-facing bash tool does not expose it as a parameter.
   */
  env?: Record<string, string> | undefined
  /**
   * Harness-owned `DSH_*` variables for this execution (typed to managed
   * keys). Executors discard ambient `DSH_*` entries before merging this
   * snapshot last, so an unavailable current fact cannot inherit a stale
   * value from the harness process and a caller {@link env} entry cannot
   * displace a managed one.
   */
  dshEnv?: DshEnvironment | undefined
  /** Fully resolved per-call sandbox policy; sandboxing executors default it. */
  sandboxPolicy?: SandboxExecutionPolicy | undefined
}
```

```ts type-equiv
/**
 * A resolved execution spec. {@link ShellExecutor.resolve} fills and caps the
 * required fields; under `onExpiry: 'none'` the resolved `timeoutMs` arms no
 * timer and is only echoed into {@link ShellRunResult.timeoutMs}.
 */
interface ShellExecSpec {
  command: string
  workdir: string
  timeoutMs: number
  /** Deadline policy at `timeoutMs` expiry ({@link ShellExecutor.resolve} defaults it to `'kill'`). */
  onExpiry: ShellExpiryPolicy
  /**
   * Resolved stdout capture budget in bytes, applied to every execution's
   * stdout; stderr keeps the executor's own output cap.
   */
  stdoutMaxBytes: number
  /** Abort signal — implementations kill the command when it fires, and treat a signal that is already aborted as fired. */
  signal?: AbortSignal | undefined
  /** Bytes to write to stdin before closing it; absent means no stdin. */
  stdin?: string | undefined
  /**
   * Ordinary environment entries carried through from
   * {@link ShellExecRequest.env}; {@link dshEnv} still merges after them.
   * OPTIONAL on the spec for the same reason as `stdin`: absent means no
   * ordinary extra environment.
   */
  env?: Record<string, string> | undefined
  /** Managed `DSH_*` snapshot (typed to managed keys); merges after {@link env}. */
  dshEnv?: DshEnvironment | undefined
  /** Resolved sandbox policy; ignored by executors that do not confine. */
  sandboxPolicy: SandboxExecutionPolicy | undefined
}
```

`stdin` y `env` son entradas de plugins en proceso de confianza y `dsh-tool-bash` no las expone. El ejecutor local limpia las credenciales del ambiente antes de fusionar el env explícito suministrado por el llamante.

`stdoutMaxBytes` también es solo para plugins de confianza. Permite a un consumidor en primer plano solicitar la stdout completa hasta un presupuesto acotado de parseo sin cambiar la stderr, las tareas en segundo plano ni la cota de salida ordinaria de la tool bash orientada al modelo.

## Ejecuciones en primer plano: `ShellRunResult`

El resultado de una ejecución en primer plano completada (o matada). Los resultados ortogonales se informan **independientemente**: un proceso puede agotar el tiempo Y salir con 0 porque capturó la señal, así que `timedOut`, `aborted`, `signal` y `exitCode` son cada uno su propio campo; un llamante nunca lee una ejecución truncada como un éxito limpio.

```ts type-equiv
/** The outcome of a foreground run, including timeout during preparation. */
interface ShellRunResult {
  /** Exit code; null when preparation expired or the process died from a signal. */
  exitCode: number | null
  /** Terminating signal, or null when none was reported, including preparation expiry. */
  signal: NodeJS.Signals | null
  /**
   * True when the executor's own timeout was the FIRST cause to cut the command
   * short. Mutually exclusive with {@link aborted}: one fused deadline drives
   * both the timeout and the caller's cancellation, so a timeout and an abort
   * racing before process close report the single first-abort cause, not both
   * (see the [timeout-library Agent Note](../../../../.agents/notes/implemented/architecture/2026-07-06-timeout-deadline-library.md)).
   */
  timedOut: boolean
  /**
   * True when the caller's `AbortSignal` was the FIRST cause to kill the command
   * (and it was not the executor's own timeout). Mutually exclusive with
   * {@link timedOut} — see there for the first-cause classification.
   */
  aborted: boolean
  /** The effective timeout applied to this run (after defaulting/capping). */
  timeoutMs: number
  stdout: CollectedOutput
  stderr: CollectedOutput
  /** Sandbox execution facts, absent for an unsandboxed executor. */
  sandbox?: ShellSandboxInfo
}
```

Cada flujo es un `CollectedOutput`: el texto (posiblemente truncado) más información de recuperación; cuando se trunca, `text` es la **cola** y el flujo completo se vuelca a un archivo spill privado. Los campos pertenecen al [seam de subprocess](subprocess.es.md) y `dsh-shell` los reexporta.

## Sandbox de archivos: `ShellSandboxInfo`

Un ejecutor que consume sandbox expone su fallback de modo configurado mediante `ShellExecutor.sandboxMode`. La capa de tool pide a [`@deepseek-ai/dsh-sandbox-policy`](../../packages/sandbox/sandbox-policy/README.md) que resuelva el reemplazo durable `sandbox/mode` y el cwd inmutable de cada sesión llamante en `ShellExecRequest.sandboxPolicy`; una llamada estrictamente más amplia aprobada por el usuario solo reemplaza el modo. El vocabulario de modo/raíz/aplicación pertenece al [seam `@deepseek-ai/dsh-sandbox`](sandbox.es.md); los modos gobiernan solo efectos sobre archivos.

Una ejecución en sandbox informa de su modo, de la clasificación conservadora de denegación y de la completitud de la aplicación. `runnerFailed` marca un fallo del runner del sandbox antes de que el comando se ejecutara; la ejecución en primer plano lanza `SANDBOX_UNAVAILABLE`, mientras que un proceso en segundo plano asentado solo tiene su canal de datos.

```ts type-equiv
/**
 * Sandbox facts for one run, present iff a sandboxing executor handled it.
 * Facts are reported independently of process exit status so callers can
 * distinguish command failures from policy denials and runner failures.
 */
interface ShellSandboxInfo {
  /** The mode the command actually ran under. */
  mode: SandboxMode
  /** Whether the sandbox denied a file operation. */
  denied: boolean
  /** How completely the selected runner enforced the requested mode. */
  enforcement?: SandboxEnforcement
  /** Whether the sandbox runner failed before the command could run. */
  runnerFailed?: boolean
}
```

El código de error `SANDBOX_UNAVAILABLE` (propiedad del [seam sandbox](sandbox.es.md)) es lo que el proveedor de `ctx.sandbox` lanza, y el ejecutor propaga, cuando un modo confinado no tiene backend utilizable. Un runner seleccionado que rechaza su perfil llega al mismo error de fallo cerrado en primer plano; una tarea en segundo plano asentada registra `runnerFailed`. El modelo recibe los datos de denegación/runner en los resultados, conoce el modo efectivo solo cuando un marcador de denegación lo nombra, y puede solicitar un reintento único estrictamente más amplio mediante `sandbox_permissions` más `justification`; `ctx.approval` debe conceder esa llamada exacta antes de que nada se ejecute. La política completa y el diseño de cambio son el [Agent Note de sandbox](../../.agents/notes/implemented/feature/2026-07-06-sandbox.md).

## Procesos en segundo plano: `ShellProcess`

`start()` resuelve con un identificador tras la preparación asíncrona del lanzamiento; la cancelación o un fallo de preparación rechaza antes de la publicación. El identificador no tiene id ni propietario. `dsh-tool-bash` lo adapta a hooks de `ctx.jobs.start()`; el runtime genérico pasa entonces a poseer la identidad y el ciclo de vida de la tarea. `done` resuelve cuando el proceso subyacente se asienta y nunca rechaza; un rechazo del proveedor de subprocess se convierte en un proceso `killed` con un error neutro en etapa en la stderr. Las lecturas siguen siendo válidas tras el asentamiento, y los datos de sandbox se sellan antes de que `done` resuelva.

```ts type-equiv
/**
 * A background process handle returned by {@link ShellExecutor.start}. It is the
 * only access path; buffered output remains readable after exit. Composition
 * teardown (the subprocess service's disposal) kills running processes and
 * awaits {@link done}; an executor-only reload leaves them running.
 */
interface ShellProcess {
  /** Process lifecycle state (settled exactly once). */
  status: ShellProcessStatus
  /** Exit code once finished (null = killed by signal / still running). */
  exitCode: number | null
  /** Terminating signal name, when signal-killed. */
  signal: NodeJS.Signals | null
  /**
   * Resolves when the underlying process settles (never rejects — provider
   * rejection settles as `killed` with a stage-neutral error on stderr).
   */
  readonly done: Promise<void>
  /** Sandbox facts, stamped once a confined process settles. */
  sandbox?: ShellSandboxInfo
  /**
   * Read output produced since the previous read (consuming — consecutive
   * reads never re-deliver). Reads that lost data flag `lossy` and point at
   * full-stream spill files when available.
   */
  readOutput(): ShellProcessRead
  /**
   * Non-consuming offset readers over the same captured streams the consuming
   * {@link readOutput} cursor drains, including the provider-failure note a
   * rejected spawn leaves on stderr. Independent observers read here at their
   * own offsets without stealing bytes from `readOutput`.
   */
  observed: ShellObservedStreams
  /**
   * Terminate the provider-managed range. Returns false when it had already finished
   * (no-op); idempotent.
   */
  kill(): boolean
}
```

`readOutput()` devuelve el delta incremental y los datos de recuperación de spill:

```ts type-equiv
/** One incremental {@link ShellProcess.readOutput} read. */
interface ShellProcessRead {
  /** Output produced since the previous read (stderr in a marked section). */
  delta: string
  /** True when truncation dropped unread bytes the delta cannot include. */
  lossy: boolean
  /** Full stdout spill file, when stdout truncation occurred and a safe path is available. */
  stdoutSpillPath?: string
  /** Full stderr spill file, when stderr truncation occurred and a safe path is available. */
  stderrSpillPath?: string
}
```

## El servicio

`ShellExecutor` posee `resolve`, el `run` en primer plano, el `start` de procesos en segundo plano y el dato de capacidad `sandboxMode`. `dsh-bash-local` posee los valores por defecto de comandos, la clasificación de timeout/abort, el entorno de terminal y la fusión de lecturas en segundo plano; la terminación de rangos gestionados, los recolectores acotados, los archivos spill, la limpieza de credenciales y la quiescencia del dispose pertenecen al [servicio de subprocess](subprocess.es.md). `dsh-tool-bash` posee el renderizado orientado al modelo y adapta los identificadores en segundo plano al [runtime genérico de tareas](jobs.es.md). `dsh-shell` posee el contrato compartido de estado de salida de las tools de shell: el `parseExitStatus`/`ParsedExitStatus` exportado invierte los marcadores `[exit code: N]` / `[killed by signal: X]` que añaden el `renderResult` de `dsh-tool-bash` y el `renderPwshResult` de `dsh-tool-pwsh`, y el `presentResult` de ambas tools lo usa para dividir el texto renderizado en el cuerpo de salida de la tarjeta de terminal y su píldora de estado de salida.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxshell--shellexecutor-abstract-seam"></a>

### `ctx.shell` — `ShellExecutor` (abstract seam)

Abstract bash execution service. Subclass, implement the abstract methods, and load the subclass as a plugin — it registers as `ctx.shell` (one implementation per context; loading a second throws, which is cordis' standard duplicate-service behavior).

execute resolves with the process handle after preparation. "Foreground" is a property of what the caller awaits, not of the spawn — a caller that awaits ShellExecution.result ran the command in the foreground; one that keeps the handle ran it in the background. A caller that waits only for a while runs the command under `onExpiry: 'none'` and bounds its own wait; the handle stays valid after the caller stops waiting.

Implementations must honor these semantics:

- ShellExecution.result rejects only for infrastructure failures. Nonzero exits, timeout kills, and abort kills resolve with a descriptive result: first-cause `timedOut`/`aborted`, the spec's `timeoutMs` echoed.
- The handle is published after preparation. `done` settles at process close and never rejects; spawn failures settle as `killed` with the error on the read path, while `result()` carries the same failure as its rejection.
- `onExpiry: 'none'` arms no deadline; `'kill'` kills at expiry. Expiry during preparation returns a settled timed-out handle without output.
- ShellProcess.readOutput is incremental: consecutive reads never repeat output. Lossy reads report truncation and available spill files.
- A still-running process is stopped and awaited when its owning composition tears down. With the subprocess seam that boundary is `ctx.subprocess` disposal, so a process survives an executor-only reload.

```ts cordis-catalog
/**
 * Apply implementation-owned defaults and caps to a request before execution.
 * @param request - the caller's request; omitted fields get this
 *   implementation's defaults, capped fields are clamped.
 * @returns the fully-specified spec to hand to {@link execute}.
 */
abstract resolve(request: ShellExecRequest): ShellExecSpec

/**
 * Prepare and spawn the command under its resolved deadline.
 * @param spec - a resolved spec from {@link resolve}, never a raw request.
 * @returns the prepared handle, including its result projection;
 *   preparation timeout yields an already-settled handle with no output.
 * @throws on preparation failure or caller cancellation before process publication.
 */
abstract execute(spec: ShellExecSpec): Promise<ShellExecution>
```

Source: [`packages/shell/shell/src/index.ts`](../../packages/shell/shell/src/index.ts)

<a id="ctxshellenv--shellenvregistry"></a>

### `ctx.shellEnv` — `ShellEnvRegistry`

Registry (`ctx.shellEnv`) for trusted, per-execution `DSH_*` variables. The namespace is rebuilt for every model shell call: ambient `DSH_*` values are discarded by the executor, then the registry's current snapshot is injected. Built-in shell facts remain owned by the registry itself while plugins can register additional, enumerable facts with effect-scoped disposal.

```ts cordis-catalog
/**
 * Register one environment contributor. Names and keys are unique; built-in
 * keys are reserved. Registration is disposed with the calling plugin fiber.
 * @param contributor - declared key ownership and per-execution resolver.
 * @returns the disposer that unregisters the contribution.
 */
register(contributor: BashEnvContributor): () => void

/**
 * Build the trusted `DSH_*` snapshot for one shell tool execution.
 * @param execution - the current tool execution.
 * @returns an immutable environment overlay containing built-ins and current contributions.
 */
collect(execution: ToolExecution): DshEnvironment

/**
 * Enumerate plugin-contributed variables without executing their resolvers.
 * @returns declarations sorted by environment variable name.
 */
list(): BashEnvVariableInfo[]
```

Types: [DshEnvironment](subprocess.es.md) · [ToolExecution](tools.es.md)

Source: [`packages/shell/shell-env/src/index.ts`](../../packages/shell/shell-env/src/index.ts)
<!-- END GENERATED cordis-surface -->
