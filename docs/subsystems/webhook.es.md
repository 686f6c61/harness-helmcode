# Runtime de Webhook

[English](webhook.md) | Español

El subsistema Webhook convierte entregas externas autenticadas en sesiones raíz ordinarias opcionales. Los adaptadores de proveedor son dueños de la autenticación y de la ingesta genérica de JSON; las reglas programáticas de confianza son dueñas de las condiciones y de las llamadas externas; `ctx.webhookRuntime` es dueño del ciclo de vida de los callbacks y de la creación de sesiones respaldadas por Workspace. La [decisión implementada](../../.agents/notes/implemented/feature/2026-08-22-fire-and-forget-webhook-sessions.md) registra por qué el runtime no conserva estado de entregas ni de finalización.

## Valores compartidos

`WebhookRuleId`, `WebhookSourceId` y `WebhookDeliveryId` son cadenas opacas. Un id de entrega solo registra el identificador del proveedor: el runtime ni lo almacena ni lo deduplica.

`WebhookEventMap` es extensible por merge según el tipo de proveedor. `WebhookEventOf<K>` selecciona un evento de proveedor conocido y, en caso contrario, admite JSON genérico sin pérdidas, lo que permite un adaptador fuera del árbol sin modificar el paquete del runtime.

`VerifiedWebhookDelivery<K>` contiene `kind`, el `source` configurado, el `deliveryId` del proveedor, el `event` normalizado y un `receivedAt` entero seguro no negativo. El runtime valida, desconecta y congela el valor completo antes de despacharlo a más de una regla.

`WebhookRule<K>` contiene un id único, el tipo de proveedor y `run(delivery, signal)`. El callback puede ejecutar código arbitrario de confianza. Devuelve `null` o un `WebhookSessionRequest`, y debe observar la señal para el trabajo asíncrono que debe detenerse cuando el registro se descarga.

`WebhookSessionRequest` exige un `workspacePath` absoluto, título, prompt de texto, preset de agent y preset de permisos. El `model` opcional nombra una ruta explícita de proveedor/modelo más un límite opcional de tokens de salida y usa el valor por defecto de razonamiento de ese adaptador. Omitirlo hace un snapshot de la selección de despliegue actual completa, incluida la intensidad de razonamiento, hasta que la primera solicitud registra su cabecera durable.

## Despacho fire-and-forget

`dispatch()` hace un snapshot de las reglas coincidentes, programa cada una de forma independiente y retorna antes de que se resuelva cualquier callback. Los throws y rechazos se contienen por regla. La liberación (dispose) del registro elimina la regla antes de abortar y drenar sus llamadas activas, de modo que ninguna entrega posterior pueda entrar en código que se está descargando.

El runtime no tiene cola, reintento, deduplicación, estado de ejecución, replay tras fallo, listener de estado de Agent ni resultado de finalización. Una entrega repetida puede crear sesiones repetidas. La única tabla de operaciones activas es contabilidad privada de teardown y desaparece con el proceso.

## Creación de la sesión

Un resultado no nulo se copia en snapshot antes del preflight asíncrono. El runtime valida los presets de permisos y de agent, resuelve o crea el Workspace canónico, crea un Agent cuya cwd de sesión es la ruta del Workspace, monta el preset de agent seleccionado antes de la publicación, y adjunta la sesión de forma durable antes de aplicar permisos, título y el follow-up inicial.

El follow-up es un mensaje durable normal de rol usuario con `source.kind: "webhook"` y los identificadores de proveedor, fuente, entrega y regla. Su inserción aceptada en el inbox confirma la operación del webhook. El runtime no vacía ni espera el turno de forma especial; después se aplican la persistencia ordinaria de la sesión y el ciclo de vida del Agent.

Un fallo en el adjunto libera el nuevo Agent antes de que exista un prompt. Un fallo entre el adjunto y la admisión del prompt intenta desconectar el Workspace y liberar el Agent sin reemplazar el error original. Un Workspace creado automáticamente durante el preflight permanece porque otro llamante concurrente puede estar usándolo ya.

## Adaptador de GitHub

`@deepseek-ai/dsh-webhook-github` registra una ruta exacta en un WebServer inyectado, resuelve su referencia de credencial en cada solicitud, verifica el cuerpo `application/json` intacto antes de parsearlo, y devuelve `202` inmediatamente después del despacho en memoria. Su evento normalizado garantiza un objeto JSON sin pérdidas firmado; las reglas validan los campos específicos del evento que consumen.

La [guía de revisión de GitHub](../user/guide/github-review.es.md) monta esta ruta en un segundo WebServer aislado para que exponer el ingreso de webhooks no exponga la API del navegador.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxwebhookruntime--webhookruntime"></a>

### `ctx.webhookRuntime` — `WebhookRuntime`

Fire-and-forget rule runtime. Session creation is the only built-in action.

```ts cordis-catalog
/**
 * Register one trusted programmatic rule.
 * @param rule - unique id, provider kind, and arbitrary callback.
 * @returns awaitable effect disposer that aborts and drains this rule's active callbacks.
 */
register<K extends string>(rule: WebhookRule<K>): () => Promise<void>

/**
 * Start every currently matching rule and return before any callback settles.
 * @param delivery - authenticated provider data; snapshotted before dispatch.
 * @throws synchronously when the runtime is closing or the delivery is malformed.
 */
dispatch<K extends string>(delivery: VerifiedWebhookDelivery<K>): void
```

Source: [`packages/webhook/webhook/src/index.ts`](../../packages/webhook/webhook/src/index.ts)
<!-- END GENERATED cordis-surface -->
