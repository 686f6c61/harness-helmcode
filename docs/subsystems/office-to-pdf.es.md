# De Office a PDF

[English](office-to-pdf.md) | Español

La [familia de paquetes document](../../packages/document/README.md) convierte archivos de Office a PDF en el Host de Node. Los consumidores autorizan las lecturas de origen y son dueños de la presentación; el proveedor compartido es dueño de la conversión, la admisión acotada y la reutilización transitoria de PDF. Este subsistema no crea ninguna tool visible para el modelo ni ningún evento de sesión.

## Titularidad

| Responsable | Responsabilidad |
|---|---|
| [office-to-pdf](../../packages/document/office-to-pdf/README.md) | `ctx.officeToPdf`: conversión compartida con LibreOffice, admisión acotada y caché de PDF |
| [Web bundle](../../packages/bundle/web-app/README.md) | Un proveedor de conversión configurable compartido por los consumidores del Host |
| [Cliente de vista previa de Office](../../packages/client/ui-sidebar-documentpreview/README.md#office-preview) | Selección de extensiones de Office, reutilización de PDF y avisos de fuentes ausentes |

## Solicitudes y resultados

[`OfficeToPdfRequest`](../../packages/document/office-to-pdf/src/types.ts) contiene una clave/versión de origen ya autorizada, un tamaño de stat opcional, un callback diferido `read(signal, maxBytes)`, la prioridad de primer o segundo plano y una `OfficeExtension`: `doc`, `docx`, `xls`, `xlsx`, `ppt` o `pptx`. `OfficeToPdf.convert(request, signal?)` devuelve un resultado PDF completo. La cancelación sigue los ciclos de vida del llamante y del proveedor; los fallos de validación, de salida y de motor rechazan con un `OfficeToPdfError` clasificado.

`OfficeToPdfPriority` es `foreground` para la vista previa/QA solicitada y `background` para la especulación. `OfficeSourceKey` marca el localizador de origen autorizado que pertenece al llamante. `OfficeToPdfGeneration` marca un ciclo de vida del proveedor y `OfficeToPdfKey` marca su identidad de contenido; ningún consumidor analiza ninguno de estos valores opacos.

| Campo del resultado | Significado |
|---|---|
| `pdf` | `Uint8Array` que pertenece al llamante y contiene el PDF completo |
| `missingFonts` | Familias de fuentes del documento solicitado no disponibles para esta conversión |
| `cacheKey` | Generación opaca del conversor más identidad de extensión y contenido de origen |
| `generation` | Ciclo de vida del proveedor; su reemplazo invalida la reutilización del PDF en caché |

El proveedor admite la lectura diferida antes de asignar los bytes de origen, comparte conversiones por identidad de contenido y elimina su directorio temporal privado antes de regresar. Los bytes del PDF devuelto siguen siendo válidos tras el dispose (liberación de recursos) del proveedor. Los bytes de origen y del PDF no entran en el almacenamiento de la sesión. Los consumidores pueden usar [Workspace Files](../../packages/api/workspace-files/README.md) para lecturas acotadas autorizadas.

## Lecturas de vista previa

`RenderedDocumentBytes` porta los metadatos del archivo del espacio de trabajo, los `data` nativos del PDF, `missingFonts` y `generation`; la identidad del origen original acompaña al PDF convertido.

El método Remote `officeToPdf.render` comprueba la autorización y las versiones del origen a través del servicio [Workspace Files](../../packages/api/workspace-files/README.md) de la sesión. Tras la admisión de la conversión, `fs.readBytes` suministra la entrada en bruto dentro de la capacidad de bytes reservada; los límites de entrada de Office gobiernan esta lectura. El Remote binario proyecta el PDF en un adjunto multiparte y restaura un `Uint8Array` respaldado por `ArrayBuffer` en el Cliente. Los fallos de acceso al origen se propagan; los fallos de tamaño y de motor exponen una razón clasificada sin diagnósticos. La conversión no activa un Agent ni anexa eventos.

El ensamblado `api/remotes` monta el descriptor Remote generado del servicio de conversión. El paquete compartido Document Preview registra los formatos de Office con carga de bytes completos y su Worker de PDF.js existente. Cada lectura de vista previa vuelve a comprobar la generación del renderizador, la autorización del origen y la versión antes de compartir una conversión en curso o un PDF en caché. Los reinicios de conexión y el dispose del plugin cancelan las solicitudes y limpian los bytes en caché. Los servicios ausentes muestran orientación de configuración localizada.

## Selección de motor y límites

La API de Node externa [`@deepseek-ai/libreoffice-kit`](https://github.com/deepseek-harness/libreoffice-kit) selecciona sus motores precompilados. El kit tiene una versión y un flujo de trabajo de publicación independientes, definidos por la [decisión de titularidad de publicación](../../.agents/notes/implemented/architecture/2026-09-14-independent-libreoffice-kit.md). Las compilaciones de la aplicación instalan los paquetes npm publicados. El empaquetado de la aplicación requiere el motor nativo declarado por el objetivo, o Node WASM cuando el kit no declara ningún motor nativo para ese objetivo. La [decisión de motores por plataforma](../../.agents/notes/implemented/architecture/2026-09-15-platform-office-engines.md) define la instalación y el empaquetado. Los metadatos inválidos, los recursos requeridos ausentes y los errores de conversión rechazan sin cambiar de motor. La conversión usa rutas de entrada y salida en disco en el Host, sin motor de conversión en el navegador ni RPC de fuentes.

La [configuración del proveedor del Host](../../packages/document/office-to-pdf/README.md#use-this-package) es dueña de la concurrencia, los plazos, los límites de entrada y salida, los límites de archivado, la resolución de imágenes y el acceso a fuentes. La implementación nativa/WASM y la distribución de recursos pertenecen al espacio de trabajo del kit. El descubrimiento del LibreOffice del sistema, las descargas de motores en runtime, la caché persistente de PDF y el renderizado visible para el modelo quedan fuera de este proveedor.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxofficetopdf--officetopdf"></a>

### `ctx.officeToPdf` — `OfficeToPdf`

A provider lifetime owns all converters, queued calls, and temporary files.

```ts cordis-catalog
/**
 * Convert Office bytes without modifying the source or writing Session events.
 * @param request - authorized metadata and deferred bounded source read.
 * @param signal - caller cancellation; provider disposal also stops active work.
 * @returns caller-owned PDF bytes after conversion and scratch cleanup settle; canceled readers reject independently.
 * @throws {OfficeToPdfError} Invalid input, unusable output, or engine failure; cancellation rejects with its reason.
 */
convert(request: OfficeToPdfRequest, signal?: AbortSignal): Promise<OfficeToPdfResult>

/**
 * Read and convert one Office file using the Session's ordinary filesystem authorization.
 * @param workspaceFileScope - Session header lookup shared with workspaceFiles.
 * @param path - absolute or workspace-relative Office path.
 * @param priority - foreground preview or speculative background work.
 * @param signal - Remote cancellation; disposal also cancels outstanding reads and conversions.
 * @returns complete PDF bytes with original source identity and missing font families.
 */
@Remote async render( workspaceFileScope: WorkspaceFileScope, path: string, priority: OfficeToPdfPriority, signal: AbortSignal, ): Promise<RenderedDocumentBytes>

/**
 * Read the current rendering generation before reusing a Client PDF.
 * @param signal - Remote caller cancellation.
 * @returns provider lifetime, replaced with rendering, font, or engine configuration.
 */
@Remote('generation') getGeneration(signal: AbortSignal): OfficeToPdfGeneration
```

Source: [`packages/document/office-to-pdf/src/index.ts`](../../packages/document/office-to-pdf/src/index.ts)
<!-- END GENERATED cordis-surface -->
