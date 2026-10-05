---
kind: upgrade-guide
description: "La composición Web ya no lleva las filas de Schedule; el paquete opcional Automation tasks las inserta."
---

# Schedule pasa al paquete opcional Automation tasks

[English](guide.md) | Español

## Cambio

En v0.1.7-rc.2, `@deepseek-ai/dsh-web-app` llevaba las filas `time-context`, `schedule` y `ui-schedule` con `disabled: true`. Activar Schedule en la página Plugins, o a mano, escribía overrides dirigidos por id como `- id: schedule` con `disabled: false` en `$DSH_HOME/profiles/<name>/cordis.patch.yml` o en un overlay `--patch`.

La próxima versión elimina las tres filas de la composición Web. `@deepseek-ai/dsh-experimental-schedule-bundle`, mostrado como Automation tasks en el grupo Official de la página Plugins, las inserta. Toda instalación entrega el paquete desactivado.

Los perfiles que activaron Schedule por id lo pierden tras actualizar: el loader avisa `patch: entry schedule not found` (y lo mismo para `time-context` y `ui-schedule`), los tools `schedule_*` y la página Automation tasks desaparecen, y los recordatorios almacenados dejan de entregarse. Las tareas almacenadas y los registros de entrega permanecen en disco.

## Migración

1. Abrir Plugins, buscar Automation tasks en el grupo Official y activarlo. El interruptor añade `@deepseek-ai/dsh-experimental-schedule-bundle` a `dsh.profile.bundles` en `$DSH_HOME/profiles/<name>/package.json`; para un perfil editado a mano, añadir esa entrada manualmente.
2. Conservar los overrides existentes que establecen otros campos en `schedule`, `time-context` o `ui-schedule`, como `deliveryHistoryDays`; vuelven a aplicarse cuando el paquete inserta las filas. Los overrides que solo establecen `disabled: false` son redundantes y pueden borrarse.
3. Confirmar: reiniciar `dsh web`, comprobar que el arranque no registra ningún aviso `patch: entry ... not found` para los tres ids, y que la barra lateral muestra Automation tasks con los recordatorios almacenados previamente.
