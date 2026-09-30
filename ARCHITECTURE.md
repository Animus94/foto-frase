# Arquitectura: foto-frase

Nombre provisorio — renombrar carpeta/repo cuando haya un nombre definitivo.

## Qué es

Web app para celular (PWA) donde el usuario final:

1. Captura una foto con la cámara del dispositivo.
2. Arma una frase para esa foto combinando fragmentos predefinidos (plantillas/opciones administrables).
3. Envía la foto + frase; queda expuesta en la galería pública de la app (Mural).

Incluye un **backoffice de administración** para:

- Editar las frases/opciones predefinidas que arma el usuario final (`data/phrases.json` y `data/campaign.json`).
- Moderar/revisar los envíos (foto + frase) ya publicados o pendientes.

## Restricciones duras de arquitectura

- **Sin base de datos propia** (ni SQL ni NoSQL que haya que administrar).
- **Hosteable 100% en GitHub Pages** (sitio estático, sin servidor propio en runtime).
- Node/Vite/CI se usan solo en tiempo de build, nunca en runtime.
- Cualquier decisión técnica que rompa estas dos restricciones debe evaluarse como pregunta abierta en los requerimientos correspondientes.

## Decisiones de arquitectura tomadas

1. **Stack**: Vue 3 + Vite + `vite-plugin-pwa`, tanto para la app pública (`apps/public`) como para el backoffice (`apps/backoffice`).
2. **Config administrable (frases predefinidas) → git-as-backend**: vive como JSON versionado en el repo (`data/phrases.json` y `data/campaign.json`). El backoffice la edita mediante la API de GitHub (Contents API), autenticado con OAuth App / Device Flow. Cada commit dispara el redeploy automático a GitHub Pages.
3. **Fotos + frase de cada envío → Cloudinary + Cloudflare Worker**:
   - Subida firmada vía un Cloudflare Worker (`worker/`) protegido por Cloudflare Turnstile (ADR-004).
   - Frase armada y metadata (fecha, estado de moderación) se guardan como context/metadata de la imagen en Cloudinary.
   - El Worker actúa también como proxy seguro de las operaciones administrativas y de moderación en Cloudinary, resguardando el API Secret.
4. **Hosting y Despliegue**: GitHub Actions (`.github/workflows/deploy-pages.yml` y `deploy-worker.yml`). GitHub Pages sirve la app pública en la raíz y el backoffice en `/backoffice/`.

## Convenciones del proyecto

- **Idioma de documentación**: Español (requerimientos, ADRs, guías).
- **Idioma de código**: Inglés (variables, funciones, componentes y comentarios técnicos).
- **Requerimientos**: `docs/requirements/REQ-NNN-nombre-corto.md`.
- **Decisiones arquitectónicas**: `docs/architecture/ADR-NNN-nombre-corto.md`.

## Estructura del repositorio

- `apps/public`: PWA móvil para el usuario final (captura, selección de frase, subida y visualización de mural/carrusel).
- `apps/backoffice`: Panel de administración (conexión con GitHub, moderación de envíos y editor de frases/campaña).
- `packages/shared`: Esquemas, constantes de Cloudinary y utilidades compartidas.
- `worker/`: Cloudflare Worker para firma de uploads, proxy de OAuth GitHub y moderación.
- `data/`: Datos estáticos de configuración (`phrases.json`, `campaign.json`).
- `docs/`: Documentación detallada de requerimientos, arquitectura (ADRs) y runbook de despliegue.
