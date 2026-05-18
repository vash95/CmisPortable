# CmisIC2

Aplicación de escritorio portable para preparar una sincronización CMIS. El proyecto está organizado en una capa de aplicación Electron y una capa Core sin dependencias externas.

## Estructura

- `src/CmisPortable.App/`: ventana inicial, integración con Electron, minimización a bandeja y almacenamiento seguro.
- `src/CmisPortable.Core/`: modelo de configuración, validación, persistencia JSON y servicio de sincronización CMIS.
- `tests/CmisPortable.Tests/`: pruebas unitarias con `node:test`.

## Sincronización CMIS

La capa Core incluye `ICmisClient`, una abstracción para conectar, listar carpetas y descargar documentos desde un repositorio CMIS. La implementación de Browser Binding usa CmisJS (`cmis`) para gestionar la sesión, credenciales y llamadas CMIS, y `CmisSyncService` sincroniza la carpeta local como un espejo de solo lectura del servidor. El servicio recorre recursivamente las carpetas permitidas para el usuario, crea carpetas locales, descarga documentos nuevos o modificados usando el nombre del binario CMIS, elimina o renombra la copia local si el binario cambia o desaparece, elimina archivos y carpetas que ya no existan en CMIS, y guarda el estado en `.cmisic2/index.json`.

> Política inicial: la carpeta local se considera un espejo de solo lectura. Los cambios locales no tienen resolución de conflictos y pueden ser reemplazados o eliminados por la siguiente sincronización.

El índice registra `cmisObjectId`, ruta remota, ruta local, fecha de modificación, tamaño/hash cuando están disponibles y errores por objeto. Las operaciones remotas tienen timeout, reintentos y manejo específico de permisos denegados para registrar el fallo sin detener toda la sincronización cuando sea posible.

## Requisitos

- Node.js 20 o superior.
- Dependencias instaladas con `npm install` para ejecutar la app de escritorio.

## Comandos

Instala las dependencias del proyecto:

```bash
npm install
```

Ejecuta la aplicación Electron en modo desarrollo:

```bash
npm start
```

Genera los instaladores y ejecutables para Windows con electron-builder:

```bash
npm run dist:win
```

Los artefactos generados por `npm run dist:win` se escriben en `dist/`.

Para ejecutar la suite de pruebas:

```bash
npm test
```

## Configuración persistente

La configuración se guarda como JSON en el directorio de datos de usuario de Electron. Los secretos se delegan a `safeStorage` de Electron cuando está disponible y, si no lo está, se guardan codificados con una marca explícita de fallback para evitar asumir seguridad inexistente.
