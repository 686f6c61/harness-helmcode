# Empaquetar e instalar un plugin

[English](publish.md) | Español

Los tutoriales anteriores cargaron un plugin local mediante un overlay `--patch`. Este tutorial lo empaqueta como un **bundle** instalable, lo instala en un **profile** con `dsh plugin add`, y explica el orden de capas que determina la configuración compuesta. Asume que la CLI (interfaz de línea de comandos) `dsh` está instalada. Completar primero la [configuración de plugins](./config.es.md).

Para usar en su lugar un checkout del código fuente, completar la [sección de ejecución desde el código fuente](../../../../README.en.md), mantener el directorio `hello-plugin` de este tutorial en la raíz del repositorio, y ejecutar desde allí los comandos `dsh ...` restantes como `pnpm dsh ...`. Véase [ejecución desde el código fuente](../../../../apps/cli/reference/README.es.md#source-execution) para el comportamiento de compilación y del lanzador.

## Dos conceptos, dos manifests

La instalación se apoya en dos conceptos. Ambos se describen con un `package.json`, pero llevan tipos de manifest (lista de metadatos) distintos bajo la clave `dsh`, y responden a preguntas distintas:

- Un **bundle** es un paquete npm que entrega una capa de configuración. Su manifest declara `dsh.bundle` y responde a «¿qué aporta este paquete?»: un archivo patch que inserta o sobrescribe filas de plugins.
- Un **profile** es un directorio bajo `$DSH_HOME/profiles/<name>` que describe una composición ejecutable. Su manifest declara `dsh.profile` y responde a «¿qué bundles componen esta instalación, en qué orden?».

Un bundle es lo que se crea y distribuye; un profile es con lo que un usuario arranca mediante `dsh --profile <name>`. Nada es ambas cosas.

### El manifest del bundle

Crear el directorio del paquete:

```sh
mkdir -p hello-plugin
```

```
hello-plugin/
├── package.json       # declares dsh.bundle
├── cordis.patch.yml   # the layer applied when a profile lists this bundle
└── index.js           # plugin modules the patch rows reference
```

Crear `hello-plugin/package.json`:

```json
{
  "name": "dsh-hello-plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "files": ["index.js", "cordis.patch.yml"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

Crear `hello-plugin/index.js` con el punto de entrada del plugin:

```js
export const name = 'hello-plugin'

export function apply() {
  console.log('[hello-plugin] plugin loaded!')
}
```

Crear `hello-plugin/cordis.patch.yml`. El patch es un array YAML como los overlays `--patch` de antes, salvo que las filas de plugin referencian el paquete por nombre en lugar de una ruta de código fuente relativa, para que la resolución de Node encuentre el código instalado:

```yaml
- insert:
    - id: hello
      name: dsh-hello-plugin
```

`patch` también acepta una lista ordenada de archivos, por ejemplo `["./base.patch.yml", "./web.patch.yml"]`; el lanzador los aplica en ese orden como una sola capa, y las rutas de plugin relativas de cada archivo se resuelven junto a ese archivo. Un paquete sin la declaración `dsh.bundle` se instala igualmente, pero solo como una dependencia plana: `dsh plugin` imprime un aviso y no activa ninguna capa. Usar ese formato de paquete para una biblioteca que los paquetes de plugin importan, no para un plugin que los usuarios activan.

### El manifest del profile

Un directorio de profile contiene dos archivos:

- `package.json`: las dependencias de plugins fuera del árbol del profile (gestionadas por pnpm) más el manifest `dsh.profile` con su lista `bundles` ordenada.
- `cordis.patch.yml`: la capa patch propia del usuario, aplicada después de cada capa de bundle.

Nunca se escribe un manifest de profile a mano: `dsh --profile <name> --from-default-profile <template>` puede crear uno a partir de una plantilla de aplicación entregada, mientras que `dsh plugin` crea un profile respaldado por la base y mantiene su lista de bundles instalados. La [referencia de comportamiento de la CLI](../../../../apps/cli/reference/README.es.md#profile-boot) es dueña de las reglas de creación; la siguiente sección muestra el camino de plugins.

## Instalar en un profile

`dsh plugin --profile <name> <args...>` reenvía a pnpm en el directorio del profile, así que todo verbo de pnpm funciona. Desde el directorio que contiene `hello-plugin`, instalar el checkout del paquete:

```sh
dsh plugin --profile demo add ./hello-plugin
```

El primer uso inicializa el profile (con `@deepseek-ai/dsh-base` como su primer bundle), pnpm enlaza el checkout, y `dsh` añade el bundle a `dsh.profile.bundles` porque el paquete declara `dsh.bundle`:

```json
{
  "name": "dsh-profile-demo",
  "private": true,
  "dependencies": {
    "dsh-hello-plugin": "link:/path/to/hello-plugin"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "dsh-hello-plugin"
      ]
    }
  }
}
```

Un checkout enlazado conserva su propio `node_modules`. Declarar los paquetes dsh cuyas instancias el plugin debe compartir con el host tanto en `peerDependencies` como en `devDependencies`, como hacen los paquetes del harness. En la posición de búsqueda de ese manifest, los pares presentes en la resolución en runtime del dsh en ejecución usan la copia de la instalación; la copia de devDependency sirve a la verificación de tipos y a las pruebas independientes. Mantener las dependencias de terceros versionadas de forma independiente y las utilidades dsh sin estado bajo `dependencies`.

Las importaciones enlazadas ordinarias siguen el orden de ancestros de Node y comprueban las declaraciones de pares actuales de cada directorio. Un paquete físico más cercano gana antes que una declaración de pares más alta. Un destino de enlace puede carecer de `package.json`; los pares ancestros siguen aplicándose, incluso sin un `node_modules` físico junto a ese manifest. El `require.resolve(..., { paths })` explícito siempre es nativo, incluidas las rutas dentro de un profile. Estas reglas son compartidas por los lanzamientos de npm, Desktop y desde el código fuente; no invalidan módulos cargados ni validan rangos de versión de pares. Véanse las [reglas de resolución](../../../../.agents/notes/implemented/architecture/2026-09-19-profile-resolution-lookup-order.md) para el ámbito y el comportamiento de consulta de archivos.

Enlazar un checkout amplio no aplica la interceptación de pares a los directorios de paquetes propios de la instalación en ejecución. Los enlaces cuyos destinos permanecen dentro del profile, incluido su store de pnpm, siguen siendo contenido de instalación propiedad del profile y no raíces enlazadas externas. Los enlaces externos solapados no cambian el orden de búsqueda: cada solicitud sigue partiendo del directorio de su importador.

Verificar la capa sin arrancar, y luego arrancar:

```sh
dsh --profile demo --dump-config   # shows a "# == dsh-hello-plugin" layer
dsh --profile demo
```

`dsh plugin --profile demo remove dsh-hello-plugin` elimina tanto la dependencia como la capa.

## El orden de carga

La configuración efectiva se compone sobre una raíz vacía aplicando, en orden:

1. Cada patch de bundle nombrado en la lista `dsh.profile.bundles` del profile, en el orden de la lista: `@deepseek-ai/dsh-base` primero, luego cada bundle instalado en el orden en que se añadió.
2. El `cordis.patch.yml` propio del profile.
3. El `$DSH_HOME/cordis.patch.yml` de nivel home: preferencias locales de la máquina compartidas por todos los profiles.
4. Cada overlay `--patch <path>`, en el orden de argv.

Los argumentos de la app no son otra capa de patch. Un bundle de superficie puede resolverlos mediante un servicio ordinario propiedad de la app, descrito abajo.

Las capas posteriores ganan por fila, y un patch reemplaza el valor `config` entero de una fila en lugar de fusionar claves en profundidad. Dos consecuencias para los autores de bundles:

- El patch de un bundle puede sobrescribir filas de capas anteriores por `id`, de la misma manera que [el bundle `dsh-web-app`](../../../../packages/bundle/web-app/cordis.patch.yml) sobrescribe filas de `dsh-base`, pero debe reexpresar cada clave que la fila necesita, no solo la cambiada.
- Los usuarios pueden sobrescribir esas filas en el `cordis.patch.yml` de su profile sin tocar el paquete, así que conviene preferir valores por defecto de configuración que los usuarios probablemente conserven y dejar que el schema lleve el resto.

Los nombres de bundles incluidos en la caja siempre se resuelven desde la propia instalación de dsh; pnpm gestiona solo los paquetes fuera del árbol, así que un bundle puede confiar en que `@deepseek-ai/dsh-base` está presente y actualizado.

## Dar a un bundle de superficie su propia línea de comandos

Un bundle que define una app ejecutable monta un plugin proveedor ordinario:

```yaml
- id: hello-startup
  name: 'dsh-hello-plugin/startup'
```

El plugin exporta `inject = ['cmdlineArgs']`, llama a `parseCmdline` de [`@deepseek-ai/dsh-cmdline`](../../../../packages/boot/cmdline/README.md) con su propio programa commander, y provee su servicio propiedad de la app desde la acción del programa. El lanzador entrega a cada plugin los mismos argumentos inmutables tras los flags del lanzador, así que los flags específicos de la app no necesitan cambios en el lanzador y varios plugins pueden parsear el snapshot. La fila del Loader no necesita marcador de lanzador ni tipo especial.

Las filas configuradas por esos argumentos inyectan el servicio del proveedor y lo leen desde sus propias opciones `!!js`, con el valor de despliegue al lado como fallback:

```yaml
- id: my-app
  name: '@example/my-app'
  inject: [myAppStartup]
  config:
    port: !!js ctx.myAppStartup.port ?? 8080
```

Con `--help`, el proveedor no publica ningún servicio, así que esas filas nunca se activan. El Loader monta la composición una vez, espera las inyecciones ordinarias de cada fila, y solo entonces evalúa la config `!!js` de esa fila contra su contexto inyectado.

## Instalar desde GitHub: el problema del script de compilación

Publicar en un registry no es obligatorio: los usuarios pueden instalar directamente desde un host git:

```sh
dsh plugin --profile demo add github:you/hello-plugin
```

Pero una instalación git descarga **fuentes, no artefactos compilados**: nada ejecuta el script `build`, así que un paquete TypeScript llega sin su salida `lib/` y falla al cargar. Deben ocurrir dos cosas, una en cada lado:

- **El autor** entrega un script `prepare` (pnpm lo ejecuta tras una instalación git) que compila los puntos de entrada publicados desde el código fuente, de forma autocontenida: no debe asumir contexto de solo desarrollo como un checkout de monorepo hermano. Una config dedicada de tsdown puede transpilar `src/` sin referencias de proyecto ni verificación de tipos.
- **El usuario** incluye la compilación en una lista de permitidos. pnpm ≥10 se niega a ejecutar el script `prepare` de una dependencia git hasta que se permite explícitamente, así que el primer `add` falla; `dsh` señala la solución: copiar la clave exacta del paquete que pnpm imprimió en el `pnpm-workspace.yaml` del profile:

  ```yaml
  allowBuilds:
    dsh-hello-plugin: true
  ```

  y volver a ejecutar el `add`.

Tratar ese permiso como **permiso para ejecutar el código del paquete en la máquina en el momento de la instalación**, fuera de cualquier sandbox bajo el que se ejecute el agent. Permitir solo paquetes cuya fuente sea de confianza, y fijar un commit (`github:you/hello-plugin#<sha>`) para que un push posterior no pueda cambiar silenciosamente lo que se ejecuta.

Para no pedir ese permiso a los usuarios, distribuir artefactos compilados en su lugar; ninguna de las dos formas necesita permiso de compilación:

- **Publicar en npm** con `lib/` compilado en el momento de `pnpm publish`; `dsh plugin add your-package` instala entonces código precompilado.
- **Entregar un tarball** desde `pnpm pack`; los usuarios ejecutan `dsh plugin add ./hello-plugin-0.1.0.tgz`.

## Próximos pasos

- [Plugins y ciclo de vida](../framework/index.es.md): el ciclo de vida completo del plugin
- [Referencia de comportamiento de la CLI](../../../../apps/cli/reference/README.es.md): precedencia exacta de capas, flags y mecánica de profiles
