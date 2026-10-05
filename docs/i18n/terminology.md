# Terminology

Esta tabla fija la traducción uniforme de los términos inglés↔español de este repositorio.

**Reglas generales:**
- La columna "Español" es el término por defecto en la prosa española. Si la celda está en inglés, la prosa española conserva el término en inglés sin traducirlo.
- La primera aparición se escribe según la columna "Primera aparición" (con la glosa entre paréntesis); las apariciones posteriores usan solo la parte anterior al paréntesis (puede ser española o inglesa), sin la glosa.
- La columna "No traducir como" recoge traducciones estrictamente prohibidas.
- Si un término ya fue glosado como parte de un término compuesto (p. ej. `agent loop (bucle de agent)` ya glosa `agent`), no vuelve a glosarse cuando aparece solo más adelante.

## Abreviaturas (se usan igual en inglés y en español)

| English | Español | Primera aparición | No traducir como | Notas |
|---|---|---|---|---|
| ACP | ACP | ACP (Agent Client Protocol) | | |
| AI | AI | AI (inteligencia artificial) | | |
| API | API | | | |
| CI | CI | | | |
| CLI | CLI | CLI (interfaz de línea de comandos) | | |
| e2e | e2e | | | |
| HMR | HMR | HMR (reemplazo de módulos en caliente) | | |
| JSON Schema | JSON Schema | | | |
| JSONL | JSONL | | | |
| LLM | LLM | LLM (modelo de lenguaje grande) | | |
| MCP | MCP | | | |
| PR | PR | PR (Pull Request) | | |
| RAG | RAG | RAG (generación aumentada por recuperación) | | |
| SDK | SDK | | | Se refiere solo al protocolo cliente/servidor JSON-RPC que usan los SDK de Python y TypeScript soportados; el proyecto DeepSeek Harness en sí no es un SDK |
| SSE | SSE | SSE (Server-Sent Events) | | |

## Términos que se mantienen en inglés (en ambos idiomas)

| English | Español | Primera aparición | No traducir como | Notas |
|---|---|---|---|---|
| agent | agent | agent (agente) | | |
| Agent Note | Agent Note | | nota de agent, nota de agente | Tipo de documento definido por el repositorio, que cubre propuestas, decisiones implementadas y propuestas rechazadas; el H1 del lado español conserva el prefijo fijo `# Agent Note: `, sin glosar el término en el título |
| agent harness | agent harness | agent harness (framework de agents) | | Los compuestos de agent (agent harness/workflow/loop/skill, etc.) se conservan enteros en inglés; si agent aún no fue glosado, la primera aparición sigue la fila del compuesto correspondiente o la de agent |
| agent loop | agent loop | agent loop (bucle de agent) | | |
| blob hash | blob hash | | | Resultado de `git hash-object` |
| coding agent | coding agent | coding agent (agent de programación) | | Compuesto de agent; se conserva en inglés en la prosa |
| Cordis | Cordis | | | |
| dispose | dispose | dispose (liberación de recursos) | | |
| doc-sync | doc-sync | doc-sync (puerta de sincronización de documentación) | | |
| fiber | fiber | | | |
| fixture | fixture | fixture (datos de prueba preestablecidos) | | |
| fork | fork | | | |
| Function Calling | Function Calling | Function Calling (llamada a funciones) | | |
| harness | harness | | | |
| harness engineering | harness engineering | | | |
| KV Cache | KV Cache | | | Nombre técnico propio; conservar mayúsculas y espacio |
| lint | lint | | | |
| mock | mock | | | Se conserva en inglés; se refiere a dobles de prueba |
| loader | loader | | | |
| manifest | manifest | manifest (lista de metadatos) | | |
| monorepo | monorepo | | | |
| Round | Round | | ronda, ronda objetivo, ronda Ralph | Cuando la estrategia externa usa Round, la jerarquía del dominio es Session > Round > Turn (turno) > Step (paso); Round es una iteración opcional de la estrategia externa, no un nivel que posea todo turno de sesión. Goal Round y Ralph Round se conservan en inglés. Un Round porta un turno y los pasos pertenecen a ese turno; un turno explícito de cero pasos conserva su significado. |
| schema | schema | | | |
| schema DSL | schema DSL | | | |
| seam | seam | | costura | Una capacidad reemplazable completa, compuesta por los tres roles Service Definition / Service Provider / Consumer; solo se divide cuando los roles evolucionan de forma independiente, y un mismo paquete puede asumir varios roles. `packages/shell` es el ejemplo canónico; Service Definition es un `Service` de Cordis (clase abstracta o servicio concreto de registry), no una interface de TypeScript. Ningún rol aislado, límite ordinario o punto de extensión puede llamarse seam. La prosa de este repositorio lo conserva en inglés; es un concepto distinto de `extension point` |
| Service Provider | Service Provider | | Service provider | Rol nombrado del capability seam; el singular se escribe siempre Service Provider y el plural Service Providers. Un provider genérico de servicios no entra en esta entrada |
| skill | skill | skill (habilidad) | | |
| slot | slot | | hueco, ranura | Posición nombrada y registrable en la arquitectura del cliente; se conserva en inglés |
| spill | spill | | | Mecanismo que vuelca a disco la salida de tool que excede el límite; los compuestos se escriben `archivo spill`, `ruta spill` |
| spawn | spawn | | | |
| steering | steering | steering (guía a mitad de camino) | | |
| job id | job id | | id de tarea | Se conserva en inglés |
| subagent | subagent | | | La prosa de documentación lo conserva en inglés; la UI en español lo traduce como «subagente», nunca «subagente proxy» |
| transcript | transcript | transcript (transcripción) | | El texto completo que la sesión presenta al usuario o al editor, a diferencia del registro de eventos |
| Typert | Typert | | TypeRT、typeRT、Type RT | Grafía de producto de los grafos de tipos, el generador, el loader y el registry en runtime de DeepSeek Harness |
| waterfall | waterfall | waterfall (eventos en cascada) | | |
| wheel | wheel | | | Formato de empaquetado de Python; el compuesto se escribe `paquete wheel` |
| worktree | worktree | | | Concepto de área de trabajo de git |
| Zstandard | Zstandard | | | Formato de compresión RFC 8878; `zstd` sigue siendo un valor de código. |

## Términos bilingües (cada idioma usa el suyo)

| English | Español | Primera aparición | No traducir como | Notas |
|---|---|---|---|---|
| adapter | adaptador | | | |
| adapter contract | contrato de adaptador | contrato de adaptador (adapter contract) | | |
| append-only | de solo anexado | | | |
| artifact | artefacto | | producto | |
| backend | backend | | | |
| binder | vinculador | | | Rol nombrado: vincula una interfaz declarada al context o al ciclo de vida del llamante |
| config | configuración | | | Rol nombrado: un valor de configuración resuelto o un registro de configuración estrictamente delimitado |
| controller | controlador | | | Rol nombrado: acepta una intención y cambia un estado de dominio o de presentación existente |
| directory | directorio | | | Rol nombrado: expone entradas y metadatos para descubrimiento o selección |
| engine | motor | | | Rol nombrado: implementa un algoritmo de dominio o un modelo de ejecución con estado |
| gateway | puerta de enlace | | | Rol nombrado: adapta un límite de proceso, red, RPC o API |
| handle | identificador | | | Rol nombrado: referencia y controla u observa un recurso en vivo |
| policy | política | | | Rol nombrado: decide qué se permite, selecciona, limita u observa |
| presenter | presentador | | | Rol nombrado: convierte valores de dominio en intención de renderizado de forma pura |
| resolver | resolvedor | | | Rol nombrado: calcula o localiza una respuesta a partir de una entrada |
| store | almacén | | | Rol nombrado: posee un conjunto de datos y ofrece principalmente operaciones sobre ellos |
| background job | tarea en segundo plano | | | |
| block | bloque | | | |
| build target | objetivo de compilación | | | |
| cancel | cancelar | | | |
| canary test | prueba canary | | prueba de canario | Este repositorio conserva `canary` |
| capability | capacidad | | | Hay que distinguirlo de `feature` → `funcionalidad` |
| capability seam | capability seam | | seam de funcionalidad、costura de capacidad | Concepto de arquitectura nombrado de este repositorio: los tres roles Service Definition, Service Provider y Consumer forman una capacidad reemplazable completa; un `seam` ordinario sigue su propia entrada |
| feature | funcionalidad | | capacidad | Unidad de producto gestionable en el producto SDK y en el modelo de ingeniería |
| feature option | opción de funcionalidad | | variant | Una implementación o configuración acotada y seleccionable dentro de una funcionalidad del SDK |
| checkpoint | punto de control | | | |
| chunk | fragmento | | | |
| compaction | compactación | compactación (compaction) | | |
| companion tool | herramienta complementaria | | | |
| composition bundle | paquete de composición | | | Restringe solo el contexto de composición de la aplicación o de los plugins, no todo `bundle` |
| Cordis plugin config | configuración de plugin de Cordis | | | El objeto `Config` o la estructura de configuración que un plugin de Cordis expone |
| config key | clave de configuración | | | Un solo campo dentro de la configuración de un plugin de Cordis |
| consumer | consumidor | | | |
| content block | bloque de contenido | | | |
| Cookbook | manual de referencia | | | Término de títulos de documentación |
| context | contexto | | | |
| counterpart | contraparte | | archivo opuesto、archivo emparejado | Contexto de emparejamiento bilingüe; para "el otro lado" en general se puede escribir «el otro lado» |
| configurable-provider directory | directorio de proveedores configurables | | | Directorio mantenido por `registerConfigurableProviders()` en el seam llm; sigue el precedente de Service Catalog → «catálogo de servicios» |
| context compaction | compactación de contexto | compactación de contexto (context compaction) | | |
| contract | contrato | | | P. ej.: `pairing contract` → `contrato de emparejamiento` |
| Cordis config entry | entrada de configuración de Cordis | | | Una entrada de la lista de plugins de `cordis.yml`; la implementación del plugin se escribe `plugin de Cordis` |
| Cordis plugin | plugin de Cordis | | | La implementación de plugin que Cordis carga, no una entrada de configuración de `cordis.yml` |
| crash recovery | recuperación tras fallo | | | |
| deploy root | directorio raíz de despliegue | | | |
| dormant | inactivo | | durmiente、latente | Se refiere a un proveedor declarado configurable pero sin rutas registradas actualmente |
| durability | durabilidad | | | |
| feature requirement | dependencia de funcionalidad | | | La relación que una funcionalidad u opción de funcionalidad declara mediante `requires` |
| event | evento | | | |
| event log | registro de eventos | | | |
| event stream | flujo de eventos | | | |
| event-sourced | de origen de eventos | | | Siguiendo la traducción habitual de la comunidad DDD |
| Executive summary | resumen ejecutivo | | | Término de títulos de postmortems |
| executor | ejecutor | | | |
| expected output | salida esperada | | oráculo | Se refiere al artefacto de comparación de snapshots; los ejemplos calibrados manualmente del corpus de traducción no entran en esta entrada |
| extension | extensión | | | |
| extension point | punto de extensión | | | No confundir con `seam` |
| fail-fast | de fallo rápido | | | |
| fenced code block | bloque de código delimitado | | | Siguiendo la traducción habitual de la documentación de Markdown |
| fingerprint | huella | | | Huella de contenido genérica; el mecanismo de emparejamiento bilingüe usa un sidecar record para registrar los hashes de ambos lados por sección |
| finish reason | razón de finalización | | | |
| fold | sección plegable | | | Contexto de interfaz de configuración: partición de campos contraída por defecto (collapsed → «contraído») |
| foreground run | ejecución en primer plano | | | |
| freshness | frescura | | | En este proyecto, el estado de sincronización de la traducción respecto a la fuente |
| hook | hook | | | |
| implementation | implementación | | | |
| inference | inferencia | inferencia (inference) | | Cuando haya que distinguirla de `reasoning`, conservar la glosa en inglés |
| info string | cadena de información | | | Siguiendo la traducción habitual de CommonMark; la anotación de lenguaje tras la cerca ``` de código |
| injection | inyección | | | |
| integration | integración | | | |
| interface | interfaz | | | |
| keyboard shortcut | atajo de teclado | | | Como etiqueta de UI: «Atajo de teclado» |
| language switcher | línea de cambio de idioma | | | Término del mecanismo de emparejamiento i18n: la línea de enlaces cruzados al inicio de los archivos emparejados |
| merge | merge | | | |
| message | mensaje | | | |
| mod | mod | | | |
| model | modelo | | | Como etiqueta de UI: «Modelo» |
| model provider | proveedor de modelos | | | Un proveedor o puerta de enlace que ofrece API de modelos: los textos de la página de ajustes de modelos, las guías de usuario sobre providers y el README de `ui-settings-models` usan «proveedor de modelos»; la documentación para desarrolladores del seam llm (directorio de proveedores configurables, dormant, etc.) sigue usando «proveedor» |
| model selection | selección de modelo | | objetivo de modelo | La selección de proveedor, modelo e intensidad de razonamiento opcional orientada al agent. |
| module | módulo | | | |
| non-escalation | no escalación | | no elevación、sin escalado | Solo en contextos de seguridad y permisos: el sujeto no debe obtener permisos más allá de su autorización existente; no aplica al ascenso ordinario |
| npm dependency | dependencia de NPM | | | Relaciones de paquetes en `package.json`; los campos `dependencies`, `devDependencies`, etc. se conservan tal cual |
| opt-out ratio | proporción de exclusión voluntaria | | proporción de salida de la revisión | |
| orphan | huérfano | | | Un `.es.md` cuya fuente en inglés ya no existe (p. ej. «traducción huérfana»); en contexto de procesos se usa el término habitual del SO «proceso huérfano» |
| orphan branch | rama huérfana | | | Siguiendo la traducción habitual de git |
| package | paquete | | | Se refiere a paquetes npm (`@deepseek-ai/dsh-*`); identificadores de código como `package.json` se conservan tal cual |
| pairing | emparejamiento | | | |
| parent-subset grants | concesiones de subconjunto del padre | | concesiones del conjunto padre | El ámbito de la concesión se limita a un subconjunto de las concesiones que posee el padre |
| peer dependency | dependencia de pares | dependencia de pares (peer dependency) | | |
| permission | permiso | | | |
| persistence | persistencia | | | |
| pipeline | pipeline | | | |
| plugin | plugin | | | |
| postmortem | postmortem | postmortem (análisis post-incidente) | análisis posterior、registro de incidente | Documento de registro y análisis de incidentes; `postmortem` en directorios o rutas se conserva en forma de código |
| prompt | prompt | | | |
| provider | proveedor | | | Proveedor genérico (de búsqueda, de inspección, de archivos de settings, de subagents, etc.); para proveedores o puertas de enlace de modelos véase la fila model provider |
| provider-neutral | agnóstico de proveedor | | neutral respecto al proveedor | |
| quality gate | puerta de calidad | | | |
| quiescence | quiescencia | | silencio、estado de reposo | El estado en que todo el trabajo del ciclo de vida ha quedado liquidado |
| reasoning | razonamiento | razonamiento (reasoning) | | Cuando haya que distinguirlo de `inference`, conservar la glosa en inglés |
| reasoning_content | contenido de razonamiento | | | |
| registry | registry | | | |
| replay | reproducción | | | |
| resume | reanudar | | | |
| runtime | runtime | | | |
| same-world subprocess | subproceso que comparte sistema de archivos y kernel con el anfitrión | | subproceso del mismo mundo | |
| sandbox | sandbox | | | |
| service | servicio | | | |
| serving interface | interfaz de servicio externa | | | |
| session | sesión | | | Como etiqueta de UI: «Sesión» |
| session event | evento de sesión | | | |
| settings | configuración | | | Página o panel de ajustes del producto; como etiqueta de UI: «Configuración» |
| setup card | tarjeta de configuración | | | Tarjeta de configuración que se despliega en la primera ejecución en lugar de la tarjeta de línea |
| sidecar file | archivo sidecar | | | Un archivo acompañante ordinario en el mismo directorio que el documento |
| sidecar record | registro sidecar | | registro auxiliar | El archivo de registro acompañante en el mismo directorio que el documento |
| smoke test | prueba de humo | | | |
| snapshot | snapshot | | | |
| source of truth | fuente de verdad | | única fuente、fuente de hechos | |
| spine | espina dorsal | | | |
| stale | desactualizado | | caducado | Forma pareja de `fresh` (`fresco`); la salida de las puertas conserva `stale` en inglés sin traducir; `expired` sí se traduce como «caducado» |
| step | paso | | | |
| stream | flujo | | | |
| structural signature | firma estructural | | | Término del mecanismo de emparejamiento i18n: la secuencia estructural ordenada (niveles de encabezado, bloques de código, listas, etc.) que la puerta extrae al comparar ambos lados |
| Summary | resumen | | | Término de títulos de postmortems |
| system prompt | prompt del sistema | | | |
| taxonomy | taxonomía | | | |
| terminal | terminal | | | Como etiqueta de UI: «Terminal» |
| token usage | uso de tokens | | | |
| tool | tool | | | |
| tool call | llamada a tool | | | |
| tool result | resultado de tool | | | |
| tool schema | schema de tool | | | |
| toolkit | juego de herramientas | | | |
| turn | turno | | | |
| VFS | VFS | sistema de archivos virtual (VFS) | | |
| typecheck | verificación de tipos | | | |
| vocabulary | vocabulario | | | |
| wire format | formato de cable | formato de cable (wire format) | | |
| workflow | flujo de trabajo | | | |
| workspace | espacio de trabajo | | | Como etiqueta de UI: «Espacio de trabajo»; el concepto de git worktree tiene su propia fila |
| wrapper | envoltorio | | | Capa de software o envoltorio de SDK |
| wrapper script | script envoltorio | | | Envoltorio de script ejecutable |
