---
description: "Registra una transición de tipos de persistencia y su reconocimiento de compatibilidad."
kind: persistence-change
---

# 2026-09-16-session-format-v4

[English](2026-09-16-session-format-v4.md) | Español

## Resumen

Avanza el SessionHeader.version declarado de 3 a 4 para el escritor V4 finalizado, registra los resultados con rol tool de primera clase y las fuentes propiedad del productor, y añade la variante forked a turn/end.reason. Añade cambios de Session con rol developer que incluyen adiciones de tools solo por nombre vinculadas a headers de solicitud históricos, eliminaciones de tools y marcadores de schema de carga diferida.

## Índice

- [Declaración](#declaration)
- [Compatibilidad](#compatibility)
- [Verificación](#verification)
- [Nota de desarrollo](#dev-note)

<a id="declaration"></a>
## Declaración

```yaml persistence-change
schemaVersion: 1
id: 2026-09-16-session-format-v4
baseline: false
changes:
  - root: "SessionHeader"
    previous: "2026-09-11-initial"
    after: "1a3440e3577382704d42a6263aa463504eb74c566734a55e9503a63efcd02445"
    decision: version-bump
  - root: "event:agent/inbox/spliced"
    previous: "2026-09-14-image-offload"
    after: "1506a9b8224986c83015ae99d2cb5ede705538c58c063d6a48ef6d761a31ba6c"
    decision: version-bump
  - root: "event:assistant/attempt"
    previous: "2026-09-14-image-offload"
    after: "15d5dfdd822aa35e115afd74a8982825a493880457774e6850bc1520b50875e4"
    decision: version-bump
  - root: "event:assistant/message"
    previous: "2026-09-14-image-offload"
    after: "1033093edd0db80ff410e00830b523405e00bb0c7684948e531ff65095799625"
    decision: version-bump
  - root: "event:compaction/summary"
    previous: "2026-09-14-image-offload"
    after: "e2f9a41e0989f54ed8cee80f8db2bcf9d60a5c810dc9d45b83fa050b9dce7602"
    decision: version-bump
  - root: "event:developer/message"
    previous: null
    after: "eef4ef54dc7a133d47448a4ee822e45a351314923ef5f66db34c8b24e4b32d80"
    decision: version-bump
  - root: "event:request/header"
    previous: "2026-09-11-initial"
    after: "4208123b50df5006b181481ab45fcf1cde807b88d3fd4d340090bc2e202fac41"
    decision: version-bump
  - root: "event:session/title-llm-request"
    previous: "2026-09-14-image-offload"
    after: "fa8f7d3ebf08a76c7f7a8b0781873c4d819b964da5dbb52cd3cdfa5da34f452d"
    decision: version-bump
  - root: "event:system/message"
    previous: "2026-09-14-image-offload"
    after: "69081694be231d56fd9580ba14645fd5e35373202605d5c5c841a9435b5fa3b1"
    decision: version-bump
  - root: "event:team/message/queued"
    previous: "2026-09-14-image-offload"
    after: "21fb6a90d5068f6a0003b7ab316ed2f56342477146a65c00db0f13c4d8df667d"
    decision: version-bump
  - root: "event:tool/ptc-dispatch"
    previous: "2026-09-14-image-offload"
    after: "100f6dca1468538239522cde3533e5bd721d0f1a7b50bea8b0eb533ea6c96163"
    decision: version-bump
  - root: "event:tool/result"
    previous: "2026-09-14-image-offload"
    after: "7c9f44e90a0058f4cc532ae20dad0c10afa6eba22e70a6c79fc79490bad64397"
    decision: version-bump
  - root: "event:turn/end"
    previous: "2026-09-14-image-offload"
    after: "0f8512903d94f57a4748fa1a2092e64342856796684e6b8343db685b192745ce"
    decision: version-bump
  - root: "event:user/message"
    previous: "2026-09-14-image-offload"
    after: "3f72db3d87a0c5c43e68be467b4cca728eaf5adc1d5d2b6975ff42bfbd961761"
    decision: version-bump
```

<a id="compatibility"></a>
## Compatibilidad

La declaración del rol tool cambia diez raíces de eventos porque las entradas del inbox, los eventos de mensajes, los resúmenes de compactación, las solicitudes de título, los mensajes de equipo y los despachos PTC incrustan las declaraciones compartidas `Message` o `ContentBlock`. Quitar `tool-result` de esa unión y especializar los roles de mensaje cambia esos schemas alcanzables sin añadir diez protocolos de eventos independientes. El cambio de `turn/end` registra por separado la razón forked; `SessionHeader` registra el aumento de versión.

La [decisión de validación nativa de V4](../../.agents/notes/implemented/architecture/2026-09-17-native-v4-read-validation.md) posee la admisión de lectores que estos campos actuales requieren.

La migración de V3 a V4 eleva los resultados de tools con rol user publicados a mensajes con rol tool con un toolCallId obligatorio e isError opcional. Los envoltorios de resultados de tools salen de la unión de bloques de contenido. La migración conserva cada evento fuente admitido y cada corte heredado, y anexa los registros subagent/catalog del padre que falten a partir de los registros de hijos directos conservados en la misma raíz de persistencia. La restauración histórica del cuerpo requiere un conjunto explícito de evidencia de hijos, incluido un conjunto vacío cuando no hay hijos disponibles para rellenar. Los descriptores de hijo ausentes, múltiples o de versión desconocida omiten el relleno de ese hijo; las identidades, marcas de tiempo o modos en conflicto rechazan la migración sin publicación. Los hechos del catálogo existentes permanecen. Las aperturas de lectura históricas preparan el resultado en memoria. Las aperturas de escritura revalidan la membresía y las revisiones de los hijos antes de publicar el sucesor actual junto a los archivos predecesores sin cambios. Las comprobaciones de generación de entregas evitan que los reconocimientos históricos se conviertan en marcas de agua V4 activas. Los lectores V3 rechazan la generación más reciente. La transición finalizada añade forked a turn/end.reason; los forks de corte exacto anexan resultados de error y cierres propiedad del hijo tras el marcador heredado. V4 admite resultados de fork comprobados y no iniciados con IDs y redacción deterministas específicos de la rama; los validadores V0–V3 publicados y las generaciones predecesoras registradas no cambian.

El schema de `request/header` también registra la clave `system` retirada como prohibida. Esta declaración captura el rechazo existente del lector nativo sin cambiar los datos almacenados ni la reconstrucción del prompt; permitir un valor más adelante requiere un aumento de versión en lugar de clasificarse como una adición ordinaria de campo opcional.

Las fuentes propiedad del productor sustituyen a los envoltorios de plugins publicados a través de la [migración de V3 a V4](../../packages/session/session-format-v3-to-v4/README.md#v3-to-v4-specification). La tabla congelada de renombrados y las reglas de colisión conservan los campos de fuente y las coordenadas de eventos; la atribución de productor desconocido conserva cada propiedad JSON propia. Las aperturas nativas de lectura y escritura validan los campos de fuente antes de exponer la Session. Los archivos V4 existentes no vuelven a ejecutar la arista de migración entrante.

La propiedad de fuente de usuario propiedad del núcleo registra la política de conservación de atribución; tmux-context califica su atribución de ubicación conservando la supresión de duplicados local al productor. Auto Review y el resumidor de compactación usan entradas de usuario solo de solicitud, eliminando sus registros de fuente activos sin eliminar el soporte histórico de migración. Estas entradas no pueden escribirse como mensajes durables de Session. El formatVersion 2 del catálogo almacena los metadatos de la política; no cambia la versión de Session ni reescribe los registros de schemas congelados. Las fuentes system, model y tool conservan sus reglas semánticas estrictas.

Los eventos de developer conservan su rol original y requieren un paso abierto. Cada adición almacena toolName; developer/message.headerSeq identifica un request/header anterior conocido que contiene exactamente un ToolSchema completo coincidente. Todas las adiciones de un evento comparten esa revisión histórica del header, mientras que los mensajes de developer de solo eliminación y de otros tipos omiten headerSeq. La admisión nativa y de Session rechaza las formas ausentes, adelantadas, que no son header, de header desconocido, ambiguas, de definición incompleta y de definición en línea retirada sin interpretar registros ignorables desconocidos ni descartar metadatos JSON no relacionados. El reemplazo del mismo nombre, el reinicio, el fork, el reemplazo de surface y la compactación conservan la identidad histórica del schema sin consultar el header o el registry más recientes. El sourceEventSeqs genérico sigue siendo independiente. Las fuentes de developer usan la misma política registrada de conservación de atribución que las fuentes de usuario. El marcador opcional deferLoading es independiente del historial de adiciones. Ningún perfil publicado emite registros de developer; la serialización del proveedor, la emisión automática y el soporte de UI siguen diferidos.

El productor PTC escribe `source.kind: 'ptc-mode'`. La arista de V3 a V4 conserva `tools-code-mode` y `tools-ptc` como claves históricas de búsqueda de plugins y asigna ambas a ese kind actual. La política de fuentes reserva `ptc-mode` frente a la calificación solo de atribución.

<a id="verification"></a>
## Verificación

Las suites focalizadas de Session, agent-loop, Session Controller, V4, chat-view y compactación superaron 1.523 pruebas en 63 archivos tras la integración de los forks de corte exacto. Las pruebas de fork de V4 conservan los IDs y el texto originales a través de la codificación, la decodificación y la restauración, rechazan resultados malformados y validan cortes heredados anidados. Las pruebas de migración del rol tool y la actualización de snapshots del SDK también pasaron en el cambio original; el escenario sdk-snapshot del runtime de Python compilado pasó, y la cobertura focalizada de pi-ai y auto-review superó 351 pruebas con el 100 % de cobertura de los tres módulos afectados.

La regresión generada de reserva de request-header y las pruebas existentes de sintaxis retirada y de surface de Session pasan 65 pruebas en tres archivos. El campo generado conserva el `never` opcional; permitir un string opcional produce un diagnóstico de aumento de versión mientras el lector nativo sigue rechazando la clave retirada.

Las comprobaciones de fuentes de productor y de entradas de solicitud pasan 447 pruebas en 12 archivos, incluidas la igualdad de proveedores, el rechazo de tipos solo de solicitud, la conservación de la atribución de usuario, la migración de fuentes y la admisión nativa de fuentes. La comparación de los inventarios generados con el padre del rol tool informa de cuatro raíces cambiadas y 447 huellas de tipos sin cambios.

La suite focalizada de Session, V4 y entradas de solicitud pasa 884 pruebas en 38 archivos, con el 100 % de declaraciones, ramas, funciones y líneas para el paquete completo de V3 a V4 y la surface de Session. La cobertura incluye la vinculación histórica de schemas del mismo nombre, adiciones y eliminaciones compuestas, referencias y definiciones malformadas, rechazo de headers desconocidos, registros desconocidos opacos, conservación de metadatos, forks, reemplazos, referencias de compactación y admisión nativa de lectura/escritura plain/zstd sin reescribir la generación.

<a id="dev-note"></a>
## Nota de desarrollo

Ninguna.
