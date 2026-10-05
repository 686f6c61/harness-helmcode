---
kind: upgrade-guide
description: "El valor heredado `normal` de ui-chat.transcriptView, y un valor sin establecer en Web no Desktop, ahora muestran Detailed en lugar de Standard."
---

# Los detalles de trabajo `normal` heredados se muestran como Detailed

[English](guide.md) | Español

## Cambio

El ajuste del Host `ui-chat.transcriptView` selecciona Settings → General → Work details. En v0.1.7-rc.2 el cliente mostraba el valor heredado guardado `normal` como `standard`, y todo cliente usaba `standard` cuando el ajuste era ausente, `null` o inválido.

A partir de la próxima versión:

- Un `normal` guardado se muestra como `detailed` en Desktop y Web. El valor guardado en disco no se reescribe.
- Un valor ausente, `null` o inválido se muestra como `detailed` en Web no Desktop (la instalación npm `dsh web`). Desktop sigue usando `standard`.
- Los valores guardados `compact`, `standard`, `detailed` y `verbose` no cambian.

Los usuarios que dependían de la lectura antigua ven turnos en ejecución con los cuerpos de grupo de proceso expandidos en lugar de resúmenes contraídos.

## Migración

1. Para conservar la presentación anterior, abrir Settings → General → Work details y elegir Standard. El cliente guarda `standard` en `ui-chat.transcriptView`, que todo cambio posterior del valor por defecto deja intacto.
2. Confirmar: iniciar un turno que llame tools y comprobar que su grupo de proceso muestra un resumen contraído con detalle de tareas en vivo.
