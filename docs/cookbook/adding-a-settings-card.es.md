# Manual de referencia: formularios de configuración en vivo

[English](adding-a-settings-card.md) | Español

Declarar campos en vivo en el schema de Config del plugin y exponerlos a través de una tarjeta de configuración propiedad del producto. La interfaz `Config` exportada describe los valores que recibe el plugin, incluida cada referencia `Volatile<T>`.

## 1. Declarar campos en vivo

```ts
import type { Context, Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export interface Config {
  endpoint: Volatile<string | undefined>
  retries: Volatile<number>
}

export const Config = z.object({
  endpoint: z.string().volatile(),
  retries: z.number().step(1).min(0).default(3).volatile(),
})

export function apply(ctx: Context, config: Config): void {
  ctx.on('loader/volatile-update', () => {
    ctx.logger.info('Retry limit: %d', config.retries.get())
  })
}
```

Leer `.get()` al iniciar una operación. Una solicitud que necesita un snapshot consistente captura sus valores una vez. Usar `.check()` para la validación de Config entre campos; estas comprobaciones se ejecutan en el Host antes de la persistencia y se omiten de los schemas de formulario serializados.

## 2. Componer el plugin

Dar a cada instancia un id de entrada de perfil único. El paquete de composición base monta settings y config-editor. Para perfiles personalizados, véanse los README de sus paquetes antes de montar los mismos servicios.

`role('secret')` mantiene un valor fuera de las respuestas de formulario. Usar referencias de credenciales para valores gestionados por el dominio de credenciales. Los campos ordinarios se quedan fuera del schema de settings.

## 3. Verificar la edición

Cambiar un campo en Plugins y guardar. Verificar el parche del perfil, la siguiente operación del consumidor, la identidad de instancia de plugin sin cambios y la restauración tras reiniciar. Rechazar un valor inválido y verificar que ni el archivo ni el valor en vivo cambiaron.

Las páginas de plugin personalizadas reciben `form.state` y `form.mutate(operations, expectedRevision)` del propietario de la página Plugins. El Host valida la Config completa y aplica las ediciones a través de ConfigEditor y HMR (reemplazo de módulos en caliente) volatile. El [paquete de settings de plugins](../../packages/client/ui-settings-plugins/README.md) posee los ejemplos de tarjetas existentes.

## 4. Contribuir a la página de otro plugin

Un plugin con algo que decir sobre un paquete de composición, una fila o un plugin oficial que no posee se registra en `plugins.detail.actions` (un control en la cabecera de la página), `plugins.detail.badge` (una etiqueta junto al título) o `plugins.detail.section` (una sección bajo el contenido propio de la página). Cada entrada se renderiza con el `subject` de la página (`{ kind: 'bundle', pkg }`, `{ kind: 'row', pkg, row }` o `{ kind: 'item', id }`) y devuelve null para un subject sobre el que no tiene nada:

```tsx ignore-check
ctx.slots.inject('plugins.detail.badge', () => ctx.slots.register({
  name: 'plugins.detail.badge',
  id: 'acme-update',
  locale: 'acmeUpdate',
}, ({ t, subject }) => subject.kind === 'bundle' && hasUpdate(subject.pkg) ? <Tag tone="info">{t('update')}</Tag> : null))
```

## 5. Dónde viaja la mitad de navegador

La mitad de navegador la sirve a la página el [sistema de módulos de cliente](../../packages/client/modules), que explora las entradas habilitadas del Loader buscando paquetes que declaren `dsh.client` y sirve la exportación `./client` compilada de cada uno, pero adhiere la mitad de un paquete a la fila del Loader cuyo especificador es el nombre de paquete desnudo. Una fila montada desde una exportación de subruta nunca porta una mitad, así que un paquete de composición que divide un paquete en varias filas mantiene su mitad en la fila raíz, y cada página que registra desaparece cuando esa fila se desactiva. Un sub-plugin cuya página debe sobrevivir a las demás filas se publica como paquete propio.

El archivo `./client` compilado debe estar en el formato de fábrica lazy-CJS del sistema de módulos de cliente: un script que registra el nombre del paquete y una `factory(require)` con el loader de módulos de la página, descrito en el [README del sistema de módulos de cliente](../../packages/client/modules/README.md). El preset de tsdown `clientBundle` que lo emite vive en `packages/client/tsdown.client.ts` en lugar de en un paquete publicado, así que un paquete fuera de este repositorio reproduce esa compilación por sí mismo.

```jsonc
{
  "exports": {
    ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./client": { "types": "./lib/types/client/index.d.ts", "default": "./lib/client.js" }
  },
  "dsh": { "client": { "platform": "web", "inject": ["@deepseek-ai/dsh-client-ui-settings"] } }
}
```

Un paquete complementario para un namespace incorporado es la misma mitad de navegador en un paquete solo de cliente con un `apply` de Host vacío, listado en el roster de plugins de la composición web ([`packages/bundle/web-app/cordis.patch.yml`](../../packages/bundle/web-app/cordis.patch.yml)) y registrándose en `plugins.item` a través de `ctx.configForms.whileServed`, de modo que la página existe exactamente mientras el Host sirve el namespace.
