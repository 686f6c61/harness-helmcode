- radio "Dirección personalizada" [checked]
- text: Dirección personalizada
- textbox "Dirección personalizada" [invalid]:
  - /placeholder: https://npm.example.com/
  - text: invalid-registry
- alert: Introduce una dirección que empiece por http:// o https://
- text: Introduce la dirección de un registro npm interno o privado que empiece por http:// o https://. Si requiere iniciar sesión, guarda las credenciales en ~/.npmrc de este equipo.

{
  "registry": [
    {
      "colorScheme": "light",
      "focused": {
        "outline": "none",
        "boxShadow": "rgb(65, 118, 230) 0px 0px 0px 0.5px inset",
        "borderColor": "rgb(236, 19, 19)"
      },
      "blurred": {
        "outline": "none",
        "boxShadow": "none",
        "borderColor": "rgb(236, 19, 19)"
      }
    },
    {
      "colorScheme": "dark",
      "focused": {
        "outline": "none",
        "boxShadow": "rgb(122, 170, 255) 0px 0px 0px 0.5px inset",
        "borderColor": "rgb(242, 90, 90)"
      },
      "blurred": {
        "outline": "none",
        "boxShadow": "none",
        "borderColor": "rgb(242, 90, 90)"
      }
    }
  ],
  "packageName": [
    {
      "colorScheme": "light",
      "focused": {
        "outline": "none",
        "boxShadow": "rgb(65, 118, 230) 0px 0px 0px 0.5px inset",
        "borderColor": "rgb(236, 19, 19)"
      },
      "blurred": {
        "outline": "none",
        "boxShadow": "none",
        "borderColor": "rgb(236, 19, 19)"
      }
    },
    {
      "colorScheme": "dark",
      "focused": {
        "outline": "none",
        "boxShadow": "rgb(122, 170, 255) 0px 0px 0px 0.5px inset",
        "borderColor": "rgb(242, 90, 90)"
      },
      "blurred": {
        "outline": "none",
        "boxShadow": "none",
        "borderColor": "rgb(242, 90, 90)"
      }
    }
  ]
}
