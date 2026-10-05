Synthetic browser KeyboardEvents, not an OS input-method test.
package / isComposing=true: inspect=0, install=0; editable; value retained
- textbox "Nombre del paquete o dirección":
  - /placeholder: Por ejemplo dsh-plugin-nan-pet
  - text: ime-confirm-package
package / Safari isComposing=false, keyCode=229: inspect=0, install=0; editable; value retained
- textbox "Nombre del paquete o dirección":
  - /placeholder: Por ejemplo dsh-plugin-nan-pet
  - text: ime-confirm-package
package / compositionstart + unmarked Enter: inspect=0, install=0; editable; value retained
- textbox "Nombre del paquete o dirección":
  - /placeholder: Por ejemplo dsh-plugin-nan-pet
  - text: ime-confirm-package
package / compositionend + immediate unmarked Enter: inspect=0, install=0; editable; value retained
- textbox "Nombre del paquete o dirección":
  - /placeholder: Por ejemplo dsh-plugin-nan-pet
  - text: ime-confirm-package
package / compositionend + 9ms unmarked Enter: inspect=0, install=0; editable; value retained
- textbox "Nombre del paquete o dirección":
  - /placeholder: Por ejemplo dsh-plugin-nan-pet
  - text: ime-confirm-package
package / plain Enter: inspect=1, install=1
- dialog "No se pudo instalar el plugin":
  - button "Volver a editar": Editar
  - button "Cerrar"
  - alert: No se pudo instalar el plugin
  - paragraph: "IME fixture: no package was installed"
  - paragraph: ime-confirm-package
  - paragraph: Versión 1.0.0
  - button "Ver detalles de la instalación"
  - button "Reintentar"
custom registry / isComposing=true: inspect=0, install=0; editable; value retained
- textbox "Dirección personalizada":
  - /placeholder: https://npm.example.com/
  - text: https://registry.example.test/
custom registry / Safari isComposing=false, keyCode=229: inspect=0, install=0; editable; value retained
- textbox "Dirección personalizada":
  - /placeholder: https://npm.example.com/
  - text: https://registry.example.test/
custom registry / compositionstart + unmarked Enter: inspect=0, install=0; editable; value retained
- textbox "Dirección personalizada":
  - /placeholder: https://npm.example.com/
  - text: https://registry.example.test/
custom registry / compositionend + immediate unmarked Enter: inspect=0, install=0; editable; value retained
- textbox "Dirección personalizada":
  - /placeholder: https://npm.example.com/
  - text: https://registry.example.test/
custom registry / compositionend + 9ms unmarked Enter: inspect=0, install=0; editable; value retained
- textbox "Dirección personalizada":
  - /placeholder: https://npm.example.com/
  - text: https://registry.example.test/
custom registry / plain Enter: inspect=1, install=1
- dialog "No se pudo instalar el plugin":
  - button "Volver a editar": Editar
  - button "Cerrar"
  - alert: No se pudo instalar el plugin
  - paragraph: "IME fixture: no package was installed"
  - paragraph: ime-confirm-registry
  - paragraph: Versión 1.0.0
  - button "Ver detalles de la instalación"
  - button "Reintentar"
Profile manifest unchanged; controlled Host result performed no package installation.
