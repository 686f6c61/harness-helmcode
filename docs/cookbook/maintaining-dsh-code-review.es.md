# Mantenimiento de la skill dsh-code-review

[English](maintaining-dsh-code-review.md) | Español

La skill (habilidad) [`dsh-code-review`](../../.agents/skills/dsh-code-review/SKILL.md) se mantiene al día por un único operador designado que ejecuta una herramienta privada de mantenimiento periódico. Este manual de referencia es el punto de entrada para ese operador (y para quien asuma el rol), y para los colaboradores del repositorio que quieran entender por qué las actualizaciones de la skill llegan como PRs (Pull Request) periódicos pequeños en lugar de auditorías puntuales. El flujo de trabajo en sí está especificado en el [Agent Note de mantenimiento de skills con revisión humana](../../.agents/notes/proposed/process/2026-07-13-human-review-skill-maintenance.md).

## Qué recibe el mantenedor

El operador invoca el envoltorio manualmente, a diario con un solapamiento de dos días UTC; una ejecución de recuperación semanal manual usa una ventana de siete días. El flujo de trabajo:

1. Selecciona los PRs fusionados en la ventana elegida (por defecto dos días UTC para la cadencia diaria, siete para la semanal) cuyo commit de merge sea alcanzable desde `origin/master`. Los PRs cuyo commit de merge no es alcanzable (ramas apiladas cuyo padre sufrió squash) o que exceden un tope de adquisición de 250 commits se registran en `skipped-pulls.json` y se omiten en lugar de abortar la ejecución.
2. Recoge la retroalimentación de revisión humana previa al merge con anclas de commit (comentarios en línea y envíos de revisión), y luego compara los parches del PR en el momento de la retroalimentación y en su aterrizaje final. No adquiere los comentarios de conversación del PR porque el estado actual de GitHub no puede darles una línea base a prueba de force-push en el momento de la retroalimentación, y excluye de la evidencia de adopción los cambios que solo afectan a la rama objetivo.
3. Dos adaptadores revisores configurados de forma independiente clasifican quién escribió cada elemento y si el cambio lo adoptó, y luego clasifican los elementos acordados como adoptados contra la skill actual.
4. El adaptador primario redacta un `SKILL.md` revisado completo; ambos adaptadores revisan el mismo diff; los hallazgos bloqueantes iteran hasta que ambos aprueban.
5. `pnpm run doc-sync` y `pnpm run lint` se ejecutan contra el candidato antes de que la herramienta declare éxito.

Cada ejecución almacena sus artefactos en la máquina del operador. El diff guardado, el `SKILL.md` candidato y el manifest (lista de metadatos) de promoción aterrizan bajo `~/dsh-code-review-outputs/` nombrados por timestamp. El manifest registra el commit de master fuente y el blob de la skill, los IDs y URL de retroalimentación fuente, los rangos de evidencia aterrizada, los veredictos de los adaptadores y los resultados de las puertas; la E/S cruda por adaptador permanece en un directorio temporal privado cuya ruta se escribe en la notificación y en el registro diario bajo `~/Library/Logs/dsh-code-review-maintainer/`. El propio worktree de mantenimiento se restaura limpio tras cada ejecución para que el operador nunca se vea tentado a editar la copia de mantenimiento en el sitio.

## Qué hace el operador con un diff candidato

Cuando una ejecución produce un candidato, llega una notificación de macOS con una pista `dsh-code-review-promote <timestamp>`.

1. **Leer el diff por sus propios méritos.** No deferir a «los revisores aprobaron»; el contrato del mantenedor es que el operador toma la decisión final. Buscar hinchazón de listas de verificación, prosa histórica, extrapolación no soportada a partir de un único incidente y cobertura duplicada con la skill existente o con contenido de documentación autoritativa.

   ```sh
   ls ~/dsh-code-review-outputs/                         # every candidate ever produced
   less ~/dsh-code-review-outputs/2026-07-16T02-00-00Z.diff
   less ~/dsh-code-review-outputs/2026-07-16T02-00-00Z.SKILL.md
   less ~/dsh-code-review-outputs/2026-07-16T02-00-00Z.manifest.json
   ```

2. **Cruzar contra los artefactos de la ejecución.** El manifest de promoción mapea cada regla propuesta a su retroalimentación fuente y evidencia aterrizada; la E/S detallada por adaptador, el consenso y la evidencia adoptada viven bajo el directorio temporal privado de la ejecución (ruta mostrada en el registro). Comprobar al menos un candidato al azar: ¿el comentario humano enlazado realmente soporta la regla añadida? ¿El PR enlazado realmente la adopta?

3. **Decidir una de tres:**
   - **Descartar.** Borrar el candidato guardado. La herramienta reconsidera la misma retroalimentación en la siguiente ejecución bajo lo que la skill vigente diga entonces.

     ```sh
     rm ~/dsh-code-review-outputs/2026-07-16T02-00-00Z.{diff,SKILL.md,manifest.json}
     ```
   - **Agrupar.** Apartar el candidato si la actualización es pequeña y podría combinarse con una futura. La comprobación contra la skill fuente sigue aplicando; reejecutar el análisis o hacer rebase manual y re-revisar el diff si `master` cambia primero.
   - **Promover.** Desde un checkout limpio de `master` del repositorio, ejecutar el helper de promoción. Refresca `master`, verifica que la skill actual coincide con el blob fuente registrado, aplica el diff guardado y abre un PR en borrador cuyo cuerpo lista las URL o IDs de retroalimentación fuente, el rango de commits aterrizados, la ejecución de origen, las comprobaciones y las ediciones del operador. Se detiene ante deriva de la skill en lugar de sobrescribir guía más nueva; el operador todavía revisa el PR en GitHub y lo fusiona o lo cierra.

     ```sh
     cd ~/path/to/deepseek-harness   # clean master
     dsh-code-review-promote 2026-07-16T02-00-00Z
     ```

4. **No commitear la salida del adaptador al pie de la letra.** Las ediciones pequeñas durante la promoción (afinar la redacción, eliminar un ejemplo que solo tiene sentido con el contexto del PR fuente, plegar una regla dentro de una existente) son esperadas y preservan el «juicio del revisor» del que depende el flujo de trabajo. Hacer amend de la rama antes de fusionar.

## Cuando una ejecución no produce candidato

Ese es el caso común después de que cada etapa de clasificación no vacía ha producido al menos un resultado de adaptador válido. La herramienta registra «sin candidato» en su registro diario, no envía notificación (para evitar fatiga de alertas) y sigue adelante. Los días sin actualización de la skill son el flujo de trabajo comportándose correctamente, no una parada.

## Interrupciones y traspaso

El mecanismo vive en una sola máquina. Interrupciones que el operador maneja según surgen:

- **Ejecución diaria perdida.** La ventana de solapamiento de dos días captura automáticamente un día omitido; los huecos más largos se recuperan ejecutando el envoltorio manualmente con `DSH_CODE_REVIEW_SINCE=<Nd>`. Las ventanas solapadas son idempotentes: la guía ya presente en la skill actual se clasifica `covered` y no reingresa como candidata.
- **Caída del proveedor de adaptadores.** La herramienta se niega a ejecutar cuando los dos comandos revisores resuelven a ejecutables byte idénticos. Un único lote cuya respuesta de adaptador falla la validación de schema o de id se falla cerrado a nivel de lote (cada elemento del lote marcado como unclear) y la ejecución continúa; la salida cruda se preserva para depuración. Si cualquiera de los adaptadores no produce ningún resultado válido para ningún lote no vacío en una operación, la ejecución falla, escribe un registro de fallo y notifica al operador; nunca colapsa una caída total del proveedor en «sin candidato».
- **Traspaso a otro mantenedor.** Abrir un Agent Note de seguimiento que reemplace al actual: o mover el mecanismo al repositorio o registrar la configuración privada del nuevo operador. No transferir la herramienta silenciosamente: el «factor de bus de mantenedor único» de la sección Risks del Agent Note es la razón por la que el traspaso necesita una decisión documentada.

## Dónde vive la configuración privada del operador

El fuente de la herramienta, los adaptadores revisores, las credenciales de proveedores y el planificador son infraestructura privada del operador y están fuera de este repositorio por diseño (véase la sección «Where the mechanism lives» del Agent Note). Este manual de referencia y el Agent Note describen **qué garantiza el flujo de trabajo**; el **cómo** se implementan esas garantías es asunto de la infraestructura privada. Si eres el nuevo operador, las secciones `## Proposal` del Agent Note son la especificación contra la que construyes.
