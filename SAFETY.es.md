# Seguridad

[English](SAFETY.md) | Español

## Estado experimental

DeepSeek Harness es software experimental en developer preview. No ha sido sometido a una auditoría de seguridad y no debe tratarse como seguro ni como listo para producción.

El proyecto puede ejecutar código y comandos generados por un modelo, cargar plugins de terceros y acceder a la red, a los procesos, a las credenciales y a los archivos que se pongan a su disposición. Una salida incorrecta del modelo, defectos, una configuración errónea, entradas maliciosas o plugins no fiables pueden dañar el equipo anfitrión, modificar o eliminar archivos, divulgar datos o credenciales, o causar otros efectos no deseados.

## Limitaciones del sandbox

El sandbox, los prompts de aprobación y los controles de permisos pueden reducir el riesgo, pero no garantizan el aislamiento ni evitan daños. Incluso las restricciones aplicadas correctamente no pueden proteger los recursos a los que el proyecto tiene permiso de acceso.

No confiar en DeepSeek Harness como único control de seguridad para cargas de trabajo no fiables.

## Uso responsable

- Ejecutar el proyecto con los mínimos privilegios y accesos necesarios.
- Preferir una máquina virtual desechable, un contenedor o un entorno dedicado.
- Mantener copias de seguridad de los archivos a los que el proyecto puede acceder.
- No exponer credenciales o datos sensibles salvo que se acepte el riesgo.
- Revisar los plugins, la configuración y los comandos propuestos antes de permitir su ejecución.

## Sin garantía ni responsabilidad

Usar DeepSeek Harness bajo tu propia responsabilidad. El software se proporciona sin garantía bajo la [Licencia MIT](LICENSE). En la máxima medida permitida por la legislación aplicable, los autores y los titulares de los derechos de autor no son responsables de daños a equipos, pérdida o divulgación de datos, pérdida de archivos u otros perjuicios derivados del uso del proyecto.
