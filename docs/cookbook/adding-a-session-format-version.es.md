# Manual de referencia: añadir una versión del formato del registro de Session

[English](adding-a-session-format-version.md) | Español

## Resumen

Usar este tutorial para introducir la siguiente versión estructural del registro de Session sin reescribir datos publicados. Leer la [autoridad de versión y estado de publicación](../session-format-status.es.md) para identificar el escritor del checkout y el último formato publicado. Sea N ese formato publicado verificado y N+1 el objetivo; sustituir estos placeholders por valores numéricos en nombres y metadatos. Empezar con un checkout de contribuidor funcional y leer la [lista de verificación de paquetes](adding-a-package.es.md), la [biblioteca de formatos](../../packages/session/session-format/README.md) y la [decisión sobre formatos publicados](../../.agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md).

## Tabla de contenidos

- [1. Elegir la versión y la base de publicación](#choose-the-version)
- [2. Añadir una arista de identidad](#add-an-identity-edge)
- [3. Implementar etapas y validación por artefacto](#stages-and-validation)
- [4. Actualizar los consumidores de la versión actual](#current-version-consumers)
- [5. Crear sucesores snapshot](#snapshot-successors)
- [6. Validar el resultado integrado](#validate)
- [Prueba del corpus V4 para desarrolladores](#v4-corpus-trial)
- [Nota de desarrollo](#dev-note)

<a id="choose-the-version"></a>
## 1. Elegir la versión y la base de publicación

Subir el formato ante un cambio estructural en cabeceras, envoltorios de eventos, semántica de eventos núcleo o reconstrucción de superficie. Los cambios retrocompatibles pueden permanecer en la versión actual mediante nuevos reconocimientos; seguir la [regla de versionado](../../.agents/notes/implemented/architecture/2026-08-10-session-log-version-mechanism.md) y las [reglas de cambio de tipos](../persistence-changes/README.es.md#compatibility-rules). Distinguir el entero del formato de Session de las versiones de publicación de paquetes, las versiones de schema de SQLite, las versiones de unidades de proyección y las versiones de envoltorios de protocolo.

Sea N la versión aceptada o publicada en [versión/estado](../session-format-status.es.md) al planificar el próximo cambio rompiente. Un cambio rompiente posterior a la V4 aceptada necesita por tanto V5 incluso antes de que la publicación de V4 quede registrada; las adiciones compatibles no requieren ese paso.

Usar una base de integración compartida `release/*` para N+1. El cambio base añade el escritor, el códec, el cableado del catálogo, la migración de identidad y la verificación. Crear cada rama hija independiente desde esa base y apuntar su PR a la rama de publicación, no a la rama de otra hija independiente. Cada hija añade su transformación estructural, validadores, consumidores y tests al mismo paquete de migración adyacente. No asignar versiones extra solo para representar el orden de revisión. Hacer merge de las hijas revisadas en la rama de publicación mediante PRs y luego validar el resultado combinado antes de publicar. Respetar las protecciones de force-push y borrado de la rama de publicación; no hacer force-sync sobre ella.

Los códecs publicados y los significados aceptados del formato objetivo permanecen estables. El conversor N→N+1 puede recibir correcciones o soportar casos históricos adicionales después de que N+1 se publique, sin subir de versión, si su salida sigue siendo compatible con N+1. Una corrección del conversor afecta a las conversiones posteriores, no a los sucesores N+1 existentes. Documentar los cambios en mapeos previamente aceptados y cómo las salidas existentes siguen soportadas. Cambiar de forma incompatible la representación o interpretación objetivo establecida requiere la versión siguiente.

Usar homes de Harness desechables y aislados mientras N+1 siga abierto a integración. Un archivo N+1 interino ya tiene la versión de escritor objetivo, así que una edición posterior de N→N+1 no migrará ese archivo de nuevo. Reejecutar desde la entrada histórica sin cambios en un home de pruebas nuevo; nunca reparar esto reescribiendo una generación commiteada ni reutilizando el home de un usuario real.

Antes de cambiar el escritor, usar el [comando de archivo](../persistence-changes/historical-formats/README.es.md#maintenance) para preservar su schema de persistencia completo, y luego añadir la referencia de formato bilingüe bajo `docs/persistence-changes/historical-formats/vN.*`. Preservar todos los registros anteriores. La comprobación de cobertura de formatos requiere que cada entero por debajo del nuevo escritor tenga su propio documento; el catálogo generado actual solo cubre el nuevo escritor.

<a id="add-an-identity-edge"></a>
## 2. Añadir una arista de identidad

Seguir la lista de verificación de paquetes para crear una biblioteca para N→N+1, no un plugin montado. Una conversión de cuerpo identidad es solo un andamiaje de cableado inicial. La [especificación V2-a-V3](../../packages/session/session-format-v2-to-v3/README.md#v2-to-v3-specification) es un ejemplo fijo de transformaciones explícitas y reglas de preservación, no una arista a extender ni a tratar como conversión identidad.

Declarar `dsh.sessionFormatMigration` con `from: N` y `to: N+1` numéricos, una ruta de exportación y la migración exportada, el códec fuente, el códec objetivo, el validador de cabecera objetivo y el restaurador objetivo. Reutilizar el códec fuente exportado por el paquete de la arista precedente y depender de ese paquete; no copiar ni redefinir un códec publicado. Exportar el códec objetivo y los validadores desde el paquete nuevo. Añadir la arista como dependencia directa del catálogo y añadir los paths de TypeScript y las referencias de proyecto del espacio de trabajo.

Establecer `SESSION_FORMAT_VERSION` en los [tipos Session del núcleo](../../packages/core/session/src/types.ts) a N+1 junto a las declaraciones de la nueva arista, y luego generar el catálogo. El comando siguiente genera solo la cadena declarada; no implementa una versión nueva:

```sh
pnpm run gen-session-format-catalog
```

El [generador](../../scripts/gen-session-format-catalog.ts) requiere exactamente un paquete adyacente por cada paso desde cero hasta la versión del escritor, con nombres de directorio/paquete coincidentes, exportaciones de códecs adyacentes coincidentes y dependencias declaradas. Rechaza huecos, aristas duplicadas o de más, miembros de metadatos desconocidos y un catálogo que no comparta Session mediante dependencias de pares y de desarrollo. Corregir las declaraciones en lugar de editar a mano `generated.ts`. El catálogo es estático en build; el montaje de plugins no debe determinar la legibilidad histórica.

<a id="stages-and-validation"></a>
## 3. Implementar etapas y validación por artefacto

Usar las [interfaces Stage](../../packages/session/session-format/src/types.ts), no un migrador de array a array de artefacto completo. Una declaración inmutable `SessionFormatMigration` suministra `migrateHeader`, `validateTargetHeader` y `createStage`. Cada llamada a `createStage` crea estado independiente para un artefacto fuente. Mantener allí contadores, eventos pendientes y mapas de referencias; nunca compartir una etapa mutable entre Sessions.

Implementar `transformEvent(event, context)`, `transformRun(run, context)` y `finish(context)`. Emitir de forma síncrona a través de `context.emitEvent` o `context.emitRun`; una llamada puede producir cero, una o muchas salidas. Dejar que una etapa consuma runs compactos propiedad del códec directamente, o iterar `run.expand()` sin materializar un array intermedio. El llamante posee la planificación, y la cadena termina las etapas aguas arriba antes que las de aguas abajo.

Tratar el corte heredado como un conteo lógico de eventos, no un conteo físico de filas. Exponer `headerInheritedEventCount` solo cuando se conoce antes del EOF; `finish` devuelve el corte objetivo exacto. Una arista precedente que cambie la cardinalidad puede hacer que ese conteo no esté disponible en la construcción. Derivarlo de marcadores semilla validados cuando sea necesario, y probar la restauración multisalto con semilla desde cada generación histórica soportada hasta N+1, no solo desde la entrada N directa. Nunca sustituir un corte desconocido por cero.

Definir explícitamente las reglas de admisión y transformación de eventos de la nueva arista. La [auditoría de fuentes V2-a-V3](../../packages/session/session-format-v2-to-v3/README.md#source-audit) y la [regla alfa V0→V1](../../.agents/notes/implemented/architecture/2026-08-31-alpha-historical-unknown-event-refusal.md) poseen las políticas de esas aristas publicadas, no la nueva arista. No generalizar ninguna de las dos a todas las aristas. Un cambio en la estructura o en las posiciones de eventos requiere clasificar eventos fuente, miembros de payload y referencias, y decidir explícitamente si los datos opacos pueden seguir siendo válidos. La [retención a igual versión](../../.agents/notes/implemented/architecture/2026-08-30-retain-ignorable-external-session-events.md) por sí sola no demuestra que una transformación estructural sea segura. Validar la semántica objetivo y dar a cada caso recién aceptado un contraejemplo que lo rechace; nunca ensanchar aristas antiguas para ocultar una transformación no soportada.

Usar la salida del escritor nativo como oráculo de conversión: reproducir los mismos mensajes de LLM (modelo de lenguaje grande) grabados, salidas de tools y otras entradas a través de los escritores antiguo y objetivo. Comparar la salida antigua migrada con la salida objetivo cruda antes de cualquier helper de normalización de formato; enmascarar solo los campos volátiles documentados. En V4, los resultados de tool ordinarios se convierten en mensajes planos con rol tool con bloques de contenido ordinarios. Una estructura antigua teóricamente permitida por sí sola no justifica un nuevo tipo de contenido núcleo.

Los conversores alfa pueden rechazar explícitamente casos históricos sin un mapeo implementado y evidenciado, incluidos registros por lo demás válidos. Mantener la fuente sin cambios y no publicar ningún sucesor parcial. Preferir corpus reales y escritores reproducibles al extender el soporte; inspeccionar corpus de usuarios en solo lectura y crear fixtures (datos de prueba preestablecidos) de regresión sanitizados.

Documentar en el README de la arista solo los mapeos de identificadores y campos que necesita el formato objetivo, con una razón para cada uno. No añadir namespaces a clases fuente directas ni a metadatos ordinarios solo porque sean extensibles. Preservar los datos anidados opacos. Los conversores alfa pueden rechazar campos fuente inesperados que adquirirían nuevos significados objetivo en lugar de inventar una interpretación.

Mantener el README de la nueva arista como su único catálogo completo de transformación y admisión, siguiendo la [especificación V2-a-V3](../../packages/session/session-format-v2-to-v3/README.md#v2-to-v3-specification). Enumerar cada cabecera, evento, slot de mensaje y campo de payload convertidos; las reglas exactas de renombrado o colisión; los ids, coordenadas, referencias y cortes heredados preservados; los prerrequisitos externos; las políticas de rechazo y de datos opacos; y el comportamiento no soportado o diferido. Separar la conversión de fuentes históricas de la admisión objetivo nativa, y declarar qué códec, restaurador, validador instalado y política de recuperación realiza cada comprobación. Registrar toda validación deliberadamente más estrecha que el schema declarado. Actualizar este catálogo en el mismo cambio que su código; un inventario de schemas generado o una descripción de PR no lo sustituyen.

Demostrar la restauración estricta mediante `sessionFormatCatalog.createRestore(header, { recovery: 'strict', validation: 'current' })`, alimentando filas en orden y llamando a `finish()`. Esto ejercita la decodificación física, la cadena completa y la validación de Session actual instalada. La política recuperable/transformada de producción no sustituye la verificación estricta de fixtures y publicación. Preservar las excepciones de validación histórica documentadas en lugar de declarar una validación de fuentes más estricta de la que la arista realmente realiza.

<a id="current-version-consumers"></a>
## 4. Actualizar los consumidores de la versión actual

Rastrear cada consumidor de la versión actual, incluidos la creación/restauración de Sessions, la selección y publicación de nombres de archivo JSONL, el codificador/restaurador actual del catálogo, la identidad de generación de la caché de proyecciones, la normalización de reproducción y snapshots, la [validación física del layout de fixtures](../../scripts/session-fixture-layout.ts) y las grabaciones de los SDK de TypeScript/Python. Usar la constante del escritor donde un valor significa actual; mantener las versiones históricas literales en códecs publicados y fixtures históricos. Actualizar la documentación vigente y las referencias generadas a través de sus propietarios.

No subir versiones no relacionadas automáticamente. El `sessionFormatVersion` de un envoltorio de solicitud identifica su generación de Session embebida; la versión de schema externa tiene su propio significado. Las versiones de estado de unidades de proyección tampoco reemplazan la identidad de generación de Session de la caché.

Verificar tanto las rutas de lectura como las de escritura. El listado de solo cabecera no debe leer cuerpos ni publicar. La apertura de lectura histórica puede devolver el artefacto migrado en memoria sin escribir; la apertura de escritura debe verificar y publicar solo el sucesor actual final antes de anexar. La ruta, los bytes y el inodo de la fuente permanecen sin cambios. Una generación seleccionada más nueva o inválida no debe causar fallback a una predecesora. La [decisión de preparación](../../.agents/notes/implemented/architecture/2026-09-05-read-only-session-migration-preparation.md) posee el momento de publicación.

<a id="snapshot-successors"></a>
## 5. Crear sucesores snapshot

Leer la [propiedad de snapshots](../../snapshots/AGENTS.md) y la [biblioteca de snapshots](../../packages/test-support/session-snapshot/README.md). La [política del corpus](../../scripts/session-snapshot-corpus-policy.ts) mantiene su línea base declarada como entrada de reproducción para que las actualizaciones ejerciten la cadena adyacente; una subida del escritor no requiere refrescar ese corpus. Seleccionar el escenario propietario cuando se necesita un sucesor de la generación actual, conservar cada archivo histórico y usar los nombres de archivo padre e hijo canónicos de la versión objetivo. Nunca renombrar una predecesora al nombre de archivo objetivo ni cambiar solo su cabecera.

Para entrada de reproducción sin cambios, usar el refresco sin clave en el propietario y luego reproducir sin escritura de vuelta. Estos comandos SDK usan `text-turn` y la versión de escritor del checkout. Implementar y cablear N+1 antes de usarlos para generar esa versión, y seleccionar el propietario realmente afectado para una funcionalidad:

```sh
pnpm run test:snapshot:refresh snapshots/sdk/sdk.snapshot.ts -t text-turn
pnpm run test:snapshot snapshots/sdk/sdk.snapshot.ts -t text-turn
```

Revisar juntos la nueva generación, los archivos sidecar de solicitud y la salida de protocolo. Verificar que cada predecesora permanece byte idéntica y que los roles padre/hijo permanecen contiguos. La selección usa la generación numéricamente más alta, así que actualizar las referencias compartidas al padre seleccionado del propietario. No usar el migrador de layout empaquetado como actualizador de versiones. Si el transcript (transcripción) del modelo debe cambiar, el propietario del escenario usa grabación en vivo bajo la [política de testing](../testing.es.md), con su clave de proveedor requerida.

Mantener explícitos los casos más antiguos que la línea base retenida mediante `sessionFormat.version` de `snapshot.yml` y los nombres de `coverage` soportados; la grabación y el refresco dejan intactos los fixtures de Session fijados. Actualizar la [política del corpus](../../scripts/session-snapshot-corpus-policy.ts) para la generación actual reteniendo la cobertura enfocada de arista directa, multisalto, fila empaquetada, reintento/fallo y perfiles publicados. Comprobar el corpus y ambas proyecciones SDK; no refrescar masivamente escenarios no relacionados solo para silenciar un fallo de validación.

<a id="validate"></a>
## 6. Validar el resultado integrado

Ejecutar desde la raíz del repositorio. Estos comandos comprueban las declaraciones del catálogo, la composición de Stage, la arista publicada V2→V3 y la selección de generación. Son una línea base; añadir cobertura enfocada para la nueva arista:

```sh
pnpm run verify-session-format-catalog
pnpm exec vitest run scripts/gen-session-format-catalog.spec.ts packages/session/session-format/tests packages/session/session-format-v2-to-v3/tests packages/session/session-format-catalog/tests
pnpm run test:snapshot scripts/session-snapshot-corpus.corpus.ts
```

Tras implementar la nueva arista, añadir su ruta de tests real a la ejecución enfocada de Vitest. Añadir los tests de JSONL, reproducción, proyección y SDK seleccionados por el diff real, más el smoke del Worker de publicación compilado cuando esa ruta cambia. Exigir migración estricta exitosa, preservación de identidad para el esqueleto, rechazo de eventos malformados y desconocidos requeridos, restauraciones repetidas deterministas, estado de etapa concurrente independiente, cortes multisalto con semilla, predecesoras sin cambios y ausencia de fallback. Reportar comandos y fallos exactos, no un resultado inferido de la suite completa.

Actualizar el [Agent Note propietario](../../.agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md) en lugar de añadir un registro de decisión redundante. Mantener el [registro de publicación](../session-format-status.es.md#updating-the-record) sin cambios hasta la publicación; tras la publicación, actualizarlo con evidencia de publicación verificada. Auditar las notas activas relacionadas por supersesión; conservar la justificación independiente y dejar congeladas las notas archivadas. Actualizar la prosa bilingüe a la par, volver a registrar cada par cambiado con la herramienta del repositorio, y luego ejecutar las comprobaciones de documentación:

```sh
pnpm run verify-translation-pairing --write docs/cookbook/adding-a-session-format-version.md
pnpm run test:docs
pnpm run doc-sync
pnpm run lint
git diff --check
```

<a id="v4-corpus-trial"></a>
### Prueba del corpus V4 para desarrolladores

Usar el script de migración (retirado con la transición V4) de una sola ejecución desde un checkout de contribuidor instalado cuyo escritor sea V4. Detener los procesos DSH que usen la raíz objetivo antes de empezar, para que los bloqueos del escritor y los registros hijos cambiantes no impidan la migración. Ejecutar desde la raíz del repositorio:

```sh
pnpm run migrate:sessions-to-v4
```

La raíz por defecto es `~/.dsh/sessions`. Usar `--sessions-dir /path/to/sessions-copy` para otro corpus, o `--help` para la ayuda. Los trabajos concurrentes toman por defecto el número de CPU disponibles con tope 16; `--jobs N` acepta cualquier entero positivo seguro, incluidos overrides expertos mayores, y `--jobs 1` ejecuta en serie. Una cola acotada abre solo ese número de Sessions a la vez, con independencia del tamaño del corpus. Cada Session histórica pasa por la ruta normal de publicación bloqueada y validada para crear un sucesor V4 junto a sus archivos fuente sin cambios. Las Sessions V4 existentes se abren en solo lectura; reejecutar no las reconvierte. El script no hace solicitudes de modelo y no cambia las reglas de conversión ni de rechazo.

La terminal reporta el archivo seleccionado, la versión, el progreso, el resultado y el tiempo transcurrido de cada Session. Los errores individuales no detienen las Sessions posteriores. El resumen final lista cada fallo y el registro de diagnóstico completo bajo el directorio temporal del sistema; cualquier fallo devuelve un estado de salida distinto de cero. También imprime JSON y guarda el mismo informe como `summary.json` junto a `migration.log`: conteos por versión fuente y resultado, razones de fallo agrupadas, diagnósticos por entrada, detalles de runtime y ambas rutas de informe. Los diagnósticos conocidos exponen tipos de evento, miembros inesperados, implicación de registros hijos y números de secuencia; los errores no reconocidos conservan sus mensajes sin causas inferidas. Incluir estos informes al reportar un problema de migración. Las Sessions convertidas durante esta ejecución permanecen distintas de las que ya están en V4.

La conversión concurrente puede invalidar la evidencia hija de un padre cuando el hijo publica V4. Solo ese error de cambio de fuente recibe un reintento secuencial después de que terminen todos los trabajos iniciales; la corrupción, los formatos no soportados y los bloqueos retenidos se reportan de inmediato. Las líneas de completación conservan el índice de entrada original y un conteo de completadas separado, de modo que los resultados desordenados siguen siendo legibles.

<a id="final-v3-vocabulary"></a>
### Vocabulario final de eventos V3 antes de la publicación de V4

Mientras el formato publicado siga siendo V3 y el escritor de integración sea V4, master todavía puede añadir tipos de evento V3 válidos. Tras cada integración de master y antes de la primera publicación de V4, comparar el `RELEASED_V3_EVENT_TYPES` propiedad de la migración con el último commit escritor de V3 usado por ese refresco. Capturar su id inmutable completo mientras el `origin/master` verificado localmente siga escribiendo V3:

```sh
V3_SOURCE_REF="$(git rev-parse --verify 'origin/master^{commit}')"
pnpm run verify-v3-event-vocabulary --source-ref "$V3_SOURCE_REF"
```

El verificador lee solo ese commit local y exige igualdad exacta de nombres de evento. Rechaza nombres V3 ausentes, nombres copiados de más y un escritor fuente que no sea V3. En particular, el `developer/message` exclusivo de V4 no debe entrar en el conjunto V3 congelado. Revisar cada diferencia contra el payload V3, las conversiones requeridas, la admisión objetivo y los consumidores; añadir el nombre por sí solo no establece una migración completa. Añadir la regresión de migración correspondiente antes de aceptar un nuevo evento fuente.

Este comando no hace fetch ni establece frescura del remoto. El operador de publicación debe verificar que el commit seleccionado es el último escritor V3 incluido en la integración; una ref de seguimiento remoto antigua o un resultado aprobado para un fijado más viejo es insuficiente. Registrar el id comprobado con la validación de la publicación. Si master ya escribe V4, reutilizar el commit V3 final registrado en lugar de resolver el master actual. Después de que V4 se publique, mantener el vocabulario V3 ligado a esa fuente histórica; las adiciones posteriores de eventos V4 no lo actualizan. La CI estática regular no depende de una ref de master mutable.

<a id="dev-note"></a>
## Nota de desarrollo

Ninguna.
