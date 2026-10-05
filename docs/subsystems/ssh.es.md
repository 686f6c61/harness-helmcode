# SSH

[English](ssh.md) | Español

La [familia de proveedores SSH](../../packages/ssh/README.md) suministra un mundo remoto de archivos y procesos a través de una conexión OpenSSH propiedad del despliegue. El Harness, el transporte del modelo y el almacenamiento de sesiones permanecen en el anfitrión. La familia implementa las API existentes de sistema de archivos, subprocesos y sandbox; no introduce tools de modelo específicas de SSH.

## Coordenadas de ejecución

Las identidades del sistema de archivos, la búsqueda de ejecutables, el cwd de los procesos, las raíces de espacio de trabajo del sandbox y las URL de archivos de los servidores de lenguaje se refieren al host SSH. Los proveedores canonizan las rutas donde existen los archivos, preservando la interpretación que el sistema de archivos hace de `symlink/..`. El resolvedor de políticas porta la grafía absoluta del mundo de ejecución sin intentar resolver rutas remotas en el host del Harness.

`processPath()` suministra una ruta utilizable por el proveedor de subprocess emparejado. `processPathFromHostPath()` sigue sin estar disponible para SSH; instalar un artefacto remoto no hace portable una ruta arbitraria del host. Por ello, [`NodePtcRuntime`](../../packages/ptc-runtime/ptc-runtime-node/README.md) toma un bootstrap remoto explícitamente instalado y verificado por digest.

## Transporte y confianza

La RPC administrativa usa los flujos exec de SSH del helper. La stdin, stdout y stderr ordinarias, la salida de terminal y el tráfico opcional de control por el fd 7 usan sockets Unix reenviados y autenticados por separado. Cada flujo reenviado tiene su propia ventana de canal SSH; la salida pausada de un programa no comparte la ventana de control ni la administrativa. Todos los canales siguen compartiendo el ancho de banda de la conexión y los fallos de transporte.

La autenticación del despliegue, la verificación de artefactos instalados y la autenticación TLS por flujo pertenecen a [`dsh-ssh`](../../packages/ssh/ssh/README.md). El helper ejecuta las solicitudes de sistema de archivos y de procesos con proveedores locales de confianza en la máquina remota. SSH es un transporte; el proveedor de sandbox remoto seleccionado es quien aplica los efectos sobre archivos.

## Vida de los procesos y cancelación

Un proceso se reserva antes de conectar sus flujos, y el lanzamiento se acepta como máximo una vez. `done` informa del resultado directo; `waitForExit` observa el rango gestionado remoto. Las operaciones de terminal conservan la API compartida asíncrona. La cancelación de la preparación, la terminación de un proceso lanzado y el dispose (liberación de recursos) del proveedor liberan sus recursos propios a través del helper.

Los plazos administrativos acotan observaciones RPC individuales; no sustituyen el plazo de ejecución elegido por un consumidor de Bash o de ptc-runtime. Las esperas remotas pueden permanecer pendientes mientras otras solicitudes avanzan. La pérdida de SSH invalida las operaciones pendientes; el EOF del helper, las señales y el vencimiento de la concesión inician la limpieza remota. El cliente informa con honestidad de los resultados no confirmados y nunca se reconecta para reejecutar una acción posiblemente ya ejecutada.

## Ámbito de composición

La ejecución headless registra y comprueba el cwd de la sesión a través del proveedor de sistema de archivos montado. Por tanto, los consumidores remotos de FS, Bash, terminal, LSP y PTC pueden compartir esas coordenadas. Las vistas de espacio de trabajo web que asumen acceso al sistema de archivos del host necesitan una integración aparte; sustituir proveedores no basta para hacer esas vistas conscientes del mundo remoto.

Véase el [registro de decisión](../../.agents/notes/implemented/architecture/2026-09-11-posix-ssh-runtime.md) para las alternativas y las obligaciones de verificación.

## API de conexión

```ts type-equiv
/** Deployment-owned SSH identity and installed helper; no model argument selects these values. */
interface Config {
  /** OpenSSH host alias, including its existing user, key and known-host configuration. */
  host: string
  /** Absolute remote Node executable. */
  node: string
  /** Absolute path to the installed, bundled helper entry. */
  helper: string
  /** SHA-256 of that bundled helper; mismatches refuse the connection. */
  helperHash: string
  /** Absolute remote default workspace. */
  workspace: string
  /** Optional preinstalled built PTC entry, paired with its expected digest. */
  bootstrapPath?: string
  /** SHA-256 of bootstrapPath; both fields must be supplied together. */
  bootstrapHash?: string
  /** Connection and administrative-request deadline, at most 2,147,483,647 milliseconds. */
  requestTimeoutMs?: number
  /** Maximum JSON payload bytes per helper request or response. */
  maxFrameBytes?: number
  /** Maximum ordinary requests; heartbeat and bounded resource cleanup have reserved capacity. */
  maxPending?: number
  /** Remote helper lease; loss of heartbeats starts remote managed cleanup. */
  leaseMs?: number
}
```

```ts public-api
/** One non-reconnecting SSH session; loss invalidates all active operations. */
declare class SshConnection extends Service {
  static Config: schema<Config>;
  /** Verified remote helper coordinates; callers must await this before launch. */
  readonly ready: Promise<Hello>;
  constructor(ctx: Context, config: Config);
  /** Hold plugin readiness until the remote identity and helper digest are verified. */
  async [Service.init](): Promise<void>;
  /** Verified remote Node executable for the paired PTC runtime. */
  get nodeExecutable(): string;
  /** Verified preinstalled PTC entry; unconfigured runtimes fail before program execution. */
  get bootstrapPath(): string;
  /**
     * Send a helper operation; cancellation never replays an ambiguous mutation.
     * @param method - the private helper operation.
     * @param params - JSON request fields validated by the helper.
     * @param result - response validation before returning provider-visible data.
     * @param signal - cancellation, which does not undo completed remote effects.
     * @param wait - allow a process observation to outlast the administrative deadline.
     * @returns the validated remote result.
     */
  async request<T>(method: string, params: unknown, result: z.ZodType<T>, signal?: AbortSignal, wait: boolean = false): Promise<T>;
  /**
     * Forward one authenticated stream through an independent SSH channel.
     * @param endpoint - private coordinates issued by this connection's helper.
     * @param signal - cancellation of allocation and the resulting socket.
     * @returns a paused socket; attach a consumer before resuming it.
     */
  async connectStream(endpoint: SshStreamEndpoint, signal?: AbortSignal): Promise<Socket>;
  /** Tear down the helper's remote managed ranges before releasing the SSH master when reachable. */
  dispose(): Promise<void>;
}
```

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxssh--sshconnection"></a>

### `ctx.ssh` — `SshConnection`

One non-reconnecting SSH session; loss invalidates all active operations.

```ts cordis-catalog
/**
 * Send a helper operation; cancellation never replays an ambiguous mutation.
 * @param method - the private helper operation.
 * @param params - JSON request fields validated by the helper.
 * @param result - response validation before returning provider-visible data.
 * @param signal - cancellation, which does not undo completed remote effects.
 * @param wait - allow a process observation to outlast the administrative deadline.
 * @returns the validated remote result.
 */
async request<T>(method: string, params: unknown, result: z.ZodType<T>, signal?: AbortSignal, wait: boolean = false): Promise<T>

/**
 * Forward one authenticated stream through an independent SSH channel.
 * @param endpoint - private coordinates issued by this connection's helper.
 * @param signal - cancellation of allocation and the resulting socket.
 * @returns a paused socket; attach a consumer before resuming it.
 */
async connectStream(endpoint: SshStreamEndpoint, signal?: AbortSignal): Promise<Socket>

/** Tear down the helper's remote managed ranges before releasing the SSH master when reachable. */
dispose(): Promise<void>
```

Source: [`packages/ssh/ssh/src/index.ts`](../../packages/ssh/ssh/src/index.ts)
<!-- END GENERATED cordis-surface -->
