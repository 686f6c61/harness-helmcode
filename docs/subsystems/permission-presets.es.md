# Presets de permisos

[English](permission-presets.md) | Español

La capa de presets de permisos de [dsh-permission-presets](../../packages/interaction/permission-presets) (`ctx.permissionPresets`, `PermissionPresetService`) agrupa los dos controles de aplicación independientes, el [modo de sandbox](sandbox.es.md) (`sandbox/mode`) y la [política de aprobación](approval.es.md) (`approval/policy`), en presets con nombre que un cliente ofrece como un único selector de Permisos. La tabla configurada posee los valores por defecto de las sesiones futuras, mientras que el hook fijo `registerAuto(admit)` permite a la integración [Auto review](../../packages/experimental/auto-review/README.md) publicar su opción limitada a la sesión actual durante un tiempo de vida de efecto. La capa es opcional y no posee ninguna política de ejecución: la narración del prompt y la reproducción siguen leyendo el fold de sus controles, mientras que Auto review posee la aplicación adicional. El [README del paquete](../../packages/interaction/permission-presets/README.md) posee el estado de composición y las limitaciones; el [diseño de cambio de sandbox](../../.agents/notes/implemented/feature/2026-07-06-sandbox.md) posee la justificación original de los controles.

Fuente: [`packages/interaction/permission-presets/src/index.ts`](../../packages/interaction/permission-presets/src/index.ts)

## La tabla de presets

Un preset asigna una clave estable a un paquete sandbox/aprobación más una presentación de cliente opcional. La tabla configurada por defecto incluye `workspace-write` (`workspace-write` + `ask`) y `danger-full-access` (`danger-full-access` + `never`); `custom` y `auto` están reservados y no se pueden configurar.

```ts type-equiv
/** One preset's sandbox/approval bundle and optional client presentation. */
interface PresetSpec {
  /** The `sandbox/mode` value the preset writes through. */
  sandbox: SandboxMode
  /** The `approval/policy` value the preset writes through. */
  approval: ApprovalPolicy
  /** The display label a client shows for this preset; the raw table key when omitted. */
  name?: string
  /** One user-facing sentence on what the preset means; omitted when not configured. */
  description?: string
}
```

```ts type-equiv
/** The {@link PermissionPresetService} config: preset table and composition default. */
interface Config {
  /**
   * The preset table: name → knob bundle. Defaults to `workspace-write`
   * (workspace-write + ask) and `danger-full-access` (danger-full-access +
   * never). The names `custom` and `auto` are reserved for derived state and
   * the Auto review integration respectively.
   */
  presets: Record<string, PresetSpec>
  /**
   * Default for new sessions. When omitted, the preset matching the composed
   * sandbox and approval defaults is used.
   */
  defaultPreset: Volatile<string | undefined>
}
```

El servicio requiere un ejecutor `ctx.shell` con confinamiento y `ctx.approval`, y la configuración incorrecta falla en la carga del plugin: las entradas configuradas con nombre `custom` o `auto` lanzan una excepción, y componer sobre un ejecutor bash que no confina (sin el hecho de capacidad `sandboxMode`) lanza una excepción porque los presets agrupan un modo de sandbox.

## Registro fijo de Auto para la sesión actual

La integración Auto llama a `registerAuto(admit)` durante el tiempo de vida de su efecto. Este servicio fija la identidad `auto` y su paquete `danger-full-access` más `ask`, y una selección de Auto registrada también coincide con la política `never` que fijan los hijos delegados; los diccionarios de locale del cliente entregados poseen la etiqueta y la descripción de Auto, mientras que la presentación de los presets configurados sigue siendo propiedad del Host. Los llamantes no pueden publicar otro preset a través de una API de contribución genérica. Auto aparece después de los presets configurados, nunca entra en el schema de configuración `permission.defaultPreset` y desaparece cuando se libera el efecto. El callback síncrono `admit` se ejecuta antes de que la selección de Auto mute la sesión y antes de que se publique una sesión de Auto almacenada, de modo que una integración ausente o en cierre no reescribe la identidad durable.

Registrar o eliminar Auto emite la notificación sin payload `permission-presets/catalog-changed`. Los consumidores del proceso se suscriben antes de llamar a `catalog()` y después releen el catálogo seleccionable completo tras cada notificación. La proyección de sesión `permissions` solo contiene `currentValue`, de modo que los cambios de catálogo no anexan ningún evento de sesión, no publican ningún frame de proyección de sesión y dejan la secuencia de la sesión sin cambios.

## El preset actual y el `custom` derivado

`current(session)` deriva el preset efectivo a partir de la proyección `permissions` requerida. La unidad pliega el modo de sandbox de la sesión, la política de aprobación y la selección registrada; los valores ausentes en ese estado recurren al modo configurado del ejecutor y a la configuración del servicio de aprobación, y después a `ask`. Una clave de proyección ausente falla explícitamente. El servicio prefiere una selección que siga coincidiendo, incluida una selección de Auto registrada bajo la política de aprobación `never`, después la primera entrada configurada que coincida, y en otro caso devuelve `CUSTOM_PRESET` (`'custom'`). `custom` es solo derivado: los clientes pueden mostrarlo como valor actual, pero nunca es un objetivo de cambio ni un payload de evento.

`names` enumera los presets configurados en orden de declaración seguidos de Auto mientras su integración esté activa. `catalog()` devuelve esas entradas seleccionables como un snapshot a nivel de proceso. `optionOf(name)` construye una entrada disponible (su etiqueta recurre a la clave) o la presentación del `custom` derivado, y lanza una excepción para cualquier otro nombre. Los clientes combinan el catálogo con la proyección de sesión; `custom` puede etiquetar el valor actual pero nunca se convierte en una entrada del catálogo.

```ts type-equiv
/** Presentation for an available preset or the derived `custom` current value. */
interface PresetOption {
  /** Stable option value: a configured preset key, live `auto`, or derived `custom`. */
  value: string
  /** The display label. */
  name: string
  /** One user-facing sentence on what the value means; omitted when not configured. */
  description?: string
}
```

## Cambio de preset y el evento `permission/preset`

`set(session, name)` resuelve el preset (los nombres desconocidos lanzan una excepción), ejecuta la admisión de Auto cuando corresponde, anexa un evento `permission/preset` solo de registro a menos que `name` ya sea el preset efectivo, y después escribe cada control a través de su propio setter, `setSandboxMode` de [dsh-sandbox-policy](../../packages/sandbox/sandbox-policy) y `setApprovalPolicy` de [dsh-user-approval](../../packages/interaction/user-approval), solo cuando cambia el valor efectivo de ese control. El evento de selección precede a los eventos de los controles en el mismo turno, y volver a seleccionar el preset efectivo no anexa nada.

`permission/preset` es intención de usuario durable y solo de registro: permanece fuera del transcript (transcripción) del modelo (los eventos de los controles poseen las consecuencias visibles para el modelo a través de sus consumidores), y existe para que `current()` pueda conservar qué preset eligió el usuario cuando dos presets comparten un paquete. La proyección `permissions` pliega esa selección con ambos eventos de controles y conserva la frontera `session/end-seed` que distingue una semilla vacía restaurada de una sesión nueva; la reproducción no necesita estado de puesta al día ni un reescaneo del registro en bruto. Una selección `auto` restaurada requiere el registro de Auto activo antes de la publicación del Agent. La declaración completa del evento está en el [catálogo de eventos del registro de persistencia](../persistence-catalog.es.md); las firmas de los métodos están en el [catálogo de servicios](#ctxpermissionpresets--permissionpresetservice) generado.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxpermissionpresets--permissionpresetservice"></a>

### `ctx.permissionPresets` — `PermissionPresetService`

Owns the deployment's configured permission presets, the fixed Auto integration hook, and their write path. Requires a confining `ctx.shell` executor and `ctx.approval`; unmatched knob values are reported as CUSTOM_PRESET, not an error.

```ts cordis-catalog
/**
 * Read the complete process-level catalog exposed to current-session UI.
 * @returns every currently selectable preset in contribution order.
 */
@Remote('catalog') catalog(): PermissionCatalog

/**
 * Publish the fixed current-session Auto preset for the calling
 * integration's effect lifetime.
 * @param admit - synchronous gate run before live Auto selection or restore.
 * @returns the async effect disposer that removes Auto.
 */
registerAuto(admit: () => void): () => Promise<void>

/**
 * Resolve the preset matching the effective knob values. A still-matching
 * last selection wins shared-bundle ties, and a still-selected Auto also
 * matches the `never` approval policy; otherwise the first configured
 * match wins. Returns
 * {@link CUSTOM_PRESET} when no available preset matches.
 * @param session - the session whose knob state is read.
 * @returns the effective preset name, or `custom` when nothing matches.
 */
current(session: Session): string

/**
 * Resolve an available preset's knob bundle.
 * @param name - the preset name to resolve.
 * @returns the configured bundle.
 * @throws when `name` is neither configured nor the currently live Auto preset.
 */
resolve(name: string): PresetSpec

/**
 * Build the client option for an available preset or {@link CUSTOM_PRESET}.
 * A missing label falls back to the preset key.
 * @param name - a configured preset key, live `auto`, or `custom`.
 * @returns the option a client renders.
 * @throws when `name` is neither a configured preset, live `auto`, nor `custom`.
 */
optionOf(name: string): PresetOption

/**
 * Record a changed preset, then update each changed knob through its own
 * setter. Selecting the effective preset again appends nothing.
 * @param session - the session the switch belongs to.
 * @param name - the preset to switch to; unknown names throw.
 */
set(session: Session, name: string): void
```

Types: [Session](session.es.md)

Source: [`packages/interaction/permission-presets/src/index.ts`](../../packages/interaction/permission-presets/src/index.ts)

<a id="permission-presets-events"></a>

### `permission-presets/*` events

<a id="permission-presetscatalog-changed--emit"></a>

#### `permission-presets/catalog-changed` — emit

The selectable process catalog changed. Payload-free by design: consumers subscribe first, then re-read the complete catalog.

```ts cordis-catalog
/**
 * The selectable process catalog changed. Payload-free by design:
 * consumers subscribe first, then re-read the complete catalog.
 * @mode emit
 */
'permission-presets/catalog-changed'(): void
```

Source: [`packages/interaction/permission-presets/src/types.ts`](../../packages/interaction/permission-presets/src/types.ts)
<!-- END GENERATED cordis-surface -->
