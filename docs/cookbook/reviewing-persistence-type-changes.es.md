---
description: "Generar, reconocer y verificar localmente los cambios de tipos de persistencia de Session antes de abrir una pull request."
---

# Manual de referencia: revisar cambios de tipos de persistencia

[English](reviewing-persistence-type-changes.md) | Español

## Resumen

Usar este tutorial tras cambiar un tipo de persistencia de Session declarado en un checkout de contribuidor con dependencias instaladas. Suministrar una explicación de compatibilidad bilingüe, y luego dejar que un solo comando clasifique el cambio y genere sus registros. La [referencia de registros](../persistence-changes/README.es.md) explica los archivos y las reglas automáticas. Todas las entradas de comparación viven en el checkout; no se requiere rama base ni acceso a la red.

## Tabla de contenidos

- [Opcional: inspeccionar el cambio](#generate)
- [1. Registrar el cambio](#acknowledge)
- [2. Comprobar, commitear y publicar](#verify)
- [Actualizar un registro no aceptado](#competing-records)
- [Nota de desarrollo](#dev-note)

-----

<a id="generate"></a>
## Opcional: inspeccionar el cambio

Para una vista previa antes de registrar, ejecutar desde la raíz del repositorio:

```sh
pnpm --silent run verify-persistence-changes --json
```

Usar `--silent` al consumir JSON: pnpm en caso contrario añade texto de fallo de ciclo de vida a stdout. Los comandos fallidos siguen saliendo con código 1.

Leer la raíz reportada, la ruta, la clase de cambio y el requisito de versión. Un tipo referenciado puede afectar a varios digests de eventos; inspeccionar cada raíz afectada. Hasta que el historial cubra los nuevos schemas, la verificación falla. Un inventario generado desactualizado también falla la verificación; el comando de registro lo refresca. Si `changes` está vacío tras reordenar campos o alternativas de unión, ejecutar `pnpm run gen-persistence-catalog` y repetir la comprobación. Un digest sin cambios no necesita nuevo reconocimiento aunque declaraciones copiadas o ubicaciones de fuente produzcan un diff del catálogo.

Para revisar un PR independientemente de su historial de reconocimiento, guardar los inventarios de base y head como archivos JSON locales y ejecutar:

```sh
pnpm --silent run persistence-review --before .artifacts/base.schema.json --after docs/persistence-schema.json
```

Registrar con el informe los commits que suministran esos archivos. Añadir `--json` para salida estructurada. Esta comparación de solo lectura agrupa los cambios compartidos con sus raíces afectadas y usa los valores literales reales de `kind`/`form` en lugar de posiciones de unión. Las alternativas ambiguas permanecen como adiciones y eliminaciones separadas. Su sección de compatibilidad copia el resultado del clasificador autoritativo de cada raíz; la explicación estructural no reemplaza las comprobaciones de reconocimiento. Las etiquetas del catálogo actual y los nombres de declaración son metadatos descriptivos; los anclas estructurales y las huellas identifican los tipos.

El inventario de máquina actual almacena grafos completos en `roots`. Una entrada `types` contiene `digest`, `names` y `sources`, más un `schema` explícito cuando las raíces no pueden reconstruir ese grafo exactamente. Los lectores resuelven los grafos omitidos desde subgrafos de raíz por digest y validan los grafos explícitos directamente, preservando cada tipo y sus metadatos. Las entradas completas históricas siguen siendo legibles. `formatVersion` identifica las reglas de normalización; la compactación de almacenamiento no cambia las huellas de raíz ni requiere un reconocimiento.

<a id="acknowledge"></a>
## 1. Registrar el cambio

Comprobar primero la [línea base aceptada](../session-format-status.es.md#finalization-record). Preservar sus registros bloqueados. Registrar la evolución retrocompatible en un nuevo reconocimiento de la misma versión; implementar una versión de escritor superior antes de registrar un cambio rompiente.

Escribir un archivo JSON local que contenga `en` y `zh`, cada uno con las cadenas `summary`, `compatibility` y `verification`. La siguiente entrada describe un cambio ejercitado de campo de auditoría de hook de requerido a opcional. Reemplazar la explicación y la evidencia de tests con hechos sobre tu cambio; la CLI no establece estas afirmaciones.

Guardar la entrada como `.artifacts/persistence-change.prose.json`, creando el directorio ignorado si es necesario:

```json
{
  "en": {
    "summary": "Makes the persisted hook audit decision optional.",
    "compatibility": "Existing records remain valid. Hook execution consumes HookOutput instead of replaying this audit field. Producers still write decisions, and absence does not imply pass.",
    "verification": "pnpm exec vitest run packages/hooks/hook-protocol/tests/events.spec.ts: 10 tests passed."
  },
  "zh": {
    "summary": "将持久化的钩子审计决策改为可选。",
    "compatibility": "已有记录仍然有效。钩子执行消费 HookOutput，不回放此审计字段。写入方仍然记录决策，缺失不代表 pass。",
    "verification": "pnpm exec vitest run packages/hooks/hook-protocol/tests/events.spec.ts：10 个测试通过。"
  }
}
```

Usar una fecha y un slug descriptivo en lugar de este id de ejemplo:

```sh
pnpm --silent run persistence-changes --record 2026-09-11-poc-optional --prose .artifacts/persistence-change.prose.json --json
```

El comando valida el historial y la prosa emparejada, infiere la decisión de versión mínima y comprueba cualquier aumento de cabecera requerido antes de escribir. Genera el par de registros, completo tras los schemas, ambos catálogos, el inventario de máquina y los registros de emparejamiento. Revisar las explicaciones y los `changes`, `roots` y `files` devueltos antes de commitear. Omitir `--prose` crea borradores sin terminar que la verificación rechaza hasta que se completan sus explicaciones.

La inferencia sigue las [reglas fijas de compatibilidad](../persistence-changes/README.es.md#compatibility-rules); nunca cambia el fuente ni las relaja. Si se requiere una subida, seguir primero [añadir una versión del formato de Session](adding-a-session-format-version.es.md). El registro debe incluir su propia transición creciente de `SessionHeader.version`; una subida histórica no relacionada no puede autorizarlo. Los cambios rutinarios nunca crean otra línea base.

<a id="verify"></a>
## 2. Comprobar, commitear y publicar

Seleccionar las comprobaciones de comportamiento del propietario cambiado a través de la [política de testing](../testing.es.md), y luego ejecutar las comprobaciones de documentación:

```sh
pnpm run doc-sync
```

`doc-sync` comprueba la frescura del inventario y el catálogo de persistencia, el historial completo y el emparejamiento bilingüe. Un `ok: true` de un comando de registro no reemplaza estas comprobaciones ni los tests de comportamiento y migración del propietario. Los fallos JSON conservan `ok: false`, un `code` de diagnóstico y código de salida 1. Los cambios estructurales incluyen clases estables y digests antes/después por raíz, así que la automatización no necesita analizar descripciones.

La generación de registros posee sus pares de catálogo y registro; las ediciones a un README de paquete u otra página bilingüe siguen su flujo de trabajo de emparejamiento normal. Revisar y poner en stage el diff pretendido, y luego commitear y publicar normalmente. Los hooks en stage de lint, emparejamiento y espacios en blanco y el typecheck Host/Client de pre-push siguen aplicando.

<a id="competing-records"></a>
## Actualizar un registro no aceptado

Si el fuente cambia tras el registro, revisar la explicación de compatibilidad y refrescar el mismo registro terminal no aceptado:

```sh
pnpm --silent run persistence-changes --update 2026-09-11-poc-optional --prose .artifacts/persistence-change.prose.json --json
```

El comando refresca la declaración de máquina, los schemas, los catálogos y el emparejamiento. Sin `--prose`, preserva la explicación existente. La actualización rechaza la línea base inicial, los registros de los que depende otro registro y los registros de punto de control finalizados. Fuera de los puntos de control finalizados, el árbol no infiere aceptación de revisión: preservar el historial aceptado y crear un sucesor en su lugar.

Cuando la integración crea registros terminales en competencia, actualizar el registro no aceptado contra el historial restante, y luego reevaluar el diff resultante. El reconocimiento de una raíz no relacionada no necesita refresco. La [decisión del mecanismo](../../.agents/notes/implemented/process/2026-09-11-persistence-type-history.md) explica por qué se retienen snapshots completos y predecesores por raíz.

Un `--decision` explícito sigue siendo una aserción comprobada. Para el cambio de tipo de valor de una propiedad existente, la siguiente aserción deliberadamente incorrecta falla antes de escribir:

```sh
pnpm --silent run persistence-changes --update 2026-09-11-poc-optional --decision same-version --json
```

<a id="dev-note"></a>
## Nota de desarrollo

<details>
<summary>Contexto de trabajo para mantenedores: clic para expandir</summary>

Ninguno.

</details>
