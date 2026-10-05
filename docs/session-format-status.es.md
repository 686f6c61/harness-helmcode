# Versión del formato de Session y estado de publicación

[English](session-format-status.md) | Español

## Resumen

Usar esta referencia para distinguir el escritor del checkout, la base de compatibilidad aceptada y el último formato de Session publicado. La constante de código posee el escritor; los registros de finalización y de publicación siguientes identifican por separado el historial aceptado y la evidencia de publicación. El resto de la documentación enlaza aquí en lugar de repetir esos valores.

## Índice

- [Fuentes de verdad](#sources-of-truth)
- [Registro de finalización](#finalization-record)
- [Registro de publicación](#release-record)
- [Actualización del registro](#updating-the-record)
- [Nota de desarrollo](#dev-note)

<a id="sources-of-truth"></a>
## Fuentes de verdad

- **Escritor del checkout:** `SESSION_FORMAT_VERSION` en los [tipos de Session de core](../packages/core/session/src/types.ts) es el único número de escritor actual mantenido a mano en el código. El [generador del catálogo](../scripts/gen-session-format-catalog.ts) deriva el orden de los codecs y comprueba que las migraciones adyacentes lo alcancen. Una versión de paquete, un nombre de export de codec, un nombre de archivo de fixture o una versión de caché de proyección no son la autoridad del escritor.
- **Último formato publicado:** `latestReleasedVersion` en el registro siguiente identifica el formato de Session publicado. `evidenceTag` nombra una release de producto publicada cuyo escritor etiquetado tiene ese valor; no tiene por qué ser la primera release que porta el formato. La copia bilingüe se comprueba contra el mismo registro, no se mantiene como una decisión separada.
- **Estado de publicación:** comparar la constante del escritor con el registro de publicación verificado. La igualdad significa que el formato del escritor se ha publicado. Una versión de escritor mayor aún no está registrada como publicada; su registro de finalización identifica independientemente la base de compatibilidad aceptada. Al comparar un checkout antiguo con el registro verificado de una rama más nueva, una versión de escritor menor identifica un formato de escritor más antiguo; la puerta de coherencia local rechaza ese orden dentro de un mismo checkout. No se mantiene ningún booleano de publicado separado. Antes de declarar una versión mayor como no publicada, verificar que ninguna release publicada haya avanzado el registro.

Una publicación de producto alpha, beta o release-candidate establece obligaciones de formato de Session publicado. La marca de prerelease de GitHub no hace prescindibles los datos persistidos del usuario. Un registro de publicación ausente no es evidencia de no publicación. La [decisión de versionado y autoridad](../.agents/notes/implemented/architecture/2026-08-10-session-log-version-mechanism.md) posee las decisiones de compatibilidad; la [migración de formatos publicados](../.agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md) posee las generaciones inmutables y la conversión adyacente.

Las [referencias de formato](persistence-changes/historical-formats/README.es.md) documentan cada entero desde cero hasta el escritor del checkout, con los schemas históricos y el catálogo actual existente.

<a id="finalization-record"></a>
## Registro de finalización

```yaml session-format-finalization
latestFinalizedVersion: 4
```

V4 tiene una base de compatibilidad aceptada en el [punto de control](persistence-changes/finalized/v4.json). Los cambios de schema retrocompatibles pueden seguir siendo V4 mediante nuevos registros de confirmación. Los cambios incompatibles requieren una versión de escritor mayor y su propia transición de header; no pueden reutilizar la transición aceptada 3→4. Los registros máquina aceptados y los schemas posteriores permanecen inmutables. Las [reglas de puntos de control](persistence-changes/README.es.md#compatibility-rules) definen la comparación.

La finalización no congela toda adición futura de V4 y no afirma publicación. El registro de publicación siguiente conserva la versión publicada verificada de forma independiente. Los comentarios ordinarios, los alias, las ubicaciones fuente y las correcciones de implementación que preservan el significado aceptado no cambian esta base.

Antes de la primera publicación de V4, cada integración de un master más nuevo que escribe V3 debe pasar la [comprobación explícita del vocabulario V3](cookbook/adding-a-session-format-version.es.md#final-v3-vocabulary) contra el commit fuente local registrado. Verificar la frescura del pin fuente y revisar las nuevas conversiones de cargas de eventos antes de actualizar el conjunto que posee la migración. Tras la publicación, el vocabulario V3 final permanece histórico e independiente de las adiciones V4 actuales.

<a id="release-record"></a>
## Registro de publicación

```yaml session-format-release
latestReleasedVersion: 3
evidenceTag: dsh-v0.1.5-alpha.1
```

Evidencia: etiqueta de producto publicada `dsh-v0.1.5-alpha.1`; escritor etiquetado: `packages/core/session/src/types.ts`.

<a id="updating-the-record"></a>
## Actualización del registro

Cuando se implementa un cambio estructural del escritor, actualizar la constante de código y el catálogo adyacente a la vez; no avanzar este registro de publicación antes de la publicación. Cuando una release de producto publica por primera vez un formato de Session mayor, confirmar la publicación y su escritor etiquetado, y después avanzar este registro y la etiqueta de evidencia y la ruta del escritor etiquetado en la misma actualización bilingüe. Las releases de producto posteriores que portan el mismo formato no requieren cambiar el registro. Nunca rebajarlo en la rama de desarrollo.

La [prueba del estándar de documentación](../scripts/doc-standard.spec.ts) comprueba la estructura del registro, la igualdad bilingüe, la coherencia de la etiqueta de evidencia y la ruta del escritor, y que la release documentada no supere al escritor del checkout. Esta comprobación sin clave no consulta GitHub ni demuestra que el registro esté al día; la verificación de la publicación sigue formando parte de la actualización de release.

Usar «formato actual» y «siguiente versión adyacente» para el comportamiento general. Conservar los números explícitos para las entradas y salidas fijas de migración, los schemas de cable, la evidencia histórica y las pruebas de esas versiones concretas. El [manual de referencia de versiones de formato](cookbook/adding-a-session-format-version.es.md) usa N para el último formato finalizado o publicado y N+1 para su sucesor.

<a id="dev-note"></a>
## Nota de desarrollo

Ninguna.
