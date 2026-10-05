<!-- El archivo fuente en inglés está generado por scripts/gen-doc-graphs.ts; este archivo en español es la contraparte revisada mantenida mediante el emparejamiento bilingüe.
     Al actualizar, ejecutar primero `pnpm run gen-doc-graphs` para actualizar el inglés, después actualizar este archivo y ejecutar `pnpm run verify-translation-pairing --write docs/graph-atlas.md` para volver a registrar el emparejamiento. -->

# Índice de grafos de documentación

[English](graph-atlas.md) | Español

Estos diagramas muestran relaciones que los catálogos generados no muestran. Usarlos para encontrar relaciones entre paquetes, capability seams, flujo de eventos, tools orientados al modelo, composición de aplicaciones y rutas de ciclo de vida en runtime. Las firmas exactas y las definiciones de tipos siguen residiendo en las [páginas de subsistemas](subsystems/core.es.md) (tipos + las regiones generadas de la API de Cordis) y en [tool-catalog.md](tool-catalog.es.md).

La decisión de proceso detrás de este índice está registrada en [el Agent Note del grafo de documentación](../.agents/notes/archived/process/2026-07-03-documentation-graph-atlas.md).

| Grafo | Modo |
| --- | --- |
| [grafo de dependencias de módulos](module-graph.es.md) | `generated` |
| [catálogo de schemas de tools y mapa de paquetes](tool-catalog.es.md) | `generated` |
| [capability seams y servicios núcleo](capability-seams.es.md) | `hybrid generated` |
| [composición base compartida de dsh](../apps/cli/composition.md) | `hybrid generated` |
| [matriz de productores y consumidores de eventos](event-producer-consumer.es.md) | `hybrid generated` |
| [ciclo de vida de turnos y pasos del agent](agent-lifecycle.es.md) | `curated` |
| [pipeline de ejecución de tools](tool-execution-pipeline.es.md) | `curated` |

Ejecutar `pnpm run gen-doc-graphs` para regenerar el archivo fuente en inglés; ejecutar `pnpm run verify-doc-graphs` para verificar la frescura de la fuente en inglés, mientras que esta contraparte en español se mantiene mediante el emparejamiento bilingüe.

Modo de mantenimiento de la fuente en inglés: mixto. Cada página enlazada declara el modo de su fuente en inglés como generado, híbrido o curado; este archivo en español es la contraparte revisada mantenida mediante el emparejamiento bilingüe.
