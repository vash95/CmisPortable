# CmisPortable

Aplicación de escritorio portable para preparar una sincronización CMIS. El proyecto está organizado en una capa de aplicación Electron y una capa Core sin dependencias externas.

## Estructura

- `src/CmisPortable.App/`: ventana inicial, integración con Electron, minimización a bandeja y almacenamiento seguro.
- `src/CmisPortable.Core/`: modelo de configuración, validación y persistencia JSON.
- `tests/CmisPortable.Tests/`: pruebas unitarias con `node:test`.

## Requisitos

- Node.js 20 o superior.
- Dependencias instaladas con `npm install` para ejecutar la app de escritorio.

## Comandos

```bash
npm install
npm test
npm start
```

## Configuración persistente

La configuración se guarda como JSON en el directorio de datos de usuario de Electron. Los secretos se delegan a `safeStorage` de Electron cuando está disponible y, si no lo está, se guardan codificados con una marca explícita de fallback para evitar asumir seguridad inexistente.
