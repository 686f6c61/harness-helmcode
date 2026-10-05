---
description: "Recorre los cambios de tipos de persistencia de Session entre todos los tags alpha/RC de DSH capturados y valida los snapshots históricos sin conexión."
---

# Cambios de persistencia en las versiones preliminares de DSH

[English](README.md) | Español

## Resumen

Este archivo ofrece una vista histórica aproximada de 26 tags alpha/RC de DSH y sus 25 transiciones adyacentes. Cada versión incluye una breve explicación, el tag de origen, huellas antes/después y snapshots completos de los tipos modificados, para lectura y validación de formato. No establece compatibilidad histórica del runtime ni sustituye a las [confirmaciones del código fuente actual](../README.es.md).

## Índice

- [Versiones archivadas](#releases)
- [Archivos y alcance](#files)
- [Extracción y limitaciones](#extraction)
- [Verificación](#verification)
- [Nota de desarrollo](#dev-note)

-----

<a id="releases"></a>
## Versiones archivadas

El [manifest](manifest.json) (lista de metadatos) registra todos los tags alpha/RC de DSH capturados el 2026-09-12: 16 tienen registros de versión y los 10 más antiguos solo tienen tag. Las entradas siguen el orden de versionado semántico; los tags ausentes no se inventan. La primera entrada establece el punto de partida histórico, por lo que su recuento de cambios incluye todas las raíces.

<!-- persistence-release-index:start -->

| Tag | Fecha fuente (UTC) | Versión de Session | Raíces / tipos | Raíces cambiadas |
|---|---|---|---|---|
| [dsh-v0.0.1-rc.1](dsh-v0.0.1-rc.1.es.md) | 2026-08-10 | 0 | 42 / 341 | 42 |
| [dsh-v0.0.1-rc.2](dsh-v0.0.1-rc.2.es.md) | 2026-08-11 | 0 | 47 / 374 | 45 |
| [dsh-v0.0.1-rc.3](dsh-v0.0.1-rc.3.es.md) | 2026-08-12 | 0 | 47 / 374 | 12 |
| [dsh-v0.0.1-rc.4](dsh-v0.0.1-rc.4.es.md) | 2026-08-12 | 0 | 47 / 374 | 0 |
| [dsh-v0.0.1-rc.5](dsh-v0.0.1-rc.5.es.md) | 2026-08-12 | 0 | 47 / 374 | 0 |
| [dsh-v0.1.0-rc.1](dsh-v0.1.0-rc.1.es.md) | 2026-08-13 | 0 | 47 / 374 | 0 |
| [dsh-v0.1.0-rc.2](dsh-v0.1.0-rc.2.es.md) | 2026-08-13 | 0 | 47 / 374 | 0 |
| [dsh-v0.1.0-rc.3](dsh-v0.1.0-rc.3.es.md) | 2026-08-13 | 0 | 47 / 374 | 0 |
| [dsh-v0.1.0-rc.5](dsh-v0.1.0-rc.5.es.md) | 2026-08-13 | 0 | 47 / 374 | 0 |
| [dsh-v0.1.0-rc.6](dsh-v0.1.0-rc.6.es.md) | 2026-08-13 | 0 | 47 / 374 | 0 |
| [dsh-v0.1.0-rc.7](dsh-v0.1.0-rc.7.es.md) | 2026-08-17 | 0 | 47 / 376 | 1 |
| [dsh-v0.1.0-rc.8](dsh-v0.1.0-rc.8.es.md) | 2026-08-19 | 0 | 51 / 403 | 8 |
| [dsh-v0.1.1-rc.1](dsh-v0.1.1-rc.1.es.md) | 2026-08-21 | 0 | 51 / 407 | 1 |
| [dsh-v0.1.1-rc.2](dsh-v0.1.1-rc.2.es.md) | 2026-08-21 | 0 | 51 / 404 | 10 |
| [dsh-v0.1.2-alpha.1](dsh-v0.1.2-alpha.1.es.md) | 2026-08-27 | 0 | 54 / 417 | 52 |
| [dsh-v0.1.2-alpha.2](dsh-v0.1.2-alpha.2.es.md) | 2026-08-30 | 0 | 54 / 417 | 52 |
| [dsh-v0.1.2-alpha.3](dsh-v0.1.2-alpha.3.es.md) | 2026-08-31 | 0 | 54 / 417 | 0 |
| [dsh-v0.1.2-alpha.4](dsh-v0.1.2-alpha.4.es.md) | 2026-09-01 | 0 | 54 / 415 | 4 |
| [dsh-v0.1.2-alpha.5](dsh-v0.1.2-alpha.5.es.md) | 2026-09-02 | 0 | 54 / 415 | 0 |
| [dsh-v0.1.2-rc.1](dsh-v0.1.2-rc.1.es.md) | 2026-09-03 | 0 | 54 / 415 | 0 |
| [dsh-v0.1.3-alpha.1](dsh-v0.1.3-alpha.1.es.md) | 2026-09-04 | 2 | 54 / 425 | 17 |
| [dsh-v0.1.3-alpha.2](dsh-v0.1.3-alpha.2.es.md) | 2026-09-07 | 2 | 56 / 435 | 2 |
| [dsh-v0.1.5-alpha.1](dsh-v0.1.5-alpha.1.es.md) | 2026-09-08 | 3 | 57 / 443 | 12 |
| [dsh-v0.1.5-alpha.2](dsh-v0.1.5-alpha.2.es.md) | 2026-09-09 | 3 | 59 / 462 | 4 |
| [dsh-v0.1.5-rc.1](dsh-v0.1.5-rc.1.es.md) | 2026-09-10 | 3 | 59 / 462 | 0 |
| [dsh-v0.1.5-rc.2](dsh-v0.1.5-rc.2.es.md) | 2026-09-10 | 3 | 59 / 462 | 0 |

<!-- persistence-release-index:end -->

<a id="files"></a>
## Archivos y alcance

Cada tag tiene un registro en inglés y español con `kind: persistence-release`, un registro sidecar de emparejamiento y un `.schema.json`. Su declaración de máquina contiene el tag, el predecesor inmediato, la versión del escritor observada y la huella antes/después de cada raíz modificada. El primer snapshot contiene todas las raíces; los snapshots posteriores conservan solo las raíces modificadas que siguen presentes y todos sus tipos alcanzables. Las eliminaciones usan un valor after nulo; las versiones sin cambios conservan los cambios y los snapshots vacíos.

Los snapshots cubren la cabecera lógica de Session, la cabecera física JSONL, el sobre de eventos y cada evento propio y referencia transitiva de ese tag. Los recuentos de tipos incluyen solo las definiciones alcanzables tras la normalización. Las referencias históricas al código fuente conservan las rutas de archivo sin números de línea.

Estos registros retrospectivos se validan por separado de la cadena de confirmaciones actual del directorio padre. Las clasificaciones de cambios antiguos según las reglas actuales son ayudas de lectura: la versión histórica 0 sí contenía cambios estructurales sin incrementos de versión. Un registro rellenado a posteriori no puede autorizar a un PR actual a omitir la confirmación o un incremento de versión requerido.

<a id="extraction"></a>
## Extracción y limitaciones

La reconstrucción utilizó el código fuente de cada tag, TypeScript 6.0.3 y el [extractor de schemas](../../../scripts/persistence-schema.ts) tras su merge. La única adaptación de la extracción omite un miembro `object` redundante de las intersecciones de los registros de eventos concretos de las primeras versiones. Los `any` / `unknown` existentes permanecen opacos; no se sustituyó ningún tipo opaco adicional por referencias sin resolver. El JSON de schema de cada versión conserva los identificadores históricos; las comprobaciones terminológicas siguen aplicándose a los registros de autoría manual y a los schemas actuales.

Los primeros 22 tags declaran legítimamente `surfaceOp` opcional en los eventos surface. El análisis histórico conserva esa opcionalidad; el análisis del código fuente actual sigue exigiendo el campo. Las declaraciones antiguas `SessionHeader.version: number` también se conservan intactas, con las constantes reales de versión del escritor registradas por separado. Una declaración amplia `number` no puede suministrar esa constante.

Los tags capturados usan las versiones de escritor 0, 2 y 3; ningún tag usa la versión de escritor 1.

Las huellas describen tipos reconstruidos normalizados, no el texto fuente literal ni la reproducción de la cadena de herramientas original. Los resúmenes ofrecen un contexto estructural aproximado; no se reprodujeron aplicaciones antiguas, no se validó el comportamiento completo del códec y no se demostró la seguridad de las migraciones. Una huella sin cambios no demuestra un comportamiento sin cambios.

<a id="verification"></a>
## Verificación

Los 26 snapshots superaron la validación de grafo canónico, huellas de raíces y huellas de tipos alcanzables. La comprobación del archivo de versiones solo lee el manifest, los registros y los snapshots de este árbol, sin Git, sin acceso a la red y sin checkouts de versiones antiguas; valida la cobertura del manifest, los predecesores, los valores antes/después, la completitud de tipos de los snapshots y las declaraciones de máquina bilingües.

```sh
pnpm run verify-persistence-releases
pnpm run doc-sync
```

El índice delimitado por marcadores, las celdas de inventario y los hechos de cambios estructurales se generan a partir de los snapshots. La verificación por defecto rechaza los hechos desactualizados. Ejecutar `pnpm run verify-persistence-releases --write` para refrescar esas regiones y los registros de emparejamiento tras validar todos los datos de máquina; los resúmenes de autoría manual, la evidencia de código fuente, las declaraciones de máquina y los archivos de schema se conservan.

La completitud de los tags es relativa al alcance capturado por el manifest; las comprobaciones sin conexión no descubren tags posteriores automáticamente. Las comprobaciones de documentación estándar validan los registros de emparejamiento y los enlaces Markdown. La [plantilla de formato](../../../.agents/skills/dsh-doc/templates/persistence-release.md) define los campos de cada registro.

<a id="dev-note"></a>
## Nota de desarrollo

<details>
<summary>Contexto de trabajo para mantenedores: pulsa para expandir</summary>

Ninguno.

</details>
