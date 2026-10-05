/** Locale-owned Excel preview controls and parser feedback. */
export const es = {
  title: 'Hoja de cálculo', language: 'es', loading: 'Renderizando documento...',
  invalid: 'No se pudo abrir esta hoja de cálculo. Compruebe su formato, contenido o protección con contraseña.',
  tooLarge: 'Este libro supera el límite de tamaño de la vista previa.', timeout: 'Se agotó el tiempo de espera al abrir este libro. Inténtelo con un archivo más pequeño.',
  encoding: 'No se pudo reconocer la codificación de este archivo de texto. Guárdelo como UTF-8 o UTF-16 con BOM e inténtelo de nuevo.',
  formulaWarning: 'Este libro contiene fórmulas; los resultados mostrados pueden faltar o ser inexactos.',
  unsupportedNotice: 'Esta vista previa no admite {features} en este libro. Ábralo en una aplicación del sistema para disfrutar de la experiencia completa.',
  charts: 'gráficos', images: 'imágenes', shapes: 'formas', conditionalFormatting: 'formato condicional', featureSeparator: ', ',
  retry: 'Reintentar',
} satisfies Record<string, string>

/** Excel preview dictionary keys. */
export type ExcelPreviewKey = keyof typeof es

/** English Excel preview copy. */
export const en = {
  title: 'Spreadsheet', language: 'en', loading: 'Rendering document...',
  invalid: 'This spreadsheet could not be opened. Check its format, contents, or password protection.',
  tooLarge: 'This workbook exceeds the preview size limit.', timeout: 'Opening this workbook timed out. Try a smaller file.',
  encoding: 'This text encoding could not be read. Save the file as UTF-8 or UTF-16 with a BOM and retry.',
  formulaWarning: 'This workbook contains formulas. Displayed results may be missing or inaccurate.',
  unsupportedNotice: 'This preview does not support {features} in this workbook. Open it in a system application for the full experience.',
  charts: 'charts', images: 'images', shapes: 'shapes', conditionalFormatting: 'conditional formatting', featureSeparator: ', ',
  retry: 'Retry',
} satisfies Record<ExcelPreviewKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Excel preview status and third-party locale selection. */
    sidebarExcel: ExcelPreviewKey
  }
}
