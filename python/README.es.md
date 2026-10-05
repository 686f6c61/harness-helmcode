# DeepSeek Harness Python SDK

[English](README.md) | Español

Paquetes de Python para manejar DeepSeek Harness como subproceso. El SDK cliente se comunica con el runtime empaquetado mediante JSON-RPC delimitado por líneas sobre stdio.

## Paquetes

| Directorio | Dist / módulo | Rol |
|---|---|---|
| [sdk](sdk/README.es.md) | `deepseek-harness-sdk` / `deepseek_harness` | API de turnos de alto nivel y cliente JSON-RPC de bajo nivel |
| [sdk-runtime](sdk-runtime/README.es.md) | `deepseek-harness-runtime-bin` / `deepseek_harness_runtime` | Ejecutable `dsh` CLI empaquetado y sidecars nativos |

## Comportamiento

El SDK inicia el runtime empaquetado correspondiente de `dsh --profile sdk` salvo que el llamante seleccione otro ejecutable `dsh` u otro perfil. El ejemplo mínimo ejecutable selecciona el perfil independiente `sdk-minimal` distribuido; el mismo runtime también empaqueta `dsh web` y sus assets de frontend para uso por separado desde la CLI. Cada lanzamiento requiere un directorio home de Harness seleccionado explícitamente; Python nunca lee `~/.dsh` de forma silenciosa. La [referencia del SDK](sdk/README.es.md) y la [referencia del carrier del runtime](sdk-runtime/README.es.md) son propietarias de la selección del runtime, los perfiles, los parches y la gestión de plugins externos.

## Flujos de trabajo del contribuidor

Los [flujos de trabajo del contribuidor de Python](development.es.md) cubren la compilación de los artefactos del runtime, la validación de los paquetes, el desarrollo en modo fuente y la distribución.
