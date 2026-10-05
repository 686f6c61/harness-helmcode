# Dimensionado de runners de previsualización de PR

[English](README.md) | Español

## Resumen

El [workflow de previsualización](../workflows/build-preview-cloudflare.yml) compila las previsualizaciones de los PR en `ubuntu-24.04` estándar alojado en GitHub. El dimensionado de runners compara el costo completo del job, no solo el precio por minuto ni el número de núcleos.

## Tabla de contenidos

- [Requisitos de la comparación](#comparison-requirements)
- [Semántica de publicación](#publication-semantics)
- [Nota de desarrollo](#dev-note)

<a id="comparison-requirements"></a>

## Requisitos de la comparación

Un experimento de dimensionado mantiene constantes el SHA del checkout, el lockfile, las versiones de Node y pnpm, la compilación del espacio de trabajo y los comandos de empaquetado de la previsualización y del VFS. Cada runner arranca sin salidas de compilación. Las instalaciones en frío no restauran cachés de dependencias; los archivos de bootstrap de pnpm pueden existir ya. Las instalaciones en caliente restauran exactamente la misma caché sin fallback de prefijo. Hay que registrar la imagen real del runner, la CPU, la RAM, el disco, el resultado de la caché, la duración de cada fase, el estado de salida y la memoria pico. El RSS máximo de GNU time informa un máximo por proceso, no la memoria agregada simultánea de todo el árbol de procesos de la compilación.

El cómputo bruto estimado se calcula como la suma de los minutos transcurridos de cada job completado, redondeados hacia arriba, multiplicados por la tarifa de ese runner. Se incluyen el setup, la restauración de la caché, la limpieza, los fallos y la sobrecarga de subida de mediciones. Los jobs de siembra se reportan por separado. El retraso en cola es una observación de latencia, no tiempo de job ejecutado. Estas estimaciones no son totales de factura; los minutos incluidos y el almacenamiento de los runners estándar son aparte.

Un benchmark de solo compilación no despliega, no accede a las credenciales de Cloudflare ni publica comentarios en el PR. Su costo no establece el costo completo de publicación de la previsualización. Hay que confirmar el runner seleccionado mediante el workflow de previsualización real antes de dar por verificadas la latencia de despliegue y la entrega de la imagen protegida.

<a id="publication-semantics"></a>

## Semántica de publicación

La selección del runner no altera los eventos de PR, la cancelación por PR, la instalación inmutable, el cacheo de dependencias de solo restauración, la compilación completa del espacio de trabajo, el empaquetado de la previsualización, la eliminación de sourcemaps ni la página de previsualización copiada al directorio raíz de despliegue. Cloudflare sube únicamente el sitio compilado al alias de la rama del PR. La comprobación de la imagen protegida exige HTTP 200, ninguna codificación de contenido de transporte y los bytes mágicos de gzip; el comentario con la URL permanece idempotente. Dependabot y los demás autores de PR permanecen en máquinas alojadas en GitHub.

<a id="dev-note"></a>

## Nota de desarrollo

La [decisión sobre runners](../../.agents/notes/implemented/process/2026-09-06-preview-hosted-runner-sizing.md) registra las mediciones, las estimaciones de costo y la variación de imagen y CPU. El experimento de solo compilación no verifica el despliegue de producción.
