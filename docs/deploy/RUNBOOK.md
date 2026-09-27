# Runbook de despliegue — foto-frase

Guía paso a paso para dejar operativo el sitio (GitHub Pages) y el Worker de
Cloudflare (ADR-001). Está escrita para alguien sin experiencia previa en
Cloudflare ni en OAuth Apps de GitHub — segui los pasos en orden, no lo
saltees, porque varias URLs dependen de un paso anterior ya hecho (ver
"Orden recomendado" al final).

No vas a necesitar tocar código para nada de esto: todo se hace desde la web
de GitHub, Cloudflare y Cloudinary, pegando valores en los lugares que se
indican.

## Antes de empezar: dos tipos de valores

A lo largo de esta guía vas a cargar dos tipos de cosas distintas en GitHub,
en **Settings > Secrets and variables > Actions** del repo
(`https://github.com/fpuricelli/foto-frase/settings/secrets/actions`):

- **Secrets** (pestaña "Secrets"): valores sensibles que nadie debe poder
  leer después de guardarlos (API tokens, API secrets). GitHub los oculta en
  los logs.
- **Variables** (pestaña "Variables"): valores públicos, no sensibles
  (`client_id`, URLs públicas). Se guardan igual pero no son secretos — está
  bien que aparezcan en un log.

Cada paso de abajo dice explícitamente en cuál de las dos pestañas va cada
valor.

---

## Paso 1 — Cuenta de Cloudflare + token para desplegar el Worker

1. Si todavía no tenés cuenta, creá una gratis en <https://dash.cloudflare.com/sign-up>.
   El plan free alcanza para este Worker (bajísimo volumen de requests).
2. Ya logueado en el dashboard de Cloudflare, andá a **My Profile > API
   Tokens** (ícono de usuario arriba a la derecha > "My Profile" > pestaña
   "API Tokens"), o directo a
   <https://dash.cloudflare.com/profile/api-tokens>.
3. Botón **"Create Token"**.
4. Buscá la plantilla **"Edit Cloudflare Workers"** y usá **"Use template"**
   (no hace falta un token custom más acotado para este proyecto).
5. Dejá los permisos que trae la plantilla por default, and confirmá con
   **"Continue to summary"** y después **"Create Token"**.
6. Cloudflare te muestra el token **una sola vez**. Copialo ahora.
7. Anotá también tu **Account ID**: en el dashboard de Cloudflare, la barra
   lateral derecha de la página principal ("Workers & Pages" o el overview
   de cualquier dominio) muestra "Account ID" con un botón de copiar. También
   aparece en la URL del dashboard (`dash.cloudflare.com/<ACCOUNT_ID>/...`).
8. En GitHub, pestaña **Secrets**, creá:
   - `CLOUDFLARE_API_TOKEN` → el token del paso 6.
   - `CLOUDFLARE_ACCOUNT_ID` → el Account ID del paso 7 (lo necesita el
     workflow para desplegar sin ambigüedad si tu usuario de Cloudflare tiene
     más de una cuenta).

## Paso 2 — Credenciales de Cloudinary para el Worker

Estas son **distintas** de las que ya usa `apps/public` (esa app solo usa el
`cloud name` y el `upload preset`, que son públicos por diseño y no van acá).
El Worker necesita el **API Key** y el **API Secret** de tu cuenta, que sí
son privilegiados.

1. Entrá al dashboard de Cloudinary → **Settings** (ícono de engranaje) →
   pestaña **"Access Keys"** (a veces aparece dentro de "Security" o
   "API Keys" según la versión de la consola).
2. Vas a ver (o vas a poder generar) un **API Key** y un **API Secret**.
   Copiá ambos.
3. En GitHub, pestaña **Secrets**, creá:
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

El `cloud name` (`r5f0ztqc`) ya está en `worker/wrangler.toml` como variable
no secreta — no hace falta cargarlo aparte.

## Paso 3 — OAuth App de GitHub con Device Flow

Esto es lo que le permite al admin "conectarse con GitHub" desde el
backoffice, sin pegar ningún token a mano.

1. Andá a **GitHub > tu foto de perfil (arriba a la derecha) > Settings >
   Developer settings** (al final del menú lateral izquierdo) **> OAuth
   Apps > New OAuth App**. Link directo:
   <https://github.com/settings/applications/new>.
2. Completá:
   - **Application name**: algo reconocible, ej. "foto-frase backoffice".
   - **Homepage URL**: `https://fpuricelli.github.io/foto-frase/backoffice/`
     (ver Paso 6 sobre por qué es esa URL y no una más corta).
   - **Authorization callback URL**: podés poner la misma URL de arriba —
     el Device Flow no la usa para redirigir, pero GitHub igual pide
     completar el campo.
3. Click **"Register application"**.
4. En la página de la app recién creada, buscá el botón/checkbox
   **"Enable Device Flow"** y activalo. Guardá.
5. Copiá el **Client ID** que aparece arriba de todo (NO generes ni copies
   ningún "Client Secret" — no lo necesitamos para nada, el Device Flow no
   lo usa).
6. En GitHub (el repo `foto-frase`), pestaña **Variables** (no Secrets — el
   `client_id` no es sensible), creá:
   - `VITE_GITHUB_OAUTH_CLIENT_ID` → el Client ID del paso 5.

## Paso 4 — Primer despliegue del Worker

Con los secrets de los Pasos 1 y 2 ya cargados:

1. En GitHub, pestaña **Actions** del repo, buscá el workflow **"Deploy
   Worker"** en la lista de la izquierda.
2. Botón **"Run workflow"** (dispara manualmente vía `workflow_dispatch`,
   rama `main`).
3. Esperá a que termine en verde. Si falla, el log de wrangler suele decir
   exactamente qué secret o token falta.
4. Una vez en verde, el log del paso "Deploy worker" muestra la URL pública
   del Worker, con esta forma:
   `https://foto-frase-worker.<tu-subdominio-de-workers>.workers.dev`
   (el subdominio lo asigna Cloudflare la primera vez, es estable después).
5. En GitHub, pestaña **Variables**, creá:
   - `VITE_WORKER_BASE_URL` → esa URL, **sin barra final**.

## Paso 5 — Habilitar GitHub Pages

1. En GitHub, **Settings > Pages** del repo.
2. En **"Build and deployment" > Source**, elegí **"GitHub Actions"** (no
   "Deploy from a branch").
3. No hace falta nada más acá — el workflow `deploy-pages.yml` ya hace el
   resto solo, apenas hagas un commit a `main` (o lo dispares manualmente
   desde la pestaña Actions, workflow **"Deploy Pages"**).

## Paso 6 — Confirmar el dominio real y el origen permitido (CORS)

Como el repo se llama `foto-frase` (no `fpuricelli.github.io`) y no tiene un
dominio propio configurado, GitHub Pages lo sirve como **"project page"** en:

```
https://fpuricelli.github.io/foto-frase/         (app pública)
https://fpuricelli.github.io/foto-frase/backoffice/   (backoffice)
```

Los `vite.config.js` de ambas apps y el workflow `deploy-pages.yml` ya están
armados para construir con ese subpath automáticamente (leen el nombre real
del repo en cada build, así que sobrevive un futuro cambio de nombre del
repo — ver la nota "Nombre provisorio" de `CLAUDE.md`).

Para CORS, lo que importa es solo el **origen** (protocolo + dominio, sin la
ruta): `https://fpuricelli.github.io`. Eso ya está puesto como
`ALLOWED_ORIGIN` en `worker/wrangler.toml`. Si en algún momento configurás un
dominio propio para GitHub Pages (por ejemplo `mural.tudominio.com`), vas a
tener que:

1. Editar `ALLOWED_ORIGIN` en `worker/wrangler.toml` con el nuevo origen.
2. Volver a correr el workflow "Deploy Worker" (un commit tocando
   `worker/**`, o disparo manual) para que tome el cambio.

No hace falta que hagas nada acá si vas a usar el dominio de
`fpuricelli.github.io` tal cual — ya está configurado.

---

## Orden recomendado (por las dependencias circulares)

Los pasos de arriba tienen un orden que conviene respetar la primera vez:

1. **Paso 1** (Cloudflare) y **Paso 2** (Cloudinary) — no dependen de nada,
   hacelos primero, en cualquier orden entre sí.
2. **Paso 4** (primer deploy del Worker) — ya podés hacerlo apenas
   terminaste 1 y 2, **aunque el backoffice todavía no tenga el
   `VITE_WORKER_BASE_URL` cargado**: el deploy del Worker no depende de eso,
   solo necesita sus propios secrets.
3. **Paso 3** (OAuth App) — independiente, podés hacerlo en paralelo con el
   punto anterior.
4. Con la URL del Worker (Paso 4) y el `client_id` (Paso 3) ya como
   variables en GitHub, **volvé a disparar (o esperá) un build de
   "Deploy Pages"** — recién ahí el backoffice queda armado con ambos
   valores en su bundle. Si "Deploy Pages" ya había corrido antes (por
   ejemplo, al hacer Paso 5), va a haber compilado con esas dos variables
   vacías; no rompe nada (el backoffice muestra un aviso de "falta
   configuración" en vez de fallar), pero necesitás un build nuevo para que
   tome los valores reales — dispará manualmente el workflow **"Deploy
   Pages"** desde la pestaña Actions una vez que las variables estén
   cargadas.
5. **Paso 5** (habilitar Pages) — podés hacerlo en cualquier momento antes o
   después de lo anterior; el primer "Deploy Pages" que corra después de
   habilitarlo es el que efectivamente publica el sitio.
6. **Paso 6** — solo aplica si en el futuro sumás un dominio propio; con la
   config actual (subdominio `github.io`) no requiere ninguna acción extra.

## Cómo verificar que quedó funcionando

- **App pública**: abrí `https://fpuricelli.github.io/foto-frase/` — debería
  cargar la pantalla de captura. `https://fpuricelli.github.io/foto-frase/mural`
  (deep link directo, no navegando desde la home) debería mostrar el Mural,
  no un 404 de GitHub.
- **Backoffice**: abrí
  `https://fpuricelli.github.io/foto-frase/backoffice/` → botón "Conectar
  con GitHub" → te da un código de 8 caracteres y un link a
  `https://github.com/login/device` → pegás el código ahí, confirmás, y la
  pantalla del backoffice pasa sola a "conectado" en unos segundos.
- **Moderación**: con la sesión conectada, andá a la pantalla de moderación.
  Si no hay envíos pendientes todavía (normal, antes de que haya usuarios
  reales), vas a ver "No hay envíos pendientes de moderación" en vez de un
  error — eso ya confirma que el Worker respondió bien (401/403 se vería
  como el mensaje de "no autorizado", no como esta pantalla vacía normal).
- Si algo no conecta, revisá primero la consola del navegador (F12) — los
  mensajes de error de este proyecto están en español y dicen justo qué
  variable falta o qué devolvió el Worker.
