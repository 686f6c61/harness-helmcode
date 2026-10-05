# Glosario

[English](glossary.md) | Español

El vocabulario de dominio de DeepSeek Harness usa un término canónico por concepto. Los términos enlazan a sus entradas con anchors estándar de Markdown; el detalle de implementación permanece en los README de paquetes y en los Agent Notes.

## capability-seam

- **seam**: una *capacidad intercambiable* con tres roles: una **Service Definition** (el `Service` de Cordis que posee su `ctx.<key>` y sus tipos de vocabulario: una clase abstracta como `ShellExecutor`, o un registry concreto como `WebRuntime`, nunca una `interface` de TypeScript), uno o más **Service Providers**, y uno o más **Consumers** que inyectan el servicio. `packages/shell` es el ejemplo canónico: `dsh-shell` (Service Definition), `dsh-bash-local` / `dsh-bash-sandbox` (providers) y `dsh-tool-bash` (Consumer). Los roles normalmente ocupan paquetes separados cuando evolucionan de forma independiente, pero un paquete puede poseer varios roles cuando son una sola preocupación (`dsh-user-approval` posee la Service Definition del seam de aprobación y su implementación concreta en un mismo paquete). El seam es la capacidad completa, nunca un solo rol; reservar el término para ese significado y nombrar un constituyente por su rol, clase, servicio, contrato o punto de extensión.

## agent-scope

- **scope**: la unidad de registro por agent: una contribución (tool, sección de prompt, variable, restricción, listener) es o bien *global* (visible para todo agent) o bien *con scope* (poseída por exactamente una [scope key](#scope-key)). Dos niveles, planos: los registros con scope no se heredan hacia los subagents; el comportamiento de subárbol se expresa con datos de [lineage](#lineage), nunca con estructura de scope.
- **scope key**: la identidad opaca por la que se indexa un scope, comparada por identidad de objeto. La convención del harness: un agent en vivo es la clave de su propio scope. <a id="scope-key"></a>
- **agent context (`agent.ctx`)**: el contexto con scope del agent; los registros a través de él son visibles para el scope Y tienen el tiempo de vida del scope (un solo hecho gobierna ambos), y los listeners sobre él participan en los despachos filtrados por scope de ese agent. Los eventos cuyo sujeto es un registry pueden permanecer deliberadamente sin filtrar bajo sus propios contratos de evento.
- **scope carrier**: el `thisArg` que porta un despacho filtrado por scope (construido por `scopeTarget`); su filtro admite listeners sin etiqueta más los del propio sujeto. Un carrier *sin sujeto* (sin clave) admite únicamente listeners sin etiqueta.
- **scoped dispatch**: la regla: un evento sobre la actividad de un agent se despacha con el carrier de ese agent. Los eventos sobre un registry en sí (se añadió un tool) tienen por *sujeto el registry* y permanecen sin filtrar.
- **shadowing**: resolución de nombres donde gana el más específico: un tool, sección o variable con scope reemplaza a su gemelo global del mismo nombre solo para ese scope. El mecanismo de persona por agent y de variante de tool por agent.
- **restriction / registro local de scope**: una restriction (`tools.restrict`) filtra el conjunto GLOBAL de tools para un scope (se compone por intersección); los registros locales de scope se fusionan después de ese filtro. Un tool global eliminado por el filtro está ausente del prompt Y rechaza la ejecución, de forma indistinguible de uno inexistente.
- **setup window**: el intervalo de creación en el que un creador compone el mundo con scope de un agent (`CreateAgentOptions.setup`): después de que el scope y el objeto agent existen, pero antes de que el agent o la sesión se publiquen, de que `agent/created` se dispare o de que se ensamble el primer prompt. El setup registra; nunca dirige el agent.
- **lineage**: hechos de relación padre/hijo transportados como datos (`parentSession`, `delegationDepth` duradero, `subagentDepth` en runtime); nunca afectan a la visibilidad. <a id="lineage"></a>

## goal

- **goal**: un objetivo de finalización duradero asociado a una sesión existente, con una fase versionada `active` / `paused` / `blocked` / `complete` y un límite de Goal Rounds; `blocked` retiene un código de política y una explicación. Un goal es estado, no un planificador ni una conversación separada; el registro de sesión sigue siendo su fuente de verdad.
- **Goal Round**: un ciclo de continuación admitido para el goal actual. El driver de la misma sesión materializa un Goal Round como un [turno](#turn) originado por el goal, que puede contener cero o más pasos; los turnos humanos no relacionados en la misma sesión no consumen el límite de Goal Rounds. <a id="goal-round"></a>
- **activación de goal**: permiso local al proceso para que un consumidor de continuación admita otro Goal Round. La activación es `armed` o `disarmed`; está deliberadamente ausente de la reproducción duradera, de modo que reanudar y hacer fork requieren una mutación de reanudación posterior autorizada por un humano a través de `/goal` o del tool del modelo antes del trabajo automático.

## comando humano

- **comando humano**: una instrucción con prefijo de barra interpretada y ejecutada por un adaptador orientado a humanos a través de `ctx.commands`, sin convertirse en un mensaje de modelo. Es distinto de un tool orientado al modelo y de la ejecución de comandos de shell a través de `ctx.shell`.
- **plano de comandos**: descubrimiento, análisis, despacho, cancelación y renderizado de resultados, poseídos por los adaptadores de UI y los plugins de comandos. La salida de un comando es estado de UI, salvo que el manejador mute por separado un dominio duradero.
- **comando goal**: el comando humano `/goal` contribuido por `dsh-command-goal`; observa o muta el goal actual directamente mientras el dominio de goals posee cada registro duradero y visible para el modelo.

## jerarquía del loop

- **turno**: un vaciado de entrada admitida en una sesión, que termina después de que el modelo y sus tools se detienen o de que interviene una política terminal. <a id="turn"></a>
- **paso**: una solicitud de modelo más las ejecuciones de tools causadas por su respuesta; un turno contiene cero o más pasos. <a id="step"></a>
- **Round**: una iteración de política externa que porta un turno, como un [Goal Round](#goal-round) o un intento Ralph con agent nuevo. Los contadores de Rounds pertenecen a esa política y no cuentan cada turno de una sesión. <a id="round"></a>

## Ralph

- **Ralph loop**: una ejecución en primer plano del flujo de trabajo con agent nuevo hacia un objetivo inmutable. Es una política de tool orientada al modelo compuesta a partir de primitivas de workflow y de subagents, no un goal de la misma sesión, un modo del agent loop, un planificador ni una funcionalidad genérica de scripts de workflow. <a id="ralph-loop"></a>
- **Ralph Round**: una sesión hija nueva en un [Ralph loop](#ralph-loop). La hija no recibe semilla de conversación del padre ni de hijas anteriores; el espacio de trabajo compartido y un [Ralph handoff](#ralph-handoff) acotado transportan el estado entre Rounds. <a id="ralph-round"></a>
- **Ralph handoff**: el informe estructurado, normalizado y acotado que pasa de un Ralph Round que continúa al siguiente, con estado, resumen, evidencia, pasos siguientes y texto de bloqueo. Complementa el espacio de trabajo compartido en lugar de reemplazarlo como autoridad. <a id="ralph-handoff"></a>
