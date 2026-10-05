# Crear sesiones de revisión desde webhooks de GitHub

[English](github-review.md) | Español

Este overlay opcional añade un endpoint firmado de GitHub a `dsh web`. Cuando un pull request (PR) del repositorio configurado pasa de borrador a listo para revisión, la regla crea una sesión raíz con título bajo el espacio de trabajo Web del repositorio e inicia un prompt de revisión de solo lectura.

## Prerrequisitos

- Un checkout local que DSH pueda registrar como espacio de trabajo Web.
- Un secreto de webhook de GitHub de alta entropía disponible a través de la referencia de credencial `DSH_GITHUB_WEBHOOK_SECRET`.
- Un proxy inverso TLS o un túnel que pueda reenviar una URL pública al listener de loopback.
- Suscripción de webhook de GitHub al evento Pull requests con tipo de contenido `application/json`.

El overlay usa por defecto el directorio de lanzamiento como espacio de trabajo y `127.0.0.1:3081` como listener. Sobrescribirlos con `DSH_GITHUB_REVIEW_WORKSPACE` y `DSH_GITHUB_WEBHOOK_PORT`.

## Iniciar DSH

Generar un secreto y conservar el mismo valor entre reinicios:

```sh
export DSH_GITHUB_WEBHOOK_SECRET="$(openssl rand -hex 32)"
printf '%s\n' "$DSH_GITHUB_WEBHOOK_SECRET"
```

Desde un checkout de desarrollo:

```sh
export DSH_GITHUB_REVIEW_WORKSPACE=/path/to/deepseek-harness
pnpm dsh web --patch apps/cli/config/examples/github-review/cordis.yml
```

Un DSH instalado usa el mismo overlay a través de una ruta absoluta:

```sh
dsh web --patch /absolute/path/to/github-review/cordis.yml
```

Para un perfil permanente, colocar `github-ready-review-rule.mjs` junto a `$DSH_HOME/profiles/web/cordis.patch.yml`, añadir las filas de `cordis.yml` a ese parche e iniciar con `dsh web`. El CLI distribuido ya contiene ambos paquetes de webhook; el overlay por sí solo los activa.

## Exponer el endpoint dedicado

La UI Web principal y `/api` permanecen en el puerto 3080. El overlay monta un segundo WebServer en un realm aislado; solo `POST /github` está registrado ahí, y cualquier otra ruta devuelve `404`.

Una configuración de Caddy puede exponer solo ese listener:

```caddyfile
hooks.example.com {
  route {
    @github path /github
    reverse_proxy @github 127.0.0.1:3081
    respond 404
  }
}
```

Configurar GitHub con:

```text
Payload URL:  https://hooks.example.com/github
Content type: application/json
Secret:       DSH_GITHUB_WEBHOOK_SECRET value
Events:       Pull requests
Active:       yes
```

## Comportamiento de la regla

La regla solo acepta el origen `primary-github`, el repositorio `deepseek-harness/deepseek-harness`, el evento `pull_request` y la acción `ready_for_review`. Pasa el SHA head exacto más campos seleccionados del PR al prompt de revisión, etiquetando el JSON como metadatos no confiables y prohibiendo mutaciones de archivos, ramas, PR o GitHub.

La solicitud de sesión selecciona el preset de agent `standard` y el preset de permisos `read-only`. `workspacePath` se canoniza a través de `WorkspaceRegistry.create()`, de modo que la primera entrega coincidente crea el espacio de trabajo Web si no existe y las entregas posteriores lo reutilizan.

La respuesta HTTP es intencionadamente más débil que el resultado del agent: `202` significa que la firma y el JSON fueron aceptados y que las llamadas a la regla quedaron programadas en memoria. No significa que esta regla coincidiera ni que se creara una sesión.

## Extensiones programáticas

`run()` es JavaScript confiable ordinario. Un despliegue puede consultar un servicio de política interno antes de devolver una solicitud de sesión:

```js
const response = await fetch('https://policy.internal/pr-review', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ repository: payload.repository.full_name }),
  signal,
})
if (!response.ok || (await response.json()).automaticReview !== true) return null
```

También puede mapear repositorios a rutas locales distintas:

```js
const workspacePath = {
  'deepseek-harness/deepseek-harness': '/path/to/deepseek-harness',
  'deepseek-harness/dsh-sdk': '/path/to/dsh-sdk',
}[payload.repository.full_name]
if (workspacePath === undefined) return null
```

## Semántica de entrega

El runtime de webhooks no almacena estado de entrega ni de ejecución. Una entrega repetida ejecuta la regla y puede crear otra sesión. Un fallo pierde las llamadas a la regla que no han admitido su prompt. Tras la admisión del prompt, el registro de sesión ordinario, la persistencia, el espacio de trabajo y el ciclo de vida del agent se hacen cargo del trabajo.

El secreto del webhook autentica únicamente los datos entrantes de GitHub. No concede acceso saliente a GitHub ni al código de la regla ni al agent creado; configurar esa autoridad por separado cuando una regla o un agent la necesite.
