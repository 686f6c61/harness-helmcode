# Post-mortem 0002: Las tools de snapshot del sistema de archivos quedaron permanentemente deshabilitadas

[English](0002-js-expression-disabled-filesystem-tools.md) | Español

Estado: resuelto

## Resumen ejecutivo

El ejemplo de ACP (Agent Client Protocol) intentó habilitar condicionalmente los plugins de sistema de archivos con `disabled: !!js ...`, pero Cordis evalúa las expresiones JavaScript solo dentro del `config` del plugin. El objeto de expresión crudo era truthy, así que la pila de sistema de archivos quedaba siempre deshabilitada. La actualización de snapshots aceptó entonces resultados `UNKNOWN_TOOL` como nuevas salidas esperadas. La corrección usa un overlay explícito de sistema de archivos y añade guardas de configuración estática y de resultados de snapshots.

## Resumen

La composición ACP por defecto es intencionadamente solo bash porque su sandbox no puede confinar proveedores de sistema de archivos en proceso. Los escenarios de snapshot del sistema de archivos siguen necesitando `read`, `write` y `edit`, así que sus plugins se colocaron en el `cordis.yml` por defecto con una expresión `disabled` pensada para habilitarlos solo en lanzamientos de acceso completo y en snapshots.

Cordis Include analizó cada escalar `!!js` como un objeto de expresión. El Loader interpoló recursivamente el `config` del plugin, pero consumía metadatos de la entrada como `disabled` directamente. Por tanto, cada entrada de sistema de archivos veía un objeto truthy y permanecía deshabilitada en todos los modos.

## Impacto

Siete escenarios de sistema de archivos y el escenario mixto de edición del espacio de trabajo llamaban a tools ausentes del registry. Sus registros de eventos de sesión estructurados llevaban `ToolNotFoundError` con código `UNKNOWN_TOOL`, mientras stdout renderizaba tarjetas genéricas de tool fallida. La suite de snapshots pasaba porque ambas salidas coincidían con los fixtures (datos de prueba preestablecidos) actualizados; demostraba una reproducción determinista de la regresión, no un comportamiento correcto del sistema de archivos.

El valor confinado por defecto en vivo no obtuvo acceso no deseado al sistema de archivos. Una corrección ingenua de la interpolación habría creado ese riesgo: los presets de permisos actualizan el sandbox de bash y el estado de aprobación en runtime, pero no pueden montar, desmontar ni confinar la pila del sistema de archivos.

## Cronología

- El PR (Pull Request) #261 consolidó las composiciones ACP y actualizó los snapshots del sistema de archivos al introducir las entradas condicionales de sistema de archivos.
- Todas las comprobaciones unitarias, de cobertura, de snapshots, de documentación, de compilación y de higiene pasaron.
- La revisión de las salidas esperadas actualizadas del sistema de archivos encontró tarjetas genéricas de fallo y resultados estructurados `UNKNOWN_TOOL`.
- Un arranque con el Loader real confirmó que cada valor `disabled` seguía siendo un objeto de expresión y que todos los fibers del sistema de archivos estaban ausentes.

## Causa raíz

La implementación asumió que `!!js` se aplicaba a toda una entrada del Loader. Solo se aplica a `entry.options.config`: `Entry._resolveConfig()` interpola ese campo, mientras que `Entry.disabled` evalúa `entry.options.disabled` sin interpolación. La etiqueta YAML era sintácticamente válida, así que la carga no produjo ningún diagnóstico.

El framework de snapshots trataba cualquier transcript (transcripción) determinista como comportamiento válido. Los pins de cabecera verificaban los schemas de tools de la composición, pero los escenarios de sistema de archivos compartían un pin de la composición por defecto y por tanto no demostraban independientemente que sus tools requeridas estuvieran registradas. La actualización reescribió el stdout esperado y los registros de sesión antes de que ninguna aserción semántica rechazara las tools ausentes.

## Salvaguardas añadidas

- Los escenarios de sistema de archivos arrancan `fs.cordis.yml`, un overlay fijo y explícito de acceso completo con una configuración de reproducción emparejada y su propia clase de cabeceras de solicitud.
- [`AGENTS.md`](../../AGENTS.md) y el [manual de Cordis](../cordis-primer.es.md#loader-configuration) establecen que `!!js` es válido bajo el `config` del plugin y el `disabled` de la entrada; el resto de los metadatos de la entrada permanecen literales, así que la composición condicional usa overlays.
- `verify-cordis-config` analiza el YAML de Cordis del repositorio y rechaza nodos de expresión en los metadatos de las entradas del Loader, incluidos los parches de include y las entradas insertadas.
- `dsh-session-snapshot` rechaza resultados estructurados `UNKNOWN_TOOL` en ejecuciones nuevas y en fixtures de sesión confirmados antes de que puedan confirmarse como salidas esperadas.

## Lecciones

- Un valor de configuración sintácticamente aceptado no se evalúa necesariamente en esa ubicación; documentar y verificar exactamente qué campos se interpolan.
- Una actualización de snapshots es producción de fixtures, no revisión de corrección. Las imposibilidades semánticas, como una tool registrada ausente, necesitan aserciones independientes de la salida esperada.
- Los controles de permisos deben describir solo las capacidades que realmente gobiernan. El acceso al sistema de archivos en tiempo de composición no puede seguir con seguridad un preset de runtime de solo bash.
