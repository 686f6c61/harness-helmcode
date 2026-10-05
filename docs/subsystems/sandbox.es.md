# Sandbox de procesos

[English](sandbox.md) | Español

El seam de sandbox de procesos de [dsh-sandbox](../../packages/sandbox/sandbox) envuelve el argv de un subproceso que comparte sistema de archivos y kernel con el anfitrión en una política de efectos sobre archivos sin acoplar a los consumidores a un runner de plataforma. [dsh-sandbox-local](../../packages/sandbox/sandbox-local) suministra el backend de bwrap/Landlock en Linux, Seatbelt en macOS y token restringido ACL en Windows; [dsh-bash-sandbox](../../packages/shell/bash-sandbox) y [dsh-pwsh-sandbox](../../packages/shell/pwsh-sandbox) lo consumen. [dsh-sandbox-ssh](../../packages/ssh/sandbox-ssh/README.md) aplica la misma política a través de un backend remoto emparejado con los proveedores de sistema de archivos y subprocesos de SSH.

Fuente: [`packages/sandbox/sandbox/src/index.ts`](../../packages/sandbox/sandbox/src/index.ts)

## Modos y aplicación

`SandboxMode` solo gobierna los efectos sobre el sistema de archivos. `read-only` pide al backend que deniegue las escrituras: los runners POSIX conceden además el sumidero `/dev/null` que sus shells requieren, mientras que el runner ACL de Windows no concede ninguna raíz escribible explícita e informa de aplicación parcial por sus lagunas de ACL ambientales; `workspace-write` permite escrituras bajo la raíz del espacio de trabajo y el área temporal prometida por el backend; `danger-full-access` evita el confinamiento. La visibilidad de red y de procesos queda fuera de este vocabulario.

```ts type-equiv
/**
 * File-effect policy for confined processes. `read-only` permits only required
 * sinks such as `/dev/null`; `workspace-write` also permits the workspace and a
 * backend-defined temp area; `danger-full-access` bypasses confinement. Network
 * and process visibility are outside this vocabulary.
 */
type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access'
```

Solo los dos primeros modos pueden enviarse a un proveedor. Un consumidor `danger-full-access` hace spawn de su argv original y no llama a `ctx.sandbox`.

```ts type-equiv
/** A confining (non-`danger-full-access`) mode — the modes a {@link SandboxPolicy} can carry. */
type ConfinedSandboxMode = Exclude<SandboxMode, 'danger-full-access'>
```

La aplicación es un hecho informado. `full` significa que el backend gobierna cada efecto sobre archivos prometido por el modo; `partial` significa que un backend activo o un ABI de kernel más antiguo solo gobierna un subconjunto, de modo que los consumidores que requieren la promesa absoluta deben rechazar o hacer visible esa distinción. Los ABI de Landlock más antiguos y las fronteras de enlaces duros, lecturas sin confinar y ACL de AppContainer del runner ACL de Windows son casos parciales actuales.

```ts type-equiv
/**
 * Enforcement completeness for this host. `partial` means an active backend or
 * older kernel ABI cannot govern every promised file effect; callers requiring
 * an absolute boundary must not treat it as `full`.
 */
type SandboxEnforcement = 'full' | 'partial'
```

## Política por llamada

La política de ejecución completa se resuelve y se porta por llamada de capacidad. Incluye `danger-full-access` para que un consumidor pueda resolver la política una vez antes de decidir si evita el confinamiento. Las llamadas de tool normales derivan `workspaceRoot` del cwd inmutable de la sesión llamante; la configuración del despliegue es el recurso sin agent. El resolvedor conserva la grafía absoluta del mundo de ejecución. Los proveedores que aplican canonicalizan la raíz donde existen los archivos, de modo que un cwd que contiene `symlink/..` identifica el directorio donde el proveedor de subprocesos emparejado se ejecuta realmente.

```ts type-equiv
/**
 * The complete file-effect policy resolved for one capability call. The root
 * is carried even under modes that do not consume it so callers can resolve
 * policy once before choosing the enforcement path.
 */
interface SandboxExecutionPolicy {
  /** The file-effect mode this execution runs under. */
  mode: SandboxMode
  /** Absolute root directory `workspace-write` may write under. */
  workspaceRoot: string
  /**
   * Opaque identity of the calling session (the branded `dsh-session`
   * SessionId). Backends key per-session state off it (e.g. windows-acl gives
   * each live session/workspace pair a random private temp directory and SID,
   * while the workspace SID and standing grant remain per-workspace); absent
   * for agentless calls, which fall back to per-call backend state.
   */
  sessionId?: SessionId
}
```

`ctx.sandboxPolicy.resolve()` acepta la sesión activa y, para un reintento aprobado, un modo explícito. El servicio posee la precedencia y el recurso de raíz para que bash y fs no los repitan.

```ts type-equiv
/** Inputs that select the sandbox policy for one capability call. */
interface SandboxPolicyRequest {
  /** Calling session; its immutable cwd becomes the workspace boundary. */
  session?: Session
  /** Explicit approved mode override, which outranks session policy. */
  mode?: SandboxMode
}
```

Solo una ejecución confinada llega a `ctx.sandbox`; su política de proveedor estrecha el modo conservando la misma raíz. Esto permite que sesiones, consumidores y reintentos escalados de una sola vez concurrentes pidan al mismo proveedor fronteras distintas sin mutar el estado del proveedor.

```ts type-equiv
/**
 * What one confined execution is allowed to touch — carried PER CALL, not
 * fixed on the provider: two consumers may confine under different policies
 * at the same instant (bash under `read-only` while a confined child agent
 * needs its state directory writable), and an approved escalated retry is a
 * new call with a wider policy. Defaulting/resolution is an explicit step at
 * the consumer boundary; the provider treats the policy as fully specified.
 */
interface SandboxPolicy extends SandboxExecutionPolicy {
  /** The file-effect mode this execution runs under. */
  mode: ConfinedSandboxMode
}
```

<a id="wrapped-argv-and-classification-dialects"></a>

## Argv envuelto y dialectos de clasificación

`RunnerFailureRule` combina evidencia de que un runner falló antes de ejecutar el comando. Un consumidor requiere una salida distinta de cero, la puerta opcional de códigos de salida permitidos y una firma fatal insensible a mayúsculas dentro de una línea de stderr restante. Las exclusiones informativas exactas de línea completa insensibles a mayúsculas se eliminan primero, de modo que un aviso benigno del runner no puede probar un fallo por sí solo. La línea coincidente permanece disponible como detalle del error; la clasificación no reescribe stderr.

```ts type-equiv
/**
 * Evidence that identifies a sandbox runner failing before it executes the
 * wrapped command. A consumer first applies {@link allowedExitCodes} when
 * present, removes {@link informationalLines} by case-insensitive exact line
 * equality, then matches {@link fatalSignatures} case-insensitively within
 * each remaining stderr line. Exit status alone never proves runner failure.
 */
interface RunnerFailureRule {
  /** Nonzero process exit codes on which this rule may match; omitted permits any nonzero exit. */
  allowedExitCodes?: readonly number[]
  /** Non-empty substrings identifying a fatal runner diagnostic on one stderr line. */
  fatalSignatures: readonly string[]
  /** Benign stderr lines excluded by exact full-line equality before fatal matching. */
  informationalLines?: readonly string[]
}
```

`ConfinedArgv` es lo que el consumidor lanza con spawn. Además del argv de reemplazo, porta el hecho de aplicación del backend y dos clasificadores de stderr ortogonales. `denialSignatures` identifica que el comando confinado fue bloqueado mientras el sandbox funciona correctamente. `runnerFailureRules` identifica que el runner del sandbox se niega o falla antes de ejecutar el comando; los consumidores comprueban estos primero y muestran un fallo de infraestructura del sandbox, nunca un fallo ordinario de tarea.

```ts type-equiv
/**
 * A {@link SandboxProvider.confine} result: the argv to spawn in place of
 * the caller's own, plus the enforcement completeness the selected backend
 * achieves for it.
 */
interface ConfinedArgv {
  /** The wrapped argv (runner, profile, separator, then the caller's argv). */
  argv: string[]
  /** How completely the selected backend enforces the policy's file effects. */
  enforcement: SandboxEnforcement
  /**
   * The selected backend's denial DIALECT: the case-insensitive stderr
   * substrings a file effect denied by THIS backend produces (EROFS text
   * under bwrap's read-only binds, EACCES under Landlock, EPERM under
   * Seatbelt). A consumer that infers denials from a failed run's stderr
   * matches against exactly these rather than a cross-backend union — the
   * union claims denials a given backend never produces.
   */
  denialSignatures: readonly string[]
  /**
   * Structured runner-failure evidence rules. Consumers require a matching
   * fatal stderr line (after informational exclusions) and any rule-specific
   * exit-code gate before checking denial signatures: runner failure means the
   * command never ran, while denial means confinement worked and blocked it.
   */
  runnerFailureRules: readonly RunnerFailureRule[]
}
```

El [proveedor local](../../packages/sandbox/sandbox-local/README.md) posee la configuración del operador y mapea su dialecto de runner a estas reglas. El [consumidor bash en sandbox](../../packages/shell/bash-sandbox/README.md) posee el spawn y la atribución de resultados.

## Proveedor y errores de fallo cerrado

`await ctx.sandbox.confine(argv, policy, signal)` resuelve las rutas de la política y devuelve un `ConfinedArgv` del mundo de ejecución, o se rechaza con `SandboxUnavailableError` y código `SANDBOX_UNAVAILABLE` cuando no existe ningún backend utilizable. La señal opcional cancela la resolución antes del lanzamiento. Los consumidores también pueden clasificar un fallo al lanzar con spawn u observar el argv devuelto; esa atribución pertenece al contrato del consumidor. El paso directo silencioso sin confinar nunca es legal para una política confinada.

La selección de proveedor, el sondeo, el cacheado y los informes de aplicación específicos del backend pertenecen al [proveedor local](../../packages/sandbox/sandbox-local/README.md).

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxsandbox--sandboxprovider-abstract-seam"></a>

### `ctx.sandbox` — `SandboxProvider` (abstract seam)

Abstract process-sandbox service. confine must return enforcing argv or fail closed at wrap or runner-execution time; silent unconfined passthrough is forbidden. Functional probes arbitrate multi-runner chains and may be skipped for a sole candidate, whose own refusal remains the fail-closed end.

```ts cordis-catalog
/**
 * Wrap `argv` so it executes confined under `policy` on this host; the
 * caller spawns the returned argv in place of its own.
 * @param argv - the exact argv the caller is about to spawn (program plus
 *   arguments), NOT a shell string — a shell-shaped consumer passes
 *   `['bash', '-c', command]`.
 * @param policy - the file-effect policy this execution runs under,
 *   carried per call (see {@link SandboxPolicy}).
 * @param signal - cancellation while the provider resolves the policy and runner.
 * @returns the argv to spawn instead, plus the enforcement completeness
 *   the selected backend achieves for it.
 */
abstract confine(argv: readonly string[], policy: SandboxPolicy, signal?: AbortSignal): Promise<ConfinedArgv>
```

Source: [`packages/sandbox/sandbox/src/index.ts`](../../packages/sandbox/sandbox/src/index.ts)

<a id="ctxsandboxpolicy--sandboxpolicyservice"></a>

### `ctx.sandboxPolicy` — `SandboxPolicyService`

The sandbox-policy service (`ctx.sandboxPolicy`). Owns the deployment default mode, fallback workspace root, and current request-time policy section. Tool layers call resolve for each execution so a session's mode log and immutable cwd travel together to every enforcing capability.

```ts cordis-catalog
/**
 * Resolve the complete policy for one capability call. An approved explicit
 * mode outranks the session's last `sandbox/mode` event, which outranks the
 * deployment default. A session cwd is its workspace-write boundary; the
 * configured root is the fallback for agentless calls and sessions without a
 * cwd.
 * @param request - optional session and approved mode override.
 * @returns the fully resolved per-call mode and absolute workspace root.
 */
resolve(request: SandboxPolicyRequest = {}): SandboxExecutionPolicy

/**
 * Read the session override without applying the deployment default.
 * @param session - session whose log supplies the override.
 * @returns the last logged mode, or `undefined` without one.
 */
overrideOf(session: Session): SandboxMode | undefined
```

Types: [Session](session.es.md)

Source: [`packages/sandbox/sandbox-policy/src/index.ts`](../../packages/sandbox/sandbox-policy/src/index.ts)
<!-- END GENERATED cordis-surface -->
