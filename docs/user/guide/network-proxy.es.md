# Ejecutar DSH detrás de un proxy de red

[English](network-proxy.md) | Español

DSH encamina sus solicitudes salientes (llamadas a modelos, búsquedas web, descargas de páginas y servidores MCP sobre HTTP) a través del proxy indicado por las variables de entorno de proxy estándar. Las lee al arrancar; no hace falta configurar nada más. Algunas rutas permanecen directas por diseño o por límite del runtime, enumeradas en «Qué permanece directo» más abajo.

## Exportar las variables

```sh
export HTTPS_PROXY=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
```

Colocar ambas líneas en el perfil del shell para que cada invocación de `dsh` las herede, o en `$DSH_HOME/.env` (`~/.dsh/.env` por defecto) junto a la clave de API; una variable exportada siempre prevalece sobre ese archivo. El `.env` propio de un proyecto no puede definirlas: llega con `git clone`, y DSH se niega a arrancar antes que dejar que un repositorio decida adónde va tu tráfico.

Un proxy que necesita credenciales las recibe en la URL: `http://user:password@proxy.example:8080`. DSH nunca imprime la URL de vuelta: un diagnóstico nombra la variable que rechazó, de modo que ni el usuario ni la contraseña aparecen en ninguna parte.

## Por qué el navegador pasa por el proxy pero el terminal no

Esta es la sorpresa más común, y no es específica de DSH. No existe un único «proxy del sistema» que todo el software obedezca: hay tres mecanismos independientes:

| Mecanismo | Quién lo sigue |
|---|---|
| La configuración de proxy del sistema operativo | Safari, la mayoría de las apps nativas de macOS, Chrome y Edge |
| Las variables de entorno `HTTP_PROXY` / `HTTPS_PROXY` | `curl`, `git`, `npm`, `pip` y DSH |
| El modo TUN (una interfaz de red virtual) | Todo, de forma transparente |

El interruptor de «proxy del sistema» de una aplicación de proxy como Clash solo escribe el primero. Los navegadores lo recogen; las herramientas de línea de comandos nunca lo ven. Por eso exportar las variables es un paso aparte, y por eso activar el modo TUN hace que ambos funcionen sin ninguna variable.

DSH no lee la configuración de proxy del sistema operativo. Exportar las variables o usar el modo TUN.

## Elegir qué permanece directo

`NO_PROXY` enumera los hosts a los que llegar directamente:

```sh
export NO_PROXY=internal.example.com,.corp.example.com,registry.local
```

Una entrada nombra un host y coincide con él junto con todos sus subdominios: `NO_PROXY=example.com` también envía `api.example.com` directo. Se acepta un `.` o `*.` inicial y significa lo mismo. Una entrada puede llevar un `:port`, y `*` lo omite todo.

**Los rangos CIDR no funcionan.** Una lista de exclusión del sistema operativo suele contener entradas como `10.0.0.0/8` o `192.168.0.0/16`; copiarlas a `NO_PROXY` no tiene efecto. Usar nombres de host o sufijos de dominio en su lugar.

No hace falta listar `localhost` ni `127.0.0.1`. DSH siempre omite el loopback, porque su propia Web UI y sus servidores locales pasarían por el proxy y entrarían en bucle.

## Límites que conviene conocer

**Los proxies SOCKS no están soportados.** Un valor `socks5://` se reporta al arranque y se omite, y DSH conecta directamente para el esquema que lo nombraba: definir `HTTPS_PROXY=socks5://…` junto a un `HTTP_PROXY` usable deja `https:` directo en lugar de tomar prestado el proxy HTTP. Apuntar las variables al puerto HTTP de la aplicación de proxy: la mayoría expone ambos, y el HTTP suele ser un número de puerto vecino.

**`ALL_PROXY` por sí sola basta.** DSH recurre a ella para ambos esquemas, aunque Node y curl difieren en esto. Definir `HTTPS_PROXY` explícitamente sigue siendo más claro.

**Un proxy corporativo que intercepta TLS necesita su certificado.** Si las solicitudes fallan con un error de certificado una vez que el proxy es accesible, apuntar Node al paquete de CA de la organización antes de lanzar:

```sh
export NODE_EXTRA_CA_CERTS=/path/to/corporate-ca.pem
```

Node lee esa variable solo al arrancar el proceso, así que exportarla antes de ejecutar `dsh`.

**Las tools que DSH ejecuta por ti siguen el mismo proxy.** Los comandos de la tool bash, `git`, `gh` y los servidores MCP iniciados como procesos hijos heredan estas variables. Un hijo que es a su vez un programa Node las respeta solo en Node 22.21 o posterior; un Node más antiguo conecta directamente. Si una de las variables de proxy contiene un valor que DSH rechazó (una URL SOCKS, por ejemplo), las tools basadas en Node también conectan directamente en lugar de fallar al arrancar, mientras que `curl` y `git` sí leen ese valor.

**Una contraseña en la URL del proxy también llega a esas tools.** `HTTPS_PROXY=http://alice:s3cret@proxy.example:8080` es una variable de entorno normal, así que cada comando que DSH ejecuta (incluidos los que escribe el modelo) puede leerla, y un comando que imprime su entorno deja la contraseña en una salida que se conserva. Así se comporta ya la variable para todo lo demás en tu shell. Si eso importa, dar al proxy un punto de entrada sin credenciales o autenticarlo de otra forma que no sea en la URL.

## Qué permanece directo

No todas las solicitudes que hace DSH pasan por el proxy:

- **Todo lo de esta máquina.** El loopback siempre es directo: `localhost`, todo el rango `127.0.0.0/8`, `::1` y `0.0.0.0`. Un proxy no puede alcanzar de forma útil un servicio que solo escucha localmente.
- **El código que escribe el modelo.** Los workers de workflow y los procesos Node de ptc-runtime no reciben configuración de proxy, de modo que los scripts escritos por el modelo no pueden leer una URL de proxy que pueda llevar una contraseña. Las solicitudes directas deben configurar por sí mismas cualquier proxy necesario y siguen sujetas al sandbox de ejecución.
- **La telemetría de uso.** El exportador OTLP usa el cliente HTTP propio de Node en lugar del que configura un proxy, así que la telemetría conecta directamente y simplemente falla donde la salida directa está bloqueada. Nada de lo que hagas en DSH depende de ella. Definir `DSH_TELEMETRY_MODE=DISABLED` para desactivarla por completo.
- **`web_fetch` a una dirección privada literal.** Una URL que nombra una dirección como `http://10.0.0.5/` se rechaza en lugar de entregarse al proxy, el mismo rechazo que recibe sin proxy configurado.

## Comprobar que funcionó

Pedir al agent que descargue una página y observar el registro de conexiones de la aplicación de proxy:

```sh
dsh --profile headless "fetch https://example.com and tell me the page title"
```

Si la solicitud no aparece ahí, confirmar que las variables sobreviven hasta el propio entorno de DSH:

```sh
env | grep -i proxy
```
