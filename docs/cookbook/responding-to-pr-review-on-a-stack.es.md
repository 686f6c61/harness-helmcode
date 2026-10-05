# Respuesta a la revisión a lo largo de una cadena de PRs apilados

[English](responding-to-pr-review-on-a-stack.md) | Español

Los comentarios de revisión pueden apuntar a varios PRs (Pull Request) de una stack dependiente (`A ← B ← C …`). Mantener esa cadena enlazada a través de la funcionalidad oficial de PRs apilados de GitHub. Esta guía posee la ubicación y propagación de las correcciones de revisión; la skill (habilidad) [dsh-merging-stacked-prs](../../.agents/skills/dsh-merging-stacked-prs/SKILL.md) posee las comprobaciones de enlace y el aterrizaje.

## Reglas base

1. **Un worktree por rama de PR.** Las correcciones de cada PR ocurren en el worktree propio de ese PR; las correcciones en paralelo nunca comparten un checkout.
2. **El objeto stack de GitHub es autoritativo.** Las ramas base establecen el orden de dependencia esperado, mientras que `PullRequest.stack` y `stackEntry.position` demuestran que GitHub lo reconoce. No tratar una cadena de ramas coincidente como una stack oficial sin comprobar esos campos.
3. **Una corrección aterriza en el PR que INTRODUJO el problema, y luego fluye stack arriba.** Cuando un comentario en el PR `B` apunta a código que `B` introdujo, corregirlo en `B` y propagar `B` a `C`, aunque `C` también porte el archivo. Originarse la corrección stack abajo deja a `B` entregando el código sin corregir y oculta la corrección al revisor de `B`.
4. **Cada corrección de revisión permanece un commit distinto.** Un rebase posterior puede cambiar su OID, pero no hacer amend de una corrección revisada hasta sacarla del historial de la rama. Hacer amend solo de trabajo propio aún no publicado y aún no revisado.
5. **Elegir merge-forward o rebase deliberadamente.** Ambos historiales están permitidos tras la revisión. Un push reescrito debe estar protegido por lease y debe abortar en lugar de sobrescribir un head remoto avanzado concurrentemente; el `--force` crudo está prohibido.

## Resolver comentarios a través de la stack

1. Hacer triaje de cada comentario por sus méritos antes de actuar: verificar la afirmación contra el código; un revisor que señala el síntoma correcto aún puede diagnosticar mal la causa.
2. Mapear cada hallazgo aceptado a su PR de origen y corregirlo allí.
3. Propagar la capa corregida a través de cada hija afectada en orden:
   - **Merge-forward:** fusionar la rama padre corregida en su hija, validar la hija y continuar hacia arriba. Preservar cada punto de control en curso.
   - **Rebase nativo en cascada:** usar `gh stack rebase`, validar las capas reescritas, y luego publicar con `gh stack push`; o usar `gh stack sync`, que puede publicar primero y por tanto requiere validación inmediata post-sync bajo [dsh-pre-push-checks](../../.agents/skills/dsh-pre-push-checks/SKILL.md).
4. Tratar las correcciones delegadas como confiar-pero-verificar: el informe de un subagent describe intención, no necesariamente lo que aterrizó. Reejecutar las puertas uno mismo sobre el árbol real, y para un guardia de regresión, demostrar que FALLA sobre el código sin corregir (introducir la regresión, ver el rojo, revertir): un guardia que pasa en ambos sentidos no guarda nada. Un subagent que replantea un problema como ya manejado es una señal para profundizar personalmente.
5. Responder en el hilo de revisión (`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`), no como comentario de nivel superior, indicando la corrección y el commit o head actual que la porta.
6. Tras cualquier push reescrito, releer hilos no resueltos, aprobaciones, fusionabilidad y comprobaciones. Un OID de commit con force-push o un ancla en línea obsoleta no es evidencia actual de que el hallazgo siga resuelto.
7. Aterrizar solo a través del procedimiento oficial de stack. Si los PRs aún no están enlazados, la skill de aterrizaje enlaza automáticamente una cadena del mismo autor, pregunta antes de enlazar autores mezclados, y se detiene en seco cuando el soporte nativo de stacks no está disponible.

## Verificar

- El diff actual de cada PR corregido contiene la corrección pretendida en la capa que introdujo el problema.
- GraphQL reporta una única stack oficial en el orden esperado, y cada diff hija contra su padre muestra solo los cambios de esa hija.
- Los hilos no resueltos, aprobaciones, fusionabilidad y comprobaciones se re-auditaron tras cada push reescrito.
- Las puertas relevantes pasan en cada PR afectado de la stack, no solo en el tope.
