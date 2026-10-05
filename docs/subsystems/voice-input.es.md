# Entrada de voz

[English](voice-input.md) | Español

El reconocimiento de voz experimental tiene tres roles: la [Service Definition](../../packages/experimental/speech-to-text/README.md) enruta proveedores nombrados, el [proveedor SenseVoice](../../packages/experimental/speech-to-text-sensevoice/README.md) posee la inferencia (inference) local, y el [consumidor Remote](../../packages/experimental/api-speech-to-text/README.md) sirve al navegador. El [bundle opcional](../../packages/experimental/voice-input-bundle/README.md) los compone con la interfaz del micrófono.

## Selección de proveedor

`SpeechProviderId` marca la identidad de registro. `SpeechProviderInfo` lleva un nombre visible, pistas de `languages` aceptados y la ubicación de procesamiento `host-local` o `cloud`. `SpeechRequest` contiene bytes WAV y una selección opcional de proveedor/idioma; `resolve()` produce un `SpeechSpec` con una instancia de proveedor capturada. Un proveedor ausente o un idioma no soportado falla; el reemplazo o el retiro invalida el trabajo resuelto. El audio nunca recae en un proveedor distinto.

`SpeechProvider.transcribe()` acepta un `SpeechInput` completo y un `AbortSignal`. `Transcript` devuelve `text` plano, `audioSeconds` e `inferenceSeconds`. Los proveedores respetan la cancelación y liquidan su trabajo antes de que se complete el retiro del registro. El proveedor local serializa las llamadas, acota su cola y gestiona el ciclo de vida de su worker con independencia de las sesiones.

## Propiedad del navegador y del Host

El navegador posee las pistas del micrófono y el borrador no enviado. `TranscriptionRequest` envía WAV PCM16 canónico en base64 a través del Remote autenticado. `SpeechCatalog` anuncia los proveedores disponibles, la selección por defecto y los límites de bytes/duración de grabación. La API valida esta entrada del proceso antes del reconocimiento.

La fachada de entrada captura una selección con revisión antes de grabar. `InputActions.insertText()` inserta una edición de texto plano deshacible solo mientras la revisión de la selección sigue vigente y el envío permite editar. Una inserción rechazada deja el transcript (transcripción) disponible para una inserción explícita. Cambiar de sesión o hacer dispose del plugin invalida los resultados tardíos. El reconocimiento en sí no escribe ningún evento de sesión; el envío ordinario del usuario posee el texto final visible para el modelo.

## Preparación y configuración

`SpeechProviderInfo.downloadSources` anuncia los orígenes de preparación. `SpeechPreparationOptions.downloadSource` selecciona uno para una tarea; omitirlo preserva la política del proveedor. SenseVoice valida la elección anunciada, fija una fuente manual sin fallback y rechaza cambios de fuente durante una preparación activa. La UI conserva una elección para los reintentos en la tarjeta actual; no es una preferencia de reconocimiento persistida.

El proveedor del Host posee una tarea de preparación a través de los cambios de página y de sesión. El Client comparte una suscripción `follow()` entre el compositor, el prompt de configuración y los detalles del bundle. Los metadatos opcionales `SpeechSetupEstimate` aportan pistas de planificación específicas del proveedor, separadas del progreso medido. `SpeechPreparationStepKind` identifica operaciones de recursos ordenadas; `SpeechPreparationStep` registra cada estado y hora de inicio. El `SpeechPreparationState` completo conserva estos pasos tras una cancelación o un fallo. La UI contraída muestra la operación actual; al expandirla enumera todos los pasos, con progreso en bytes o tiempo transcurrido solo para el paso en ejecución. Cerrar un observador nunca cancela la preparación. Los archivos verificados sobreviven a los reintentos y a la reclamación del worker inactivo.

Una preparación fallida puede incluir `SpeechDownloadFailure` con el recurso, el origen de la fuente, la razón clasificada y un código de diagnóstico o estado HTTP opcionales. El Client localiza el consejo de recuperación; las causas de descarga sin procesar permanecen en el Host.

El micrófono ocupa `conversation.input.activity`, entre el selector de modelo y Enviar. Hacer clic inicia la captura y expande la barra de herramientas; Detener transcribe e inserta en el borrador. La actividad preserva el editor y la acción de envío, posee la retroalimentación local y libera la expansión al desmontarse. Cancelar, Escape u ocultar la página descarta la captura. El historial de forma de onda muestra la amplitud medida del micrófono. Los detalles del bundle contienen las preferencias de reconocimiento, el estado de preparación y el progreso. La activación explícita usa `plugins.bundle.activation` para guiar a los usuarios con modelos faltantes hacia la configuración; la lista muestra solo la descripción del bundle y el interruptor.

## Justificación del diseño

La [decisión de entrada de voz](../../.agents/notes/implemented/architecture/2026-09-16-experimental-voice-input.md) explica el audio transitorio, la selección explícita de proveedor y la preparación local diferida.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxspeechcontroller--speechcontroller"></a>

### `ctx.speechController` — `SpeechController`

Speech calls never activate or submit to an Agent.

```ts cordis-catalog
/**
 * Read provider choices without preparing a recognizer.
 * @returns available providers, resolved default, and recording limits.
 */
@Remote catalog(): SpeechCatalog

/**
 * Follow provider readiness independently of Session and preparation lifetimes.
 * @param signal - Client observation lifetime.
 * @returns initial and subsequent complete readiness snapshots.
 */
@Remote({ mode: 'stream' }) async *follow(signal: AbortSignal): AsyncIterable<SpeechCatalog>

/**
 * Persist the user's recognition preferences.
 * @param patch - changed preference fields.
 * @returns after preferences are saved.
 */
@Remote configure(patch: SpeechSelectionPatch): Promise<void>

/**
 * Start or join one Host-owned preparation task.
 * @param providerId - selected recognizer.
 * @param options - task-local source selection validated by the provider.
 */
@Remote prepare(providerId: SpeechProviderId, options?: SpeechPreparationOptions): void

/**
 * Explicitly cancel resource preparation.
 * @param providerId - selected recognizer.
 * @returns after the preparation task settles.
 */
@Remote cancelPreparation(providerId: SpeechProviderId): Promise<void>

/**
 * Validate and transcribe one recording through the explicit provider selection.
 * @param request - canonical WAV encoded as base64, provider id and language hint.
 * @param signal - Client cancellation or Remote contribution disposal.
 * @returns final transcript without adding a Session event.
 */
@Remote async transcribe(request: TranscriptionRequest, signal: AbortSignal): Promise<Transcript>
```

Source: [`packages/experimental/api-speech-to-text/src/index.ts`](../../packages/experimental/api-speech-to-text/src/index.ts)

<a id="ctxspeechtotext--speechtotext"></a>

### `ctx.speechToText` — `SpeechToText`

Registry shared by all transcription consumers in one Host composition.

```ts cordis-catalog
/**
 * Register one recognizer; duplicate ids fail without replacing the original.
 * @param provider - recognizer owned by the contributing fiber.
 * @returns idempotent disposer which rejects admission, cancels, and joins accepted work.
 */
register(provider: SpeechProvider): () => Promise<void>

/**
 * Read the current recognizer roster.
 * @returns available provider facts in registration order.
 */
listProviders(): readonly SpeechProviderInfo[]

/**
 * Observe complete readiness snapshots; a slow reader coalesces intermediate progress.
 * @param caller - observer lifetime, independent of any preparation task.
 * @returns an initial snapshot followed by the latest provider states.
 */
async *follow(caller: AbortSignal): AsyncIterable<SpeechSnapshot>

/**
 * Read provider readiness and current user preferences together.
 * @returns one detached complete observation.
 */
snapshot(): SpeechSnapshot

/**
 * Persist changed selection fields into this plugin's profile entry; the resulting language must be accepted by the selected provider.
 * @param patch - explicit provider or language changes.
 * @returns after the profile write and the live update it applies.
 */
async configure(patch: SpeechSelectionPatch): Promise<void>

/**
 * Start or join provider-owned preparation.
 * @param id - exact registered provider identity.
 * @param options - task-local source selection validated by the provider.
 */
prepare(id: SpeechProviderId, options?: SpeechPreparationOptions): void

/**
 * Explicitly cancel provider preparation without tying it to a browser connection.
 * @param id - exact registered provider identity.
 * @returns after the preparation task settles.
 */
async cancelPreparation(id: SpeechProviderId): Promise<void>

/**
 * Apply composition defaults and capture the selected provider. Missing providers and unsupported languages fail explicitly.
 * @param request - complete recording and optional selection.
 * @returns provider-pinned input for transcribe().
 */
resolve(request: SpeechRequest): SpeechSpec

/**
 * Execute exactly the resolved provider; no fallback sends audio elsewhere.
 * @param spec - resolved input; a withdrawn or replaced registration is rejected.
 * @param signal - caller cancellation.
 * @returns final transcript after provider settlement.
 */
async transcribe(spec: SpeechSpec, signal: AbortSignal): Promise<Transcript>
```

Source: [`packages/experimental/speech-to-text/src/index.ts`](../../packages/experimental/speech-to-text/src/index.ts)
<!-- END GENERATED cordis-surface -->
