# Adjuntos durables

[English](attachment.md) | Español

El seam de adjuntos separa la propiedad de imágenes binarias y archivos genéricos del registro de sesión. Un productor entrega bytes a [`ctx.attachments`](#ctxattachments--attachmentstore-abstract-seam); el servicio publica una referencia inmutable direccionada por contenido solo después de que el objeto sea durable. Los eventos de sesión y los bloques de adjuntos visibles para el modelo contienen esa referencia y sus metadatos, nunca una URL de objeto del navegador, una ruta temporal del host, una URL de proveedor ni una carga base64. El servicio independiente [`ctx.fileUploads`](#ctxfileuploads--fileuploads) vincula las transferencias de archivos del navegador y los recibos preparados al Agent receptor.

Los borradores no enviados del navegador pueden permanecer en memoria y los clientes nativos pueden prepararlos en almacenamiento temporal del sistema operativo. Los archivos genéricos del navegador se vuelven durables antes de recibir un recibo de prompt preparado. Una vez que el host acepta un mensaje de usuario, sus imágenes se mueven bajo `<DSH_HOME>/attachments/v1` antes de que se anexe el evento de usuario. La salida de imágenes estructurada del modelo sigue la misma regla de persistir antes del evento.

Fuente: [`packages/attachment/attachment/src/types.ts`](../../packages/attachment/attachment/src/types.ts)

## Identidad y metadatos verificados

`AttachmentId` es una cadena opaca con marca. El backend local emite actualmente `sha256:<digest>`, pero los consumidores no deben analizar esa representación ni derivar de ella una ruta del sistema de archivos. Un consumidor puede preguntar al proveedor de adjuntos por la ubicación de su objeto a través de `imageHostPath()`, y después debe usar el sistema de archivos de ejecución actual para decidir si las tools del modelo pueden leer esa ruta del host.

```ts type-equiv
/** Raster image formats accepted by the version-one attachment path. */
type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
```

```ts type-equiv
/** Durable, serializable reference to one immutable normalized image. */
interface ImageAttachmentRef {
  /** Opaque storage identifier; never a filesystem path or bearer URL. */
  attachmentId: AttachmentId
  /** Media type verified from the stored bytes. */
  mediaType: ImageMediaType
  /** Exact encoded byte length. */
  bytes: number
  /** Intrinsic encoded width in pixels. */
  width: number
  /** Intrinsic encoded height in pixels. */
  height: number
  /** Optional display name stripped of local path information. */
  name?: string
  /**
   * Input dimensions after applying EXIF orientation and before normalization
   * scaling. Present only when normalization reduced the image.
   */
  originalDimensions?: {
    width: number
    height: number
  }
}
```

```ts type-equiv
/** Deployment-resolved limits used by upload admission and request buffering. */
interface ImageAttachmentLimits {
  maxImageBytes: number
  maxImagesPerMessage: number
  maxMessageImageBytes: number
  maxImagePixels: number
  /** Maximum intrinsic width and maximum intrinsic height in pixels for one image. */
  maxImageDimension: number
  mediaTypes: readonly ImageMediaType[]
}
```

El backend local admite como máximo 20 imágenes y 200 MiB de datos fuente codificados por mensaje. Una fuente puede usar hasta 20 MiB, 64,000,000 píxeles y 8192 píxeles por lado. Estos límites de fuente preceden a la etapa de normalización independiente, que limita el borde largo a 2048 píxeles y los datos codificados a 4 MiB por defecto.

La referencia registra las dimensiones intrínsecas y la longitud codificada para que los clientes puedan maquetar el historial sin decodificar primero, mientras que cada lectura autoritativa sigue comprobando digest, firma de medio, dimensiones y metadatos contra el objeto.

## Cargas de confirmación y de lectura verificada

```ts type-equiv
/**
 * Browser-submitted prompt content accepted by Host prompt endpoints; the
 * accepting Host promotes image parts to durable references through
 * `ctx.attachments.admitPromptContent()` before any message is created, so a wire caller can
 * never cite an attachment it did not upload.
 */
type PromptContentPart =
  | { readonly type: 'text'; readonly text: string }
  | {
    readonly type: 'image'
    readonly mediaType: ImageMediaType
    readonly data: string
    readonly name?: string
  }
```

```ts type-equiv
/** Host prompt content whose file receipts are resolved and whose image bytes await admission. */
type AttachmentAdmissionPart =
  | PromptContentPart
  | { readonly type: 'file'; readonly attachment: FileAttachmentRef }
```

```ts type-equiv
/** Host-admitted prompt content with every attachment represented by its durable reference. */
type AdmittedPromptContentPart =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'image'; readonly attachment: ImageAttachmentRef }
  | { readonly type: 'file'; readonly attachment: FileAttachmentRef }
```

```ts type-equiv
/** Base64-encoded image upload accompanying one wire request. */
interface EncodedImageAttachment {
  /** Declared media type, verified against the decoded bytes during admission. */
  mediaType: ImageMediaType
  /** Canonical base64 encoding of the image bytes. */
  data: string
  /** Optional display name; it is never interpreted as a path. */
  name?: string
}
```

```ts type-equiv
/** Request to validate and durably commit one image. */
interface SaveImageAttachment {
  data: Uint8Array
  /** Caller-declared media type, checked against fully decoded bytes. */
  mediaType: ImageMediaType
  /** Optional browser/provider display name; it is never interpreted as a path. */
  name?: string
}
```

```ts type-equiv
/** Stored image bytes returned after reference and digest verification. */
interface StoredImageAttachment {
  ref: ImageAttachmentRef
  data: Uint8Array
}
```

```ts type-equiv
/** Deterministic request-image target selected by one exact model route for one attachment. */
interface ImageRequestTarget {
  /** Target width in pixels; a target above the source keeps the source width. */
  width: number
  /** Target height in pixels; a target above the source keeps the source height. */
  height: number
  /** Encoded-byte target before base64 expansion or Files API upload; the smallest quality-ladder output is kept when no quality fits. */
  maxBytes: number
}
```

```ts type-equiv
/** Integer width and height of one projected image. */
interface ProjectedDimensions {
  width: number
  height: number
}
```

```ts type-equiv
/** Cached request version derived from one provider-independent normalized attachment. */
interface RequestImageAttachment {
  /** Cache and upload-index key over the attachment id, policy, and fixed encoder parameters. */
  variantId: ImageVariantId
  /** Durable normalized attachment from which this request version was derived. */
  attachment: ImageAttachmentRef
  /** Encoded request bytes. */
  data: Uint8Array
  mediaType: ImageMediaType
  bytes: number
  width: number
  height: number
  /** Provider-compatible sample depth proven after request encoding. */
  depth: 'uchar'
  /** Provider-compatible color space proven after request encoding. */
  space: 'srgb'
  /** Whether the encoded request version retains an alpha channel. */
  hasAlpha: boolean
}
```

`saveImage()` prepara y confirma atómicamente un adjunto normalizado independiente del proveedor antes de devolver su `ImageAttachmentRef`. `saveImages()` prepara cada adjunto validado una sola vez antes de publicar el lote, de modo que un rechazo de validación no deja objetos parciales y la publicación no repite la decodificación ni la selección de calidad. `admitPromptContent()` acepta el prompt de Host completo y ordenado tras la resolución de los recibos de archivos, sustituye las subidas de imágenes en base64 por referencias durables y deja pasar las referencias de archivo durables sin cambios. `admitEncodedImages()` admite otras entradas wire y delega en `saveImages()` la admisión de recuento, bytes agregados y lote ordenado. `admitEncodedFile()` ofrece a los adaptadores de protocolo codificado la misma admisión de base64 canónico propiedad del servicio, e `isAttachmentError()` permite a esos adaptadores reconocer fallos estables de adjuntos sin importar helpers de implementación. `readImage()` verifica un adjunto normalizado desde una ruta de sesión autorizada. `imageHostPath()` expone solo la ubicación del objeto en el host propiedad del proveedor; no decide si el mundo de ejecución de tools actual puede leerla. `readImageRequest()` deriva y cachea una versión de solicitud determinista con un tamaño objetivo exacto elegido por la ruta y un objetivo de bytes codificados. Esa versión contiene bytes codificados y metadatos, pero ninguna ruta del mundo de ejecución. Las entradas nuevas se decodifican por completo antes de la publicación, mientras que los aciertos de caché usan una sonda de metadatos acotada. Los llamantes usan `Promise.all` sobre el método singular cuando necesitan un lote ordenado. La implementación local codifica de forma diferida los candidatos preferidos, agrupa en singleflight las identidades de solicitud iguales, permite a cada esperante cancelar de forma independiente, detiene el trabajo compartido cuando no queda ningún esperante y acota todas las transformaciones con su limitador a nivel de instancia, que por defecto permite dos transformaciones simultáneas. El servicio es neutro respecto a la retención: las sesiones reanudadas y las de un fork pueden compartir objetos, por lo que la recolección de basura consciente de referencias se difiere en lugar de ligarse a la eliminación de una sesión.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxattachments--attachmentstore-abstract-seam"></a>

### `ctx.attachments` — `AttachmentStore` (abstract seam)

Immutable binary attachment service. Implementations validate bytes before publishing a reference.

```ts cordis-catalog
/**
 * Validate one image without persisting it.
 * Batch callers validate every member before saving any member.
 * @param input - encoded bytes, declared media type, and optional display name.
 * @returns completion after the encoded raster has been fully decoded.
 */
abstract validateImage(input: SaveImageAttachment): Promise<void>

/**
 * Validate and durably commit one ordered image batch.
 * @param inputs - encoded images in owning-message order.
 * @returns durable normalized attachment references in the same order after every member succeeds.
 */
async saveImages(inputs: readonly SaveImageAttachment[]): Promise<readonly ImageAttachmentRef[]>

/**
 * Admit one Host prompt and replace each uploaded image with its durable reference.
 * Text and durable file references pass through unchanged. A prompt without image parts performs no storage operation.
 * @param content - prompt parts in message order after file receipt resolution.
 * @returns admitted prompt parts in the same order as `content`.
 * @throws AttachmentError when the image batch is refused.
 */
async admitPromptContent( content: readonly AttachmentAdmissionPart[], ): Promise<AdmittedPromptContentPart[]>

/**
 * Decode and durably commit one canonical base64 file upload.
 * @param input - canonical base64 bytes and optional display name.
 * @returns the durable content-addressed file reference.
 * @throws AttachmentError when the encoding or storage operation is refused.
 */
admitEncodedFile(input: EncodedFileAttachment): Promise<FileAttachmentRef>

/**
 * Identify a failure emitted by this attachment capability by its stable code.
 * @param error - value caught from an attachment operation.
 * @returns whether the value is an attachment failure.
 */
isAttachmentError(error: unknown): error is AttachmentError

/**
 * Validate and durably commit one image before its owning session event is appended.
 * The returned reference describes the persisted normalized image. When
 * normalization reduces the raster, its `originalDimensions` records the
 * orientation-applied input dimensions.
 * @param input - encoded bytes, declared media type, and optional display name.
 * @returns the durable content-addressed normalized image reference.
 */
abstract saveImage(input: SaveImageAttachment): Promise<ImageAttachmentRef>

/**
 * Read one image and verify that bytes still match the recorded reference.
 * @param ref - durable reference from the session log.
 * @param signal - optional cancellation for backend read and verification work.
 * @returns the verified bytes and normalized attachment reference.
 * @throws the signal reason when aborted, or a storage error when verification fails.
 */
abstract readImage(ref: ImageAttachmentRef, signal?: AbortSignal): Promise<StoredImageAttachment>

/**
 * Locate the provider-owned normalized object in the harness host filesystem.
 * @param ref - durable normalized attachment reference.
 * @returns an absolute host path, or undefined when this backend is not host-file-backed.
 * @throws an AttachmentError when the durable reference is invalid.
 */
imageHostPath(ref: ImageAttachmentRef): string | undefined

/**
 * Durably commit one file byte-for-byte before its owning session event is
 * appended. Files carry no admission limits: any byte content and length is
 * accepted, and the stored object is the exact submitted bytes. Backends
 * without verbatim file storage keep this default rejection.
 * @param input - exact bytes and optional display name.
 * @returns the durable content-addressed file reference.
 */
saveFile(input: SaveFileAttachment): Promise<FileAttachmentRef>

/**
 * Durably commit one file byte-for-byte from bounded chunks. Providers must
 * apply backpressure and must not collect the complete file in memory.
 * Backends without streamed verbatim storage keep this default rejection.
 * @param input - ordered exact bytes, optional cancellation, and display name.
 * @returns the durable content-addressed file reference.
 */
saveFileStream(input: SaveFileStreamAttachment): Promise<FileAttachmentRef>

/**
 * Read and verify one verbatim stored file as bounded chunks. Providers must
 * not collect the complete file in memory. Backends without verbatim file
 * reads keep this default rejection.
 * @param ref - durable reference from the session log.
 * @param signal - optional cancellation for backend reads and verification work.
 * @returns exact file bytes in order; integrity failures reject the iteration.
 */
async *readFileStream( ref: FileAttachmentRef, signal?: AbortSignal, ): AsyncIterable<Uint8Array>

/**
 * Locate the verbatim stored file object in the harness host filesystem.
 * @param ref - durable file reference.
 * @returns an absolute host path, or undefined when this backend is not host-file-backed.
 * @throws an AttachmentError when the durable reference is invalid.
 */
fileHostPath(ref: FileAttachmentRef): string | undefined

/**
 * Generate or read one deterministic model-request version from the stored normalized image.
 * @param ref - durable provider-independent normalized attachment reference.
 * @param target - route-chosen dimensions and byte target; an unmet byte target yields the smallest ladder output.
 * @param signal - optional cancellation.
 * @returns request bytes and the cache/upload identity covering every transform input.
 */
readImageRequest( ref: ImageAttachmentRef, target: ImageRequestTarget, signal?: AbortSignal, ): Promise<RequestImageAttachment>
```

Source: [`packages/attachment/attachment/src/index.ts`](../../packages/attachment/attachment/src/index.ts)

<a id="ctxfileuploads--fileuploads"></a>

### `ctx.fileUploads` — `FileUploads`

Host service owning upload storage and Agent-scoped staged receipts.

```ts cordis-catalog
/**
 * Register the ordinary-Session resolver used when a raw upload addresses a cold Session.
 * @param resolve - resolver that returns the exact live Agent or throws a Remote error.
 * @returns disposer removing this resolver.
 */
registerAgentResolver(resolve: AgentResolver): () => void

/**
 * Persist one encoded upload and stage it under the Agent receiver selected by Typert.
 * @param agent - receiving Agent resolved from the Remote Agent scope.
 * @param request - canonical base64 bytes and optional display name.
 * @param signal - caller cancellation before storage begins.
 * @returns the staged receipt and durable file reference.
 */
@Remote('upload') upload(agent: Agent, request: EncodedFileUploadRequest, signal: AbortSignal): Promise<FileUploadValue>

/**
 * Persist raw chunks for one Session without aggregating the upload.
 * @param request - Session identity, ordered bytes, cancellation, and optional display name.
 * @returns the staged receipt and durable file reference.
 */
async uploadStream(request: { readonly sessionId: SessionId readonly data: AsyncIterable<Uint8Array> readonly signal?: AbortSignal readonly name?: string }): Promise<FileUploadValue>

/**
 * Resolve one staged receipt inside its receiving Agent scope.
 * @param agent - receiving Agent.
 * @param receiptId - opaque receipt minted for one completed upload.
 * @returns durable file reference, or `undefined` for an unknown or foreign receipt.
 */
resolve(agent: Agent, receiptId: FileUploadReceiptId): FileAttachmentRef | undefined

/**
 * Bind receipts while one prompt enters an Agent inbox.
 * Disposal restores every prior binding unless the caller commits successful delivery.
 * @param agent - receiving Agent.
 * @param receiptIds - distinct staged receipts referenced by the prompt.
 * @param requestId - prompt identity later observed in queue or history.
 * @returns binding kept after commit until queue or history observation retires its receipts.
 */
bindPrompt( agent: Agent, receiptIds: readonly FileUploadReceiptId[], requestId: string, ): PromptFileBinding

/**
 * Retire every receipt accepted by one removed queue occurrence.
 * @param agent - receiving Agent.
 * @param requestId - prompt identity carried by the queue occurrence.
 */
retirePrompt(agent: Agent, requestId: string): void
```

Types: [Agent](core.es.md) · [SessionId](core.es.md)

Source: [`packages/client/file-upload/src/index.ts`](../../packages/client/file-upload/src/index.ts)
<!-- END GENERATED cordis-surface -->
