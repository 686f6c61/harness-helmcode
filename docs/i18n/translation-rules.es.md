# Reglas de traducción

[English](translation-rules.md) | Español

Cómo traducir entre los dos lados de un par de documentación en este repositorio. Ambos idiomas tienen la misma autoridad ([README.md](README.es.md)): un cambio se escribe en cualquiera de los dos idiomas, y ese lado es la fuente de esa actualización; estas reglas gobiernan la producción o actualización de la contraparte. Vinculan por igual a personas y a agents. El trabajo rutinario de un agent traduce el contenido cambiado directamente en una pasada guiada por la terminología; el flujo de trabajo extendido de [.agents/skills/dsh-translate-docs](../../.agents/skills/dsh-translate-docs/SKILL.md) solo se ejecuta cuando el usuario lo invoca explícitamente. Los niveles de las reglas siguen el uso de RFC 2119: **MUST** / **MUST NOT** bloquean la puerta o la revisión; **SHOULD** exige una razón declarada para desviarse; **MAY** es discrecional.

## Fidelidad

- La contraparte *MUST* decir lo que dice el lado de autoría: sin comportamientos, prerrequisitos, advertencias, afirmaciones de versión o ejemplos añadidos, y sin omitirlos. Si el par discrepa en sustancia, ningún idioma gana por defecto: se corrige el lado que está mal y se arrastra al otro en el mismo cambio.
- La contraparte *SHOULD* leerse como redacción técnica natural en su propio idioma, no como un calco palabra por palabra. Traducir el significado, reestructurar las frases donde la gramática de destino lo pida y conservar el registro del autor: lo conciso sigue conciso.
- No traducir lo intraducible: si una frase se resiste a una renderización natural porque se apoya en un modismo del idioma fuente, traducir la idea, no el modismo.

## Voz

- El registro está calibrado por [style-samples.md](style-samples.md): pares de oro aprobados por personas, uno por género de documento. La contraparte MUST coincidir con el lado del idioma de destino de la muestra más cercana; donde su voz y una regla de voz de la prosa discrepen, gana la muestra. Los destinos en español usan español técnico institucional neutro; los destinos en inglés usan prosa concisa y profesional de desarrollador.
- Escribir como un autor técnico nativo que reformula el contenido, no como un traductor que transpone frases, conservando cada cláusula de la fuente: nada añadido, nada omitido; la fluidez nunca justifica perder una cláusula.
- Dar a las frases un actor explícito cuando el idioma de destino de otro modo lo ocultaría; en español, sustituir pasivas vagas o sujetos abstractos por el actor real (el sistema, la puerta, el revisor) o usar la pasiva refleja natural.
- Preferir el modismo técnico asentado del idioma de destino frente a los calcos (falso positivo/negativo para false positive/negative, línea roja de aplicación para enforcement frontier); localizar las metáforas en lugar de trasplantarlas, y desempaquetar las cadenas de sustantivos donde el idioma de destino lo exija.
- Dividir los párrafos largos por unidad semántica: una idea por párrafo. Los límites de párrafo MAY diferir de la fuente; la firma estructural no cuenta párrafos.
- Al traducir al español, los sustantivos de categoría usan el español con una anotación en inglés en la primera aparición cuando el nombre en inglés es canónico en este repositorio (manual de referencia (cookbook)); al traducir al inglés, usar el nombre de categoría convencional en inglés. Las referencias literales a directorios o archivos se conservan en inglés con formato de código.

## Preservación de la estructura

La puerta de emparejamiento comprueba las profundidades de encabezado, los bloques de código delimitados, los conteos de filas y columnas de las tablas, los tipos de lista, los inicios de las listas ordenadas, los conteos de elementos de lista, el idioma de los enlaces y los destinos semánticos. El resto del marco se preserva manualmente; los archivos emparejados MUST coincidir uno a uno en:

- jerarquía de encabezados (mismos niveles, mismo orden; el TEXTO de los encabezados se traduce),
- forma y numeración de las listas,
- tablas (mismas columnas, mismo orden de filas; las celdas de encabezado se traducen según la terminología),
- bloques de código delimitados: **byte-idénticos, incluidos los comentarios**; la firma de emparejamiento compara sus cadenas de información y sus contenidos, y los bloques ` ```ts ` compilan bajo `doc-typecheck`,
- spans de código en línea (comandos, flags, claves de configuración, rutas de archivos, nombres de eventos, nombres de API, números de versión): verbatim, nunca traducidos ni reformateados,
- enlaces y anclas: todo enlace relativo a documento MUST conservar el mismo destino semántico y el sufijo exacto de query y fragmento. Cuando el destino pertenece al corpus bilingüe activo, el lado inglés usa su ruta `.md` y el lado español usa su ruta `.es.md`; una contraparte ausente en ese corpus es un error, mientras que los destinos fuera de él conservan la ruta original. Las URL externas, las imágenes y los fragmentos puramente internos de página no cambian. La línea de cambio de idioma sigue siendo la excepción explícita entre idiomas, y un README renderizado fuera de GitHub MAY usar la URL canónica del repositorio público a su contraparte exacta, como se documenta en [README.md](README.es.md). El TEXTO de los enlaces se traduce.

Las convenciones de Markdown del repositorio se aplican a los archivos `.es.md` sin cambios: una línea física por párrafo (`verify-md-wrap`), enlaces relativos que resuelven (`verify-md-links`), exactamente un salto de línea final.

## Terminología

- [terminology.md](terminology.md) es la fuente de verdad en ambas direcciones. Hay que cargarla antes de traducir; cada término listado MUST seguir su fila y sus prohibiciones de «No traducir como». Un destino en español usa la columna «Español» y su anotación de «Primera aparición»; un destino en inglés usa la columna «English» sin añadir glosa en español.
- Para un destino en español, un término técnico no listado MAY usar una renderización asentada de una fuente OSS o de vendor importante en español (la localización española de Kubernetes, la documentación de MDN en español, la guía de estilo de Microsoft en español, la documentación de proyectos de grandes tecnológicas), citada en el PR. Sin ese precedente, MUST conservarse en inglés y listarse bajo «términos pendientes» con una renderización sugerida.
- Para un destino en inglés, usar el término técnico inglés asentado. Si el término fuente no tiene un equivalente asentado e inequívoco, conservarlo con una glosa breve explicativa y listarlo bajo los términos pendientes. Ninguna dirección puede inventar una renderización inline; un término decidido entra en [terminology.md](terminology.md) en el mismo PR o en uno posterior.

## Tipografía

Estas reglas gobiernan el lado español; el lado inglés sigue las convenciones normales de Markdown del repositorio (`AGENTS.md` raíz). Las reglas ortográficas siguientes se apegan a la ortografía de la [RAE](https://www.rae.es/), la [guía de localización española de Kubernetes](https://kubernetes.io/es/docs/contribute/localization/), las [convenciones de traducción docs-es de Vue.js](https://github.com/vuejs-translations/docs-es) y la [guía de estilo de Microsoft en español](https://learn.microsoft.com/en-us/globalization/reference/microsoft-style-guides):

- MUST abrir las interrogaciones y exclamaciones con los signos invertidos `¿` y `¡` y cerrarlas con `?` y `!`: `¿Qué registra el plugin?`. Nunca omitir el signo de apertura.
- MUST escribir las tildes según la ortografía de la RAE, también en mayúsculas: `Configuración`, nunca `Configuracion`; los términos de `informática` conservan sus tildes dondequiera que la RAE las exija.
- El español usa puntuación ordinaria de semianchura y espaciado normal. A diferencia de los destinos CJK, no hay reglas especiales de espaciado alrededor de palabras latinas, spans de código o numerales: `cada plugin registra 3 tools`.
- La prosa en español *SHOULD* preferir dos puntos, puntos, comas o paréntesis frente a las rayas. Conservar una raya (—) solo cuando ninguna otra puntuación preserve la frase con naturalidad.
- Los nombres propios conservan su capitalización canónica: GitHub, TypeScript, DeepSeek; nunca `github`/`Github` salvo al citar código.
- El registro es formal-neutro; se trata al lector de `tú` cuando hace falta un tratamiento directo, nunca de `usted`, y se prefieren instrucciones en infinitivo o impersonales (instalar, ejecutar) en los procedimientos y en el texto de estilo UI (coincide con las convenciones del español de Vue y Kubernetes y con la voz directa de este repositorio).
- Los marcadores de énfasis (`**negrita**`, `*cursiva*`) permanecen sobre los mismos spans que la fuente; el español usa la cursiva con moderación en la prosa técnica: no sustituir por comillas u otra decoración, y no añadir énfasis que la fuente no lleva.
- Las comillas en la prosa española son « » o " "; los spans de código y el texto inglés verbatim conservan sus comillas originales.

## Listón de calidad

- Un par está terminado cuando un ingeniero bilingüe que lee cualquiera de los dos archivos por separado obtiene todo lo que obtiene un lector del otro: mismos hechos, mismas salvedades, mismo tono, y nada extra.
- Ejecutar `pnpm run verify-translation-pairing` y el resto de `doc-sync` para los registros, las líneas de cambio de idioma, las profundidades de encabezado, los bloques de código, los conteos de filas y columnas de las tablas, los tipos de lista, los inicios de las listas ordenadas, los conteos de elementos de lista, los enlaces y las reglas de Markdown del repositorio. La revisión humana es dueña del orden de listas y tablas, la numeración no canónica de listas, el código en línea, el énfasis, el significado, la terminología y el tono.

## Referencias

Autoridades citadas por estas reglas, para personas y agents que quieran el razonamiento subyacente:

- [RAE — Diccionario de la lengua española y Ortografía](https://www.rae.es/): la base ortográfica formal: acentuación, puntuación y los signos invertidos.
- [Guía de localización española de Kubernetes](https://kubernetes.io/es/docs/contribute/localization/): práctica de terminología y registro de un gran equipo de localización al español.
- [Traducciones docs-es de Vue.js](https://github.com/vuejs-translations/docs-es): decisiones de traducir o conservar término a término y tono en un proyecto de documentación para desarrolladores de la misma forma que este.
- [Guía de estilo de Microsoft en español](https://learn.microsoft.com/en-us/globalization/reference/microsoft-style-guides): la base de localización de vendor para el español del software.
- [FundéuRAE](https://www.fundeu.es/): recomendaciones para el español en la redacción técnica y periodística, incluida la política de anglicismos (cuándo conservar un término inglés y cómo glosarlo).
