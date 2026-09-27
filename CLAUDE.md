# Proyecto: foto-frase

Nombre provisorio — renombrar carpeta/repo cuando haya un nombre definitivo.

## Qué es

Web app para celular (PWA) donde el usuario final:

1. Captura una foto con la cámara del dispositivo.
2. Arma una frase para esa foto combinando fragmentos predefinidos (plantillas/opciones administrables).
3. Envía la foto + frase; queda expuesta en la galería pública de la app.

Incluye un **backoffice de administración** para:

- Editar las frases/opciones predefinidas que arma el usuario final.
- Moderar/revisar los envíos (foto + frase) ya publicados.

## Restricción dura de arquitectura

- **Sin base de datos propia** (ni SQL ni NoSQL que haya que administrar).
- **Hosteable 100% en GitHub Pages** (sitio estático, sin servidor propio en runtime).
- Node/Vite/CI se usan solo en tiempo de build, nunca en runtime.
- Cualquier decisión de producto o técnica que rompa estas dos restricciones se marca como pregunta abierta en el requerimiento correspondiente — no se resuelve por la libre.

## Decisiones de arquitectura ya tomadas

1. **Stack**: Vue 3 + Vite + `vite-plugin-pwa`, tanto para la app pública como para el backoffice (dos entry points/apps dentro del mismo repo, ej. `apps/public` y `apps/backoffice`).

2. **Config administrable (frases predefinidas) → git-as-backend**: vive como JSON versionado en el repo (ej. `data/phrases.json`). El backoffice la edita llamando a la API REST de GitHub (leer/actualizar contenido de archivo → commit), autenticado como el propio admin (OAuth App/device flow de GitHub, o un Personal Access Token que el admin pega a mano y que se guarda **solo** en `sessionStorage` del navegador — nunca en el repo, nunca enviado a terceros). Cada commit dispara el redeploy automático de GitHub Pages.

3. **Fotos + frase de cada envío → Cloudinary**:
   - Upload **unsigned** desde el navegador del usuario final (solo `cloud name` + `upload preset` públicos, sin exponer el API Secret).
   - La frase armada y metadata relevante (fecha, estado de moderación, etc.) se guardan como *context/metadata* de la propia imagen en Cloudinary — la imagen y su frase viven juntas, sin necesidad de una base de datos aparte.
   - El backoffice lista/busca/modera los envíos vía la Search/Admin API de Cloudinary.
   - **⚠️ Riesgo abierto, a resolver en la fase de arquitectura**: las operaciones "privilegiadas" de Cloudinary (Admin API: listar todo, borrar, re-etiquetar) requieren firmar el request con el **API Secret**, que NO puede vivir en el bundle público del backoffice sin quedar expuesto a cualquiera que abra las devtools. Hay que decidir un mecanismo (ej. una función serverless gratuita tipo Cloudflare Worker que guarde el secret y actúe de proxy solo para esas operaciones puntuales) sin dejar de cumplir "sin servidor propio que haya que mantener como si fuera base de datos". El agente `architect` debe dejar esto resuelto **antes** de que `backoffice-developer` implemente moderación.

4. **Hosting/Deploy**: GitHub Actions (`.github/workflows/deploy.yml`) → build de Vite → publish a GitHub Pages (`actions/deploy-pages` o `peaceiris/actions-gh-pages`). Sin secrets sensibles en el repo ni en el bundle del cliente: cloud name y upload preset de Cloudinary son públicos por diseño; cualquier credencial privilegiada (API secret, client secret de OAuth) va en GitHub Actions secrets o en el Worker/proxy del punto 3, nunca en el código que se sirve al navegador.

## Flujo de trabajo (orquestación de agentes)

Los requerimientos nacen de una conversación en chat con el usuario (dueño del producto). El flujo es:

1. **`requirements-analyst`** — convierte lo que el usuario cuenta en chat en un documento de requerimiento estructurado (`docs/requirements/REQ-NNN-slug.md`), sin inventar detalles: si falta información, la deja como pregunta abierta dentro del propio documento.
2. **`architect`** — toma uno o varios REQ, los baja a diseño técnico (`docs/architecture/...`) respetando las restricciones de este archivo, resuelve trade-offs (como el riesgo de la Cloudinary Admin API de arriba) y arma la lista de tareas por agente.
3. **`frontend-developer`** — implementa la app pública (captura de cámara, armado de frase, upload a Cloudinary, PWA).
4. **`backoffice-developer`** — implementa el panel admin (edición de frases vía API de GitHub, moderación vía Cloudinary).
5. **`qa-tester`** — escribe y corre tests (unitarios, integración, e2e) de lo que entregan los dos devs.
6. **`deploy-engineer`** — mantiene el pipeline de CI/CD a GitHub Pages y la configuración de build.

El orquestador de todo este flujo es la sesión principal de Claude Code: recibe el pedido del usuario en el chat y decide a qué agente(s) delegar cada parte, respetando ese orden cuando corresponde (no se le pide código a `frontend-developer` sobre un requerimiento que `requirements-analyst` todavía no formalizó).

## Convenciones

- Idioma de la documentación (este archivo, requerimientos, ADRs): español.
- Idioma de código, nombres de variables/funciones y comentarios en código: inglés.
- Nomenclatura de archivos de requerimiento: `docs/requirements/REQ-NNN-nombre-corto.md`, numeración incremental de 3 dígitos.
- Nomenclatura de decisiones de arquitectura: `docs/architecture/ADR-NNN-nombre-corto.md`.

## Estado actual

- Orquestación de agentes y este documento: listos.
- Repositorio GitHub: [`fpuricelli/foto-frase`](https://github.com/fpuricelli/foto-frase), rama `main`. GitHub Pages todavía no está habilitado (pendiente para cuando `deploy-engineer` arme el workflow).
- Cuenta de Cloudinary: ya existe (del usuario). Falta registrar acá el `cloud name` y crear el *upload preset* unsigned cuando `architect`/`deploy-engineer` lo necesiten.
- Todavía no hay ningún requerimiento cargado en `docs/requirements/`. El próximo paso es que el usuario explique sus necesidades en el chat para que `requirements-analyst` las convierta en el primer REQ.
