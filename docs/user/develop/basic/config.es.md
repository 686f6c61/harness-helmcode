# Configuración de plugins

[English](config.md) | Español

Aceptar configuración suministrada a través de `cordis.yml`.

## Definir el tipo Config

Exportar un tipo `Config` y un schema de Schemastery con el mismo nombre. Poner los valores por defecto directamente en los campos del schema:

```ts
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = 'my-plugin'

export interface Config {
  greeting: string
  maxRetries: number
  verbose?: boolean
}

export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default('Hello'),
  maxRetries: Schema.number().default(3),
  verbose: Schema.boolean().default(false),
})

export function apply(ctx: Context, config: Config) {
  console.log(config.greeting)  // User value or schema default.
}
```

Añadir la configuración a la fila del plugin local insertada en `scratch-plugin/cordis.yml`:

```yaml
- insert:
    - id: hello
      name: './src/my-plugin.ts'
      config:
        greeting: 'Hi there'
        maxRetries: 5
```

Al cargar el plugin, Cordis usa el schema exportado para validar la configuración y rellenar los valores por defecto. No exportar un objeto plano como `Config`; no implementa la interfaz Standard Schema que Cordis exige.

## Validación de schema

Usar Schemastery para expresar una validación más estricta:

```ts
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = 'validated-plugin'

export interface Config {
  apiKey: string
  timeout: number
  mode: 'fast' | 'accurate'
}

export const Config = Schema.object({
  apiKey: Schema.string().required(),
  timeout: Schema.number().default(30000),
  mode: Schema.union(['fast', 'accurate']).default('fast'),
})

export function apply(ctx: Context, config: Config) {
  // config is validated and type-safe.
}
```

El schema se ejecuta mientras el plugin carga. Una configuración inválida hace fallar la carga con un error accionable.

## Principios de diseño

### No fijar en código los valores ajustables

Harness exige que **todo lo que dos despliegues puedan querer configurar de forma distinta sea un campo de configuración**.

```ts
// Wrong: hardcoded timeout.
const TIMEOUT = 30000

// Correct: configurable.
export interface Config {
  timeoutMs: number  // Defaults to 30000.
}
```

La prueba es si `cordis.yml` puede cambiar el valor sin editar código.

### Fallar de forma ruidosa ante configuración inválida

Expresar las restricciones autocontenidas en el schema para que la configuración inválida falle mientras el plugin carga. Las referencias a servicios o recursos registrados requieren inyección de dependencias; el [tutorial de servicios](../framework/service.es.md) introduce ese contrato.

## Trabajar con HMR

Con HMR (reemplazo de módulos en caliente), una edición de configuración reemplaza el plugin en caliente: el framework descarga la instancia antigua y carga una nueva. Como los registros son efectos y se limpian solos, el reemplazo no retiene los registros de la instancia antigua.

## Próximos pasos

- [Empaquetar e instalar un plugin](./publish.es.md): publicar el plugin como un paquete instalable
- [Plugins y ciclo de vida](../framework/index.es.md): entender el ciclo de vida completo del plugin
- [Servicios y dependencias](../framework/service.es.md): proveer un servicio a otros plugins
