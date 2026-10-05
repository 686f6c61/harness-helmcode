# Estándar unificado de radio de esquina de DSH

[English](ui-radius.md) | Español

## Resumen

Elegir radios de esquina coherentes según el rol y el tamaño del componente, y alinear regiones anidadas, rellenos de hover, fondos y trazos. Este estándar cubre botones, celdas, tarjetas, menús, diálogos y avatares en DSH Web y Desktop.

## Índice

- [Ámbito y autoridad](#scope)
- [Selección del radio](#radius-scale)
- [Reutilización de tokens y formas deliberadas](#shapes)
- [Geometría anidada y hover](#nested-hover)
- [Materiales de las tarjetas de configuración](#settings-cards)
- [Aplicación y verificación](#verification)

<a id="scope"></a>
## Ámbito y autoridad

Esta referencia define la escala de radios de DSH Web y Desktop y sus reglas de componentes. Un ajuste visual local queda acotado al componente o familia nombrada y no cambia automáticamente la escala global.

La [referencia de estilo de la UI web](web-styling.es.md) define la propiedad general del estilado. Los valores compartidos viven en [`base.css`](../packages/client/ui-theme/src/styles/base.css), y el comportamiento de las curvas vive en [`corner-shape.css`](../packages/client/ui-theme/src/styles/corner-shape.css). Actualizar la implementación del tema y las dos versiones de idioma de este estándar a la vez al cambiar una regla.

<a id="radius-scale"></a>
## Selección del radio

H significa la altura exterior diseñada en píxeles CSS, incluidos los bordes. R significa el `border-radius` de CSS, antes de que el navegador recorte las esquinas solapadas. Elegir primero el rol del componente y después su variante de tamaño; la anchura, la longitud de la etiqueta, los saltos de línea incidentales y la expansión del contenido no seleccionan por sí mismos un radio mayor.

| Rol | Dimensiones típicas o ejemplos | Radio | Token compartido |
|---|---|---|---|
| Detalle pequeño | Por debajo de H20; keycaps, código en línea, controles diminutos | R4 | `--dsw-radius-xs` |
| Control compacto | H20–28; botones pequeños, botones de icono compactos, elementos de menú compactos | R8 | `--dsw-radius-sm` |
| Control estándar o celda de una línea | H32–40; botones, inputs, selects, filas de navegación | R12 | `--dsw-radius-md` |
| Control grande o contenido agrupado | Botones grandes, celdas deliberadamente multilínea, grupos de formulario anidados | R16 | `--dsw-radius-lg` |
| Tarjeta de contenido independiente | Tarjetas de configuración, burbujas de mensaje, tarjetas de entrada de guía | R20 | `--dsw-radius-xl` |
| Superficie envolvente principal | Composer, diálogos, paneles principales o flotantes | R28 | `--dsw-radius-panel` |

Preferir una variante de tamaño compartida existente cuando un control propuesto cae entre estas bandas. Una tarjeta más alta sigue siendo una tarjeta: no promoverla a R28 solo porque supere la altura de un botón. Una celda multilínea diseñada intencionadamente para varias líneas usa R16; un botón ordinario cuya etiqueta salta de línea conserva su variante de botón.

Valores por defecto concretos: `Button` usa H28/R8 para `sm` y H36/R12 para `md`, incluidas las variantes de contorno. Los inputs estándar H32 y los selectores H36 usan R12. Las entradas de guía «Archivos del espacio de trabajo» y «Nuevo terminal» usan ambas R20, incluidas las variantes de solo título y con descripción. Reservar R28 para su panel o diálogo envolvente, no para esas entradas.

Los bloques de código, los diffs y las previsualizaciones de archivos comparten R16: tarjetas de entrada de archivos cambiados, tarjetas de archivos entregados, tarjetas genéricas de adjuntos y paneles de previsualización al hover. Las fichas de icono de archivo de 40px dentro de las tarjetas de archivos cambiados y de entrega usan R10 en las cuatro esquinas como excepción específica del componente. Sus rellenos de hover conservan el mismo contorno.

<a id="shapes"></a>
## Reutilización de tokens y formas deliberadas

Reutilizar los controles de `ui-primitives` antes de añadir geometría propia de la funcionalidad. Usar `box-sizing: border-box` para dimensiones exteriores fijas. Las variantes rellena, de contorno, fantasma, de carga y deshabilitada conservan el mismo tamaño y radio; los estados hover, pulsado, seleccionado y con foco no cambian el radio.

Consumir los tokens nombrados en lugar de introducir valores locales como 10px, 14px, 18px o 24px para controles y tarjetas ordinarios. Los controles de programación, la incorporación de Desktop, los avisos de cuenta y los controles de atajos conservan su geometría propia del paquete; el [registro de excepciones de radio](../packages/client/ui-theme/tests/expected/radius-exceptions.expected.json) fija cada archivo, selector y declaración permitidos en lugar de eximir paquetes enteros. Una propiedad específica de una familia puede referirse a un token compartido, como hace `--dsl-guide-entry-radius`. La geometría derivada de un inset real puede usar `calc()`; no es un nivel adicional de la escala.

Las superficies redondeadas ordinarias usan la curva `superellipse(1.5)` del tema donde se soporta. `corner-shape` no se hereda: el tema lo aplica a los elementos y a sus `::before`/`::after`. Los motores sin soporte conservan las esquinas circulares ordinarias. No introducir un suavizado específico de componente que haga que un relleno y su contorno curven de forma distinta.

Preservar los círculos y las cápsulas intencionales: los avatares y los puntos de estado usan `50%`; las píldoras explícitas y las pistas completamente redondas pueden usar `999px`. Acompañar cada declaración completamente redonda de ese tipo con `corner-shape: round` en la misma regla. No convertir cada botón en cápsula solo porque su altura sea pequeña. Los detalles diminutos de dibujo, como las marcas de glifos o las pistas en miniatura, pueden conservar su geometría local establecida; no justifican radios arbitrarios en los controles circundantes.

Tanto el contenedor del avatar como su `img` deben permanecer circulares; una imagen que solo hereda `border-radius` aún necesita un `corner-shape: round` explícito o debe heredar la curva de su contenedor circular. Mantener anchura y altura iguales en ambos.

Las superficies acopladas de borde a borde y las celdas contiguas pueden usar R0 en los bordes compartidos. Un header, un footer o una imagen a ras de una tarjeta redondea solo sus esquinas exteriores expuestas; preservar las uniones internas cuadradas en lugar de redondear cada hijo por los cuatro lados.

<a id="nested-hover"></a>
## Geometría anidada y hover

Distinguir estas tres disposiciones antes de cambiar el radio de un hijo:

| Disposición | Regla | Ejemplo |
|---|---|---|
| Inset concéntrico | R interior = max(0, R exterior − inset); usar la misma curva | R16 exterior, inset 4, R12 interior |
| Relleno a ras de un borde envolvente | La envolvente posee la esquina visible; recortar el relleno o heredar la esquina correspondiente | Una tarjeta de botón dividido con dos regiones de hover independientes |
| Tarjeta o grupo de formulario separado dentro de otra superficie | Elegir el nivel semántico del hijo; no restar mecánicamente todo el padding del padre | Editor R16 dentro de una tarjeta de configuración R20 |

Los menús estándar usan R16 exterior, padding de 4px y elementos R12. Los menús compactos usan R12 exterior, padding de 4px y elementos R8. El `SegmentedControl` compartido usa R12 exterior, inset de 4px y segmentos/indicador R8; `SegmentedTabs` usa R16 exterior, inset de 4px y segmentos/indicador R12. Mantener coherentes los desplazamientos del indicador, los cálculos de anchura, la alineación de submenús y los puentes de puntero al cambiar el padding.

Una única superficie clicable pinta el hover sobre sí misma. Un pseudoelemento o overlay a ras usa el mismo radio y la misma curva que la envolvente visible. Evitar un relleno redondeado por separado que deje una luna creciente entre el fondo y el borde.

Para una tarjeta de guía dividida, poner el radio compartido y el recorte en la tarjeta exterior; dar a los botones interiores a ras esquinas cuadradas. Cada botón puede conservar su propio color de hover, mientras la tarjeta exterior recorta ambos rellenos a un solo contorno. Mantener los menús desplegables fuera del subárbol recortado a través del portal existente. Preservar un tratamiento visible del foco de teclado en lugar de recortar un anillo de foco externo.

```css
.entry {
  border-radius: var(--dsl-guide-entry-radius);
  overflow: hidden;
}

.main,
.trigger {
  border-radius: 0;
}
```

La guía envolvente establece `--dsl-guide-entry-radius: var(--dsw-radius-xl)`. No dar a los botones interiores sus propios extremos R28 mientras la tarjeta exterior es R20.

<a id="settings-cards"></a>
## Materiales de las tarjetas de configuración

Las tarjetas de perfil de cuenta, saldo, proveedor de modelos, presets y plugins comparten este material por defecto. Los estados seleccionado, advertencia, error y expandido pueden usar sus colores semánticos existentes conservando la geometría.

```css
.card {
  border-radius: var(--dsw-radius-xl);
  border: 0.5px solid var(--dsw-alias-settings-card-stroke);
  background: var(--dsw-alias-settings-card-fill);
}
```

El tema resuelve el relleno de la tarjeta a `--dsw-alias-bg-layer-2` y el trazo a `--dsw-alias-border-l4` en `body`, donde existen los alias de paleta. Los estilos de las funcionalidades consumen estos alias en ambas paletas. Los editores anidados usan R16 y el relleno de módulo existente. Los enlaces de uso/recarga de cuenta siguen la geometría H36/R12 de Button; los botones de autorización usan el Button compartido.

Los bordes neutros planos usan la línea de pelo compartida de 0.5px. Los menús, popovers, diálogos y paneles elevados usan `border: 0` con el material `--dsw-elevation-*` existente, cuya sombra incluye la línea de pelo. No añadir un segundo borde neutro sobre ese trazo ni añadir una sombra a una tarjeta de configuración ordinaria solo para distinguir su pestaña. Preservar los bordes semánticos coloreados por estado y el comportamiento existente del fondo de menú translúcido.

<a id="verification"></a>
## Aplicación y verificación

1. Inspeccionar los componentes solicitados junto con sus primitivas compartidas, overlays, pseudoelementos y variantes hermanas. Clasificar los roles antes de reemplazar valores; no mapear cada aparición de un radio antiguo al mismo token nuevo.
2. Cambiar el propietario compartido cuando proceda y después alinear los rellenos dependientes, las esquinas hijas, el recorte y los estilos de estado. Mantener las tarjetas hijas independientes en su propio nivel.
3. Comparar el tamaño exterior, el radio, la curva, el relleno y el trazo realmente renderizados en los temas claro y oscuro. Inspeccionar los estados normal, hover, pulsado/seleccionado, deshabilitado y foco de teclado cuando aplique; en los botones divididos, hacer hover en ambas mitades. Comprobar un layout estrecho y etiquetas más largas cuando puedan afectar al componente.
4. Usar las guardas de hojas de estilo existentes de radio, corner-shape y elevación, y el escenario de navegador relevante más pequeño. La guarda de radio rechaza literales fuera de escala y tokens desconocidos; no puede determinar si un token válido es apropiado para un componente ni si dos contornos renderizados se alinean. Confirmarlo visualmente.
5. Seguir los requisitos de validación y documentación del repositorio para el diff real. Actualizar las expectativas afectadas solo tras confirmar la apariencia prevista. Reportar la regla resultante, las superficies probadas y cualquier estado no verificado; no añadir pruebas que se limiten a repetir valores CSS para un ajuste local trivial.
