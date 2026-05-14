# CmisPortable

Aplicación de escritorio portable para preparar una sincronización CMIS. El proyecto está organizado en una capa de aplicación Electron y una capa Core sin dependencias externas.

## Estructura

- `src/CmisPortable.App/`: ventana inicial, integración con Electron, minimización a bandeja y controles de credenciales.
- `src/CmisPortable.Core/`: modelo de configuración, validación, persistencia JSON, almacén de credenciales e implementación de sincronización CMIS.
- `tests/CmisPortable.Tests/`: pruebas unitarias con `node:test`.

## Sincronización CMIS

La capa Core incluye `ICmisClient`, una abstracción para conectar, listar carpetas y descargar documentos desde un repositorio CMIS, y `CmisSyncService`, que sincroniza la carpeta local como un espejo de solo lectura del servidor. El servicio recorre recursivamente las carpetas permitidas para el usuario, crea carpetas locales, descarga documentos nuevos o modificados, elimina archivos y carpetas que ya no existan en CMIS, y guarda el estado en `.cmisportable/index.json`.

> Política inicial: la carpeta local se considera un espejo de solo lectura. Los cambios locales no tienen resolución de conflictos y pueden ser reemplazados o eliminados por la siguiente sincronización.

El índice registra `cmisObjectId`, ruta remota, ruta local, fecha de modificación, tamaño/hash cuando están disponibles y errores por objeto. Las operaciones remotas tienen timeout, reintentos y manejo específico de permisos denegados para registrar el fallo sin detener toda la sincronización cuando sea posible.

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

La configuración se guarda como JSON en el directorio de datos de usuario de Electron y solo contiene metadatos no sensibles: URL CMIS, carpeta local, intervalo, estado de ejecución e identificador de credencial.

Las credenciales se guardan mediante `ICredentialStore` en el almacén seguro de cada plataforma: Windows Credential Manager en Windows, Keychain en macOS y Secret Service/libsecret en Linux. La UI permite borrar la credencial guardada y la aplicación no devuelve ni muestra contraseñas al cargar la configuración.
