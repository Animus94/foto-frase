# ADR-001: Backend-sin-backend — autenticación del admin contra GitHub y proxy firmado de Cloudinary

## Requerimientos relacionados

REQ-001

## Decisión

Se introduce **un único componente serverless** (no negociable evitarlo del todo: hay dos
operaciones que requieren un secreto que no puede vivir en un bundle estático) — un **Cloudflare
Worker** (plan gratuito) que cumple dos roles distintos, expuestos como rutas separadas del mismo
Worker:

### A. Autenticación del admin: GitHub OAuth App con Device Flow

- Se registra una **OAuth App** de GitHub (una única vez, la hace quien opera el proyecto técnico,
  no el admin de campaña) con **Device Flow habilitado**. El `client_id` resultante **no es un
  secreto** (es análogo al `client_id` público que usa la propia GitHub CLI) y se embebe como
  variable de build (`VITE_GITHUB_OAUTH_CLIENT_ID`) en el bundle de `apps/backoffice`.
- Flujo operativo para el admin (pensado para alguien no técnico):
  1. Entra al backoffice, aprieta "Conectar con GitHub".
  2. La app pide un `device_code`/`user_code` a `https://github.com/login/oauth/device/code`.
  3. Se le muestra un link a `https://github.com/login/device` + el código de 8 caracteres para
     pegar ahí (patrón idéntico al que usa `gh auth login` o clientes de Smart TV).
  4. La app hace polling a `https://github.com/login/oauth/access_token` hasta que el admin
     confirma en la pestaña de GitHub.
  5. El **access token** resultante se guarda **solo en `sessionStorage`** del navegador — nunca en
     el repo, nunca en `localStorage`, nunca enviado a un tercero — tal como ya fija `CLAUDE.md`.
- **Por qué pasa por el Worker igual, si el device flow no requiere `client_secret`**: los dos
  endpoints de GitHub (`/login/oauth/device/code` y `/login/oauth/access_token`) **no envían
  cabeceras CORS** que permitan invocarlos con `fetch` desde un origen `https://*.github.io`. El
  Worker expone `POST /gh/device/code` y `POST /gh/oauth/token` como **simple forwarding** (sin
  guardar ni inspeccionar el token, sin usar ningún secreto en este paso) para esquivar esa
  limitación de CORS, no para firmar nada.
- Una vez obtenido el token, las escrituras a `data/phrases.json` y `data/campaign.json` van
  **directo del navegador del admin a `api.github.com`** (que sí soporta CORS con `Authorization:
  Bearer <token>`), sin pasar por el Worker — tal como ya establecía `CLAUDE.md`. El Worker no
  interviene en la edición de frases.
- Scope solicitado: `repo` (scope clásico de OAuth Apps de GitHub; no existe una variante más
  angosta "solo este repo" para OAuth Apps clásicas — ver Alternativas/Riesgos).

### B. Proxy firmado para las operaciones privilegiadas de Cloudinary (moderación)

- El Worker expone además:
  - `GET /moderation/pending?cursor=<opaco>` — lista envíos con tag `moderation:pending` vía
    Cloudinary **Admin Search API** (paginado por `next_cursor` de la propia respuesta de
    Cloudinary), firmado con `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`.
  - `POST /moderation/:public_id/approve` — actualiza tags/context del recurso (ver ADR-002) para
    marcarlo aprobado.
  - `POST /moderation/:public_id/reject` — ídem, para rechazo.
- **Autorización de estas 3 rutas**: el navegador manda el mismo `access_token` de GitHub obtenido
  en el paso A como `Authorization: Bearer <token>` al Worker. Antes de tocar Cloudinary, el Worker:
  1. Llama a `GET https://api.github.com/repos/<owner>/<repo>` con ese token y valida que la
     respuesta traiga `permissions.push == true` (o `permissions.admin`) — es decir, que quien
     manda el request tiene permiso de escritura sobre **este** repo puntual.
  2. Llama a `GET https://api.github.com/user` con el mismo token para resolver el `login` del
     admin, que se guarda como `context.moderated_by` en Cloudinary (ver ADR-002).
  3. Si cualquiera de las dos validaciones falla, responde `401/403` sin tocar Cloudinary.
- De este modo **no hay una contraseña o secreto separado para el Worker**: la única credencial que
  maneja el admin es la sesión de GitHub que ya usa para editar frases. El Worker nunca persiste el
  token de GitHub (lo usa solo para validar el request en curso).
- Secretos del Worker (Cloudflare secrets, nunca en el repo): `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Variable no secreta: `GITHUB_REPO` (`owner/repo`).

## Alternativas consideradas

- **Personal Access Token pegado a mano** (la otra opción que ya mencionaba `CLAUDE.md`):
  técnicamente más simple (cero Worker para el paso A), pero le pide a una persona no
  desarrolladora crear un fine-grained PAT (elegir scopes, expiración, repo) y tener que volver a
  hacerlo cada vez que expire o cada vez que abra una sesión nueva (dado que solo vive en
  `sessionStorage`, se pierde al cerrar la pestaña). Se descarta como mecanismo primario por
  fricción de UX para el operador objetivo, pero **queda documentado como fallback manual** si el
  registro de la OAuth App o el Worker no estuvieran disponibles.
- **GitHub App en vez de OAuth App clásica**: permitiría tokens de instalación acotados a un solo
  repo (mejor superficie de riesgo que el scope `repo` de una OAuth App clásica), pero requiere
  firmar JWT con una clave privada de la App y gestionar tokens de instalación — un componente
  server-side bastante más pesado que el Worker mínimo ya necesario para Cloudinary. Se descarta
  por sobre-ingeniería relativa al tamaño del proyecto (un solo admin, un solo repo).
- **Exponer el API Secret de Cloudinary directamente en el bundle del backoffice**: descartado de
  plano — es la violación que este ADR existe para evitar.
- **No firmar nada y usar solo el upload preset unsigned también para leer/moderar**: no es viable,
  Cloudinary no permite listar/editar recursos ajenos sin autenticación Admin API.

## Impacto

- **Datos/esquema**: ninguno nuevo en esta ADR (ver ADR-002 para tags/context de Cloudinary y forma
  de `data/phrases.json` / `data/campaign.json`).
- **Frontend público** (`apps/public`): no consume el Worker en absoluto (el upload sigue siendo
  unsigned directo a Cloudinary). Sin tareas de este ADR.
- **Backoffice** (`apps/backoffice`):
  - Implementar el flujo de Device Flow (pantalla "Conectar con GitHub", polling, guardado del
    token en `sessionStorage`, logout que limpia `sessionStorage`).
  - Cliente HTTP hacia `api.github.com` (leer/actualizar `data/phrases.json` y
    `data/campaign.json` vía Contents API, con manejo de `sha` para updates).
  - Cliente HTTP hacia las rutas del Worker (`/moderation/pending`, `/approve`, `/reject`),
    mandando siempre el bearer token de GitHub.
  - Manejo de expiración/401 del token (re-disparar el Device Flow).
- **CI/CD / deploy-engineer**:
  - Registrar la OAuth App en GitHub (una vez), habilitar Device Flow, cargar
    `VITE_GITHUB_OAUTH_CLIENT_ID` como variable de build en el workflow de Pages.
  - Crear y desplegar el Worker (`wrangler deploy`) en un workflow separado (no forma parte del
    build de Vite/GitHub Pages); cargar sus 3 secrets vía `wrangler secret put` o GitHub Actions
    secrets + `wrangler.toml`.
  - Configurar CORS del Worker para aceptar únicamente el origen de `apps/backoffice` en GitHub
    Pages (allowlist explícita del dominio, no `*`).
- **Testing / qa-tester**:
  - Mock del Device Flow completo (device code, polling con estado `authorization_pending` →
    `access_token`) y del caso de usuario que nunca confirma (timeout).
  - Caso: token válido pero usuario sin permiso de escritura sobre el repo → Worker debe responder
    403 y el backoffice debe mostrarlo como "no autorizado", no como error genérico.
  - Caso: token expirado a mitad de una sesión de moderación → reintento de auth sin perder el
    estado de la lista de pendientes ya cargada.
  - Caso: doble click / doble aprobación del mismo `public_id` (approve llamado dos veces) → debe
    ser idempotente del lado del Worker.

## Riesgos abiertos

- El scope `repo` de una OAuth App clásica de GitHub es más amplio que "solo este repositorio": si
  el token del admin se filtrara (ej. por un XSS en el bundle del backoffice), el atacante tendría
  el mismo acceso que el admin tiene en GitHub, no acotado a `foto-frase`. Mitigación aceptada:
  mantener el bundle del backoffice sin dependencias de terceros no auditadas y con CSP estricta;
  no se resuelve del todo sin migrar a una GitHub App (ver Alternativas). Esto es un riesgo técnico
  aceptado, no una pregunta de negocio.
- Ninguna pregunta de negocio pendiente en esta ADR.
