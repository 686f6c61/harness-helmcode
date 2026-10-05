# Post-mortems

[English](README.md) | Español

Descripciones de incidentes: un bug llegó a un lugar al que no debía llegar (un usuario real, un PR mergeado, una versión publicada), y la parte interesante es *por qué nuestro proceso lo dejó pasar*, no solo la corrección de una línea.

Un post-mortem (análisis post-incidente) NO es un [Agent Note](../../.agents/notes/README.md) (que registra una decisión de diseño deliberada y sus alternativas rechazadas, o propone trabajo futuro). Es un registro retrospectivo de un fallo: qué se rompió, el mecanismo, por qué todas las redes de seguridad lo pasaron por alto, y las salvaguardas concretas añadidas para que la misma clase de bug falle ruidosamente la próxima vez.

Escribir uno cuando un bug es **sutil** (el mecanismo no es obvio y un ingeniero cuidadoso lo rederivaría por la vía difícil), **sistémico** (la razón por la que escapó es una laguna en pruebas/herramientas/convenciones, no una errata puntual) y **costoso de redescubrir** (costó tiempo real de depuración, y volvería a costarlo). Enlazar las salvaguardas (pruebas, reglas de AGENTS.md, ADR) que el post-mortem motivó.

Todo post-mortem abre con un **resumen ejecutivo**: un párrafo corto que un lector ocupado pueda absorber en treinta segundos (qué se rompió, la causa raíz en términos llanos, por qué escapó y la lección durable), antes de las secciones detalladas de resumen, cronología, causa raíz y salvaguardas que siguen.

| # | Título |
|---|---|
| [0001](0001-acp-default-export-drops-inject.es.md) | El servidor ACP se bloqueó al conectar: `export default` descartó el `inject` del plugin |
| [0002](0002-js-expression-disabled-filesystem-tools.es.md) | Las tools de snapshot del sistema de archivos quedaron permanentemente deshabilitadas por un objeto `!!js` literal |
| [0003](0003-web-agent-gui-feedback-loop.es.md) | Un Web agent validó un servidor de reemplazo en lugar de la GUI que alojaba su sesión |
| [0004](0004-landlock-partial-notice-misclassified-child-failures.es.md) | El aviso de aplicación parcial de Landlock clasificó mal los fallos del hijo |
