# Usar la Web UI

[English](index.md) | Español

Iniciar la Web UI a través del [README raíz](../../../README.en.md); el comando imprime su URL. Esta guía comienza cuando ese servidor ya está en ejecución. El proceso `dsh` usa su directorio de invocación como ubicación de archivos por defecto, pero una Web UI nueva no tiene ningún espacio de trabajo seleccionado hasta añadir uno.

## Configurar un modelo

Abrir **Configuración → Modelos**, introducir una [clave de API de DeepSeek](https://platform.deepseek.com/) y guardarla. La ruta del modelo queda usable de inmediato sin reiniciar el servidor.

La [guía de configuración de modelos](./providers.es.md) cubre otros proveedores y endpoints personalizados compatibles con OpenAI.

## Elegir un espacio de trabajo

Hacer clic en **Elegir espacio de trabajo**, añadir el directorio del proyecto donde se inició `dsh` y seleccionarlo. El compositor de sesión permanece no disponible hasta seleccionar un espacio de trabajo.

## Ejecutar una tarea

Iniciar una sesión y enviar:

> Resume este repositorio e identifica sus paquetes principales.

El agent (agente) puede leer y editar archivos del espacio de trabajo, ejecutar comandos, delegar trabajo y mantener un plan. La Web UI pregunta antes de las operaciones que requieren aprobación según la política de permisos activa.

## Continuar

- [Configurar modelos](./providers.es.md)
- [Usar el SDK de Python](./python-sdk.es.md)
- [Usar otros modos del CLI](../../../apps/cli/README.es.md)
- [Desarrollar un plugin](../develop/basic/index.es.md)
