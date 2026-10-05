# Fixtures binarios de Office

[English](README.md) | Español

`preview.doc`, `preview.xls` y `preview.ppt` contienen `Office preview 中文文档`. Son los fixtures (datos de prueba preestablecidos) `one-page.doc`, `one-sheet.xls` y `one-slide.ppt` de [LibreOffice Kit](https://github.com/deepseek-harness/libreoffice-kit/tree/main/test/fixtures), exportados desde OOXML escrito por Harness con LibreOffice 26.8.0.3 mediante los filtros de Word, Excel y PowerPoint 97. Los documentos de origen conservan la licencia MIT de Harness.

La regresión del navegador lee estos archivos OLE versionados en el repositorio y verifica la conversión real y que el texto del PDF sea seleccionable. No contienen documentos de usuario y no requieren ninguna aplicación de Office ni generador de fixtures durante las pruebas. Cubren importaciones simples de formatos antiguos, no la fidelidad de documentos complejos.
