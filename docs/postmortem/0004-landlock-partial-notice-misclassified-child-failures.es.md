# Post-mortem 0004: El aviso de aplicación parcial de Landlock clasificó mal los fallos del hijo

[English](0004-landlock-partial-notice-misclassified-child-failures.md) | Español

Estado: resuelto

## Resumen ejecutivo

En kernels con una ABI de Landlock más antigua, el lanzador imprime un aviso benigno de aplicación parcial antes de ejecutar cada hijo. El harness trataba ese prefijo compartido `landlock-run:` más cualquier salida del hijo distinta de cero como fallo del lanzador, así que resultados ordinarios como el exit 1 de ripgrep sin coincidencias aparecían como `SANDBOX_UNAVAILABLE`; la búsqueda de sistema de archivos, entonces respaldada por bash, también ocultaba ese error estructurado tras `SEARCH_FAILED`. Reglas de firmas demasiado amplias y la falta de cobertura de composición con ABI parcial dejaron pasar el defecto. La clasificación del runner ahora exige evidencia fatal condicionada por el estado tras exclusiones informativas exactas, y un escenario ensamblado sin clave fija la ruta de bash superviviente. La búsqueda de sistema de archivos usa el ripgrep empaquetado a través del seam de subprocesos y no cruza el bash en sandbox.

## Resumen

El contrato del lanzador nativo distingue dos tipos de líneas de stderr. Un kernel con aplicación parcial imprime exactamente `landlock-run: partial enforcement (older Landlock ABI)` y continúa hacia el hijo. Un fallo del lanzador imprime otra línea `landlock-run:` y sale con 125 sin ejecutar el hijo.

El harness representaba ambas con una única subcadena `landlock-run: ` insensible a mayúsculas. Su consumidor clasificaba cualquier salida distinta de cero que llevara esa subcadena como fallo del runner. El estado del hijo quedaba así adherido a la línea informativa del lanzador: `false`, el exit 1 de ripgrep sin coincidencias, el exit 2 de patrón inválido e incluso un exit 125 elegido por el hijo podían achacarse al sandbox a pesar de un confinamiento y una ejecución correctos.

En el momento del incidente, la búsqueda de sistema de archivos añadía un segundo error de atribución. Su `runRipgrep()` respaldado por bash capturaba toda ejecución de bash rechazada que no fuera abortada y la reemplazaba con un `SEARCH_FAILED` genérico de cwd/inicio de shell, incluido el `SandboxUnavailableError` estructurado producido por el ejecutor del sandbox.

## Impacto

En hosts Landlock con ABI parcial, resultados legítimos del hijo distintos de cero podían aparecer como fallo de la infraestructura del sandbox. `glob` y `grep` eran especialmente visibles porque ripgrep usa exit 1 como búsqueda vacía exitosa. Cuando un fallo real del sandbox ocurría a través de la búsqueda de sistema de archivos, los llamantes perdían su código `SANDBOX_UNAVAILABLE` y recibían un diagnóstico de arranque incorrecto.

El defecto no debilitó el confinamiento ni ejecutó ningún comando sin confinar. Su efecto de seguridad fue de disponibilidad e integridad del diagnóstico: un resultado confinado válido era rechazado o mal etiquetado.

## Cronología

- El contrato del lanzador nativo definió exit 125 para los fallos del lanzador, una línea `landlock-run:` fatal para cada uno de esos fallos y el aviso exacto de aplicación parcial para la ejecución exitosa del hijo.
- El proveedor del sandbox redujo ese contrato a `runnerFailureSignatures: ['landlock-run: ']`; el consumidor bash combinó el prefijo con cualquier salida distinta de cero y reportaba la primera línea de stderr.
- Las pruebas unitarias cubrían el éxito limpio, los diagnósticos de denegación y los prefijos fatales del runner. Las pruebas con runner real se autosaltaban sin un kernel utilizable y no forzaban la aplicación parcial seguida de un hijo distinto de cero.
- Un envoltorio POSIX mínimo que imprime el aviso y hace `exec` de su carga reprodujo el fallo con `false` y con ripgrep sin coincidencias.
- Reglas estructuradas más una clasificación compartida en primer y segundo plano y cobertura de reproducción ensamblada cerraron la laguna de atribución del sandbox superviviente. La búsqueda de sistema de archivos usa el ripgrep empaquetado a través de `ctx.subprocess`; la corrección deja esa ruta fuera del bash en sandbox.

## Causa raíz

El tipo público de resultado del sandbox solo podía expresar una bolsa de subcadenas. No podía afirmar que el fallo de Landlock requiere exit 125, que la evidencia debe ocurrir dentro de una única línea fatal, ni que una línea exacta bajo el mismo prefijo es informativa. El consumidor booleano, en consecuencia, unía hechos no relacionados de procesos distintos y seleccionaba la primera línea de stderr para el detalle incluso cuando una línea posterior era la evidencia fatal.

La matriz de pruebas reflejaba esa representación. Los proveedores falsos emitían o ninguna línea de runner o un prefijo inequívocamente fatal; nunca emitían una línea benigna de runner antes de una salida distinta de cero controlada por el hijo. La cobertura real de Landlock dependía de la ABI del host, así que los hosts con ABI completa no podían ejercitar el aviso. En la implementación de búsqueda de la época del incidente, las pruebas de búsqueda de sistema de archivos modelaban errores crudos de spawn pero no un error estructurado lanzado por la composición real de bash en sandbox.

Stderr sigue siendo un canal de atribución en banda. Un hijo confinado puede reproducir deliberadamente la línea fatal condicionada de un runner y su estado de salida, causando una falsa atribución de disponibilidad/diagnóstico. La conjunción más estricta evita la colisión accidental de este incidente pero no autentica al escritor; un protocolo de estado fuera de banda sigue siendo un endurecimiento aparte, no una corrección de evasión del sandbox.

## Salvaguardas añadidas

- [`RunnerFailureRule`](../subsystems/sandbox.es.md#wrapped-argv-and-classification-dialects) lleva códigos de salida permitidos opcionales, firmas fatales por línea insensibles a mayúsculas y exclusiones exactas de líneas informativas insensibles a mayúsculas.
- [`dsh-sandbox-local`](../../packages/sandbox/sandbox-local/) mapea Landlock a exit 125 más una línea `landlock-run:` que no sea el aviso, mientras bwrap, Seatbelt y los runners personalizados siguen siendo solo por firma.
- [`dsh-bash-sandbox`](../../packages/shell/bash-sandbox/) hace spawn directo del argv del proveedor, así que un rechazo anterior al arranque usa el canal de error de spawn en lugar de diagnósticos localizados del shell. La ejecución resuelta en primer y segundo plano comparte un único clasificador que devuelve evidencia; la evidencia fatal prevalece sobre la denegación, y los errores en primer plano reportan la línea fatal coincidente sin cambiar el stderr capturado.
- [`dsh-tool-fs-search`](../../packages/fs/tool-fs-search/) usa el ripgrep empaquetado a través de `ctx.subprocess` y permanece fuera del seam de bash en sandbox.
- Los casos de regresión del límite nativo viven en [`partial-landlock.spec.ts`](../../packages/shell/bash-sandbox/tests/partial-landlock.spec.ts), incluidos avisos informativos, evidencia fatal y clasificación en primer y segundo plano.
- La ruta de producto ensamblada queda fijada por la [composición de snapshot `partial-landlock`](../../snapshots/session/partial-landlock-child-failure/cordis.snapshot.yml), independientemente de las decisiones de implementación de la búsqueda de sistema de archivos.

## Lecciones

- La atribución de procesos requiere una conjunción de evidencia independiente; un prefijo compartido no es un protocolo.
- Los diagnósticos informativos y los fatales pueden compartir espacio de nombres, así que las exclusiones deben ser exactas y estrechas mientras las líneas fatales desconocidas permanecen en fallo cerrado.
- Un adaptador debe preservar los fallos estructurados que posee el seam que tiene debajo en lugar de reemplazarlos con su categoría genérica más cercana.
- El comportamiento dependiente de la plataforma necesita un fake determinista en el límite nativo más una ruta de producto ensamblada; una prueba con kernel real que se autosalta no puede cargar sola con esa regresión.
