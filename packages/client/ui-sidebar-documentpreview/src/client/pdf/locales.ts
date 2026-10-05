import { zoomEn, zoomEs } from '../zoom/locales.ts'

/** Copy owned by the PDF renderer. */
export const es = {
  ...zoomEs,
  title: 'PDF',
  pageImage: 'Página {page} del PDF',
  loading: 'Renderizando documento...',
  rendering: 'Renderizando página…',
  failed: 'No se puede mostrar el PDF: {message}',
  password: 'Este PDF requiere contraseña; la vista previa con contraseña no está disponible',
  workerFailed: 'El proceso de renderizado del PDF no pudo continuar. Inténtelo de nuevo',
  unsupported: 'La vista previa de PDF requiere el contenido completo del archivo',
  retry: 'Reintentar',
} satisfies Record<string, string>

/** PDF translation keys shared by both dictionaries. */
export type PdfLocaleKey = keyof typeof es

/** English PDF-renderer dictionary. */
export const en = {
  ...zoomEn,
  title: 'PDF',
  pageImage: 'PDF page {page}',
  loading: 'Rendering document...',
  rendering: 'Rendering page…',
  failed: 'Cannot display PDF: {message}',
  password: 'This PDF requires a password; password-protected previews are not supported.',
  workerFailed: 'The PDF rendering process could not continue. Please retry.',
  unsupported: 'PDF preview requires the complete file contents.',
  retry: 'Retry',
} satisfies Record<PdfLocaleKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** PDF page, loading, and failure messages. */
    sidebarPdf: PdfLocaleKey
  }
}
