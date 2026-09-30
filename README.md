# foto-frase

Web app para celular (PWA) donde el usuario captura una foto con la cámara y le arma una frase combinando fragmentos predefinidos de adhesión a la 5ta Marcha Federal Universitaria. Incluye un backoffice para administrar esas frases y moderar los envíos. Sin base de datos propia — hosteada en GitHub Pages.

Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md) para detalles completos de arquitectura y diseño técnico.

## Estructura del Proyecto

- `apps/public`: Web app móvil (PWA) para los usuarios finales (captura de fotos, armado de frases, visualización del Mural y Carrusel).
- `apps/backoffice`: Panel de administración (moderación de envíos y edición de frases/campaña vía GitHub Contents API).
- `packages/shared`: Código, schemas y constantes compartidas entre apps.
- `worker/`: Cloudflare Worker para firma de uploads a Cloudinary y proxy de GitHub Device Flow.
- `data/`: Archivos de configuración versionados (`phrases.json` y `campaign.json`).
- `docs/`: Requerimientos (`docs/requirements/`), decisiones arquitectónicas (`docs/architecture/`) y guía de despliegue (`docs/deploy/RUNBOOK.md`).

## Desarrollo Local

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar la App Pública
```bash
npm run dev:public
```
Disponible en `http://localhost:5173/`. Permite probar captura, selección de frases y vistas de Mural/Carrusel (con datos simulados automáticamente en modo dev si no hay cuenta de Cloudinary conectada).

### 3. Ejecutar el Backoffice
```bash
npm run dev:backoffice
```
Disponible en `http://localhost:5173/backoffice/`. Incluye un botón para probar con datos simulados (mock) sin necesidad de conectar credenciales reales.

### 4. Compilación para producción
```bash
npm run build:public
npm run build:backoffice
```

Para más detalles sobre configuración de servicios externos (Cloudinary, Cloudflare Turnstile, GitHub OAuth), consultar [`docs/deploy/RUNBOOK.md`](./docs/deploy/RUNBOOK.md).
