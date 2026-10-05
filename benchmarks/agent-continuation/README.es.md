# Benchmarks de continuación del backend

[English](README.md) | Español

## Resumen

Mide el procesamiento de peticiones con historial largo, la continuación en frío con uso intensivo de tools y el descubrimiento repetido de hijos de fork inactivos, sin servicios de red ni datos de usuario grabados. La variante SDK ejecuta 100 turnos y 800 lecturas reales de archivos a través del perfil sdk-minimal distribuido con un parche explícito del editor; los demás casos aíslan los costes de los servicios del backend. Ningún caso renderiza un navegador.

## Índice

- [Ejecución](#run)
- [Mediciones](#measurements)
- [Nota de desarrollo](#dev-note)

<a id="run"></a>

## Ejecución

Desde la raíz del repositorio, compilar las bibliotecas y los workers con `pnpm run build:bench` y luego ejecutar `pnpm exec vitest run --config vitest.bench.config.ts benchmarks/agent-continuation/agent-continuation.bench.ts`. No solapar las ejecuciones de medición con compilaciones ni con otros benchmarks.

La prueba informa de las cinco muestras de procesos nuevos, los modelos de CPU, el paralelismo disponible, la plataforma/arquitectura y las versiones de Node/V8, y hace cumplir presupuestos de mediana revisados. La continuación de catálogo y la de tools usan cada una una expectativa de CI hospedada estándar de 900 ms con un margen de 1,25× (1125 ms); el historial de peticiones usa un límite hospedado de 297 ms revisado por separado ([evidencia](../../.agents/notes/implemented/simplification/2026-09-06-agent-request-freeze-evidence.md)), y la continuación SDK usa escalado de máquina de referencia. Un worker que falla informa de su salida, señal, tiempo de espera y stderr; las raíces temporales se eliminan incluso en caso de fallo. El carril de benchmarks obligatorio descubre este archivo automáticamente.

<a id="measurements"></a>

## Mediciones

[workload.ts](workload.ts) posee las dimensiones sintéticas. Su historial de generación actual reserva una cabecera de sistema vacía en el primer paso antes de la entrada del usuario, de modo que los prompts reanudados reemplazan esa cabecera sin mover los mensajes históricos. [El Agent Note](../../.agents/notes/implemented/testing/2026-09-06-backend-continuation-performance.md) posee los endpoints de medición temporal, la evidencia de calibración, la interpretación de la memoria y las exclusiones. El adaptador de modelo no realiza serialización de proveedor ni llamadas de red; los casos integrados ejecutan cuerpos de tools sintéticos a través del pipeline real de ejecución de tools, mientras que la variante de perfil SDK realiza lecturas reales de archivos.

## Nota de desarrollo

Ninguna.
