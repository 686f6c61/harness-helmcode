# Benchmark de reconexión de Active Assistant

[English](README.md) | Español

[reconnect.bench.client.ts](reconnect.bench.client.ts) mide el plegado del Client de producción cuando una reconexión porta un prefijo de razonamiento (reasoning) sin terminar de 100 000 deltas. Un adaptador privado compilado alcanza `ClientAssistantStream.replace()` sin añadir exportaciones del producto. Tres workers nuevos en Node puro sintetizan la línea base compacta antes de la medición; el tiempo de reemplazo y el heap retenido tras un GC forzado tienen presupuestos de mediana separados. El siguiente fotograma denso en vivo debe seguir siendo aceptado. La CI hospedada estándar usa una expectativa de reemplazo de 50 ms con el margen compartido de 1,25× (techo de 63 ms); el presupuesto de heap retenido se mantiene en 30 MiB. Los controles de muestra grabada y de regresión sintética ejercen la misma aserción temporal que el veredicto del worker.

Compilar con `pnpm run build:bench` y luego seleccionar `benchmarks/active-stream-reconnect` en `vitest.bench.config.ts`. Esta carga de trabajo de Node centrada no compila ni mide el renderizado del navegador. [Los presupuestos de rendimiento del frontend](../../.agents/notes/implemented/testing/2026-09-06-frontend-performance-budgets.md) registran la calibración y las exclusiones.
