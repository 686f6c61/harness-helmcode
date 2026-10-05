/** Office preview copy and Host render configuration guidance. */
export const es = {
  title: 'Documento de Office',
  loading: 'Renderizando documento...',
  retry: 'Reintentar',
  viewMissingFonts: 'Faltan {count} fuentes; pulse para ver',
  missingFontsTitle: 'Fuentes faltantes',
  missingFontsDescription: 'Estas fuentes no están disponibles en esta vista previa. El texto y el diseño pueden diferir del documento original.',
  missingFontsCount: '{count} fuentes',
  closeDetails: 'Cerrar detalles de fuentes',
  unavailable: 'La vista previa de Office no está disponible. Active el servicio de vista previa de documentos en el equipo que ejecuta NaN Harness.',
  invalid: 'No se puede previsualizar este archivo de Office. Puede estar dañado, protegido con contraseña o no coincidir con su extensión.',
  tooLarge: 'El archivo de Office o el PDF convertido supera el límite de tamaño de la vista previa. Reduzca el tamaño del archivo o ajuste la configuración de la vista previa.',
  failed: 'La conversión de Office no generó un PDF utilizable. Compruebe el archivo e inténtelo de nuevo.',
  timeout: 'Se agotó el tiempo de espera de la conversión de Office. Inténtelo de nuevo.',
  busy: 'La vista previa de Office está ocupada. Inténtelo de nuevo en breve.',
  changed: 'El archivo cambió mientras se leía. Vuelva a abrir la vista previa.',
} satisfies Record<string, string>

/** Office preview locale keys. */
export type OfficePreviewKey = keyof typeof es

/** English translations checked against the Spanish key set. */
export const en = {
  title: 'Office document',
  loading: 'Rendering document...',
  retry: 'Retry',
  viewMissingFonts: 'Missing fonts: {count}. Click to view.',
  missingFontsTitle: 'Missing fonts',
  missingFontsDescription: 'These fonts are unavailable for this preview. Text and layout may differ from the original document.',
  missingFontsCount: 'Fonts: {count}',
  closeDetails: 'Close font details',
  unavailable: 'Office previews are unavailable. Enable the document preview service on the computer running NaN Harness.',
  invalid: 'This Office file cannot be previewed. It may be damaged, password protected, or have the wrong extension.',
  tooLarge: 'The Office file or converted PDF exceeds the preview size limit. Reduce the file size or adjust the preview configuration.',
  failed: 'Office conversion did not produce a usable PDF. Check the file and try again.',
  timeout: 'Office conversion timed out. Try again.',
  busy: 'Office preview is busy. Try again shortly.',
  changed: 'The file changed while being read. Reopen the preview.',
} satisfies Record<OfficePreviewKey, string>
