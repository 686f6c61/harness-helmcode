# @deepseek-ai/dsh-session-format-v4-to-v5

La migración de Session V4 a V5. V5 es el vocabulario V4 menos las dos raíces de eventos exclusivas de DeepSeek (`session-log-deepseek/delivery-accepted`, `web/deepseek-search-llm-request`): el framing, los campos del header y cada forma de evento superviviente no cambian, así que la migración re-estampa el header y pasa los eventos con mapeo de secuencia identidad. Las raíces eliminadas se rechazan en vez de descartarse: los escritores V4 de Helmcode nunca las emitieron, así que una aparición significa un linaje foráneo que una eliminación silenciosa lavaría.

## Known Limitations and Deferred Work

- **Rechazo en vez de lavado** — un artefacto V4 que contenga las raíces eliminadas falla la migración en lugar de perderlas; un modo con pérdida de "descartar y continuar" queda aplazado hasta que un corpus real lo necesite.
- **La evidencia de hijos sigue en el borde V3→V4** — los eventos `subagent/catalog` pasan sin cambios, así que ninguna evidencia de hijos por padre se vincula a este borde; el helper `createSessionFormatCatalogWithChildren` sigue siendo dueño solo del salto V3→V4.

## Dev Note

None.
