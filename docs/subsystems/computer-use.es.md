# Uso del ordenador

[English](computer-use.md) | Español

El uso del ordenador permite a un modelo observar y operar el escritorio local a través de un proveedor configurado. La capacidad compartida de DSH se llama **computer use**; **Cua Driver** nombra la implementación del upstream.

## Elegir un proveedor

Montar [`dsh-computer-use`](../../packages/computer-use/computer-use/README.md) y un proveedor en la misma composición. Ambos proveedores de Cua Driver son paquetes NPM públicos experimentales y requieren activación explícita.

| Proveedor | Runtime |
|---|---|
| [Cua Driver MCP](../../packages/experimental/computer-use-cua-driver-mcp/README.md) | Un ejecutable `cua-driver` ya instalado, conectado a través de MCP |
| [Cua Driver native](../../packages/experimental/computer-use-cua-driver-native/README.md) | El runtime nativo de plataforma instalado con la dependencia de NPM |

Cada proveedor suministra su catálogo de tools del upstream. El servicio compartido registra solo un nombre y rechaza cualquier segundo proveedor, incluida otra instancia con el mismo nombre. No tiene métodos comunes de operación de escritorio ni selector controlado por el modelo.

## Tiempo de vida y uso compartido del escritorio

Un proveedor conserva su registro mientras apaga sus tools y recursos propios. Un fallo de arranque libera el registro intentado. El proveedor MCP conserva su registro durante las reconexiones.

Un proveedor registrado no reserva un escritorio para una sesión. Los llamantes coordinan flujos de trabajo completos de observar, actuar y verificar entre sesiones y procesos DSH separados. Una llamada cancelada no puede deshacer una entrada que el escritorio ya recibió.

## Resultados y requisitos de plataforma

Las tools usan el pipeline de ejecución y el registro de sesión normales. Las rutas de modelo con capacidad de imágenes y un almacén de adjuntos reciben capturas de pantalla durables; las rutas de imagen no soportadas reciben el diagnóstico de imagen MCP existente. Los README de los proveedores son dueños de las limitaciones de instalación, permisos y plataforma.

El [registro de decisión](../../.agents/notes/implemented/architecture/2026-09-12-computer-use-provider-registration.md) explica el servicio de solo registro y las dos integraciones de Cua Driver.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxcomputeruse--computeruseregistry"></a>

### `ctx.computerUse` — `ComputerUseRegistry`

Owns one optional provider registration in the shared computer-use service.

```ts cordis-catalog
/**
 * Reserve the sole provider slot until the contribution is disposed.
 * A second registration fails even when it repeats the current name. Providers
 * must stop their tools and await owned work before releasing this registration.
 * @param name - provider-owned name used in registration diagnostics.
 * @returns the effect disposer for this exact registration.
 */
register(name: ComputerUseProviderName): () => Promise<void>
```

Source: [`packages/computer-use/computer-use/src/index.ts`](../../packages/computer-use/computer-use/src/index.ts)
<!-- END GENERATED cordis-surface -->
