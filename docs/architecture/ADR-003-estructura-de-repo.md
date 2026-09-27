# ADR-003: Estructura de carpetas del repo (dos apps Vue + Worker serverless)

## Requerimientos relacionados

REQ-001

## Decisión

```
foto-frase/
├── apps/
│   └── public/                    # App pública: captura + armado de frase + upload + Mural
│       ├── src/
│       │   ├── views/             # ej. Capture.vue, Consent.vue, Mural.vue (carrusel+grilla)
│       │   ├── composables/       # ej. useCanvasComposition, useDeviceSubmissions, useCampaign
│       │   └── assets/            # logo copiado desde docs/assets/branding, fuente embebida
│       ├── public/                 # manifest PWA, favicon, íconos
│       └── vite.config.js
├── apps/
│   └── backoffice/                # App admin: edición de phrases/campaign + moderación
│       ├── src/
│       │   ├── views/             # ej. PhrasesEditor.vue, CampaignEditor.vue, Moderation.vue
│       │   └── composables/       # ej. useGithubAuth (device flow), useGithubContents,
│       │                          #     useModerationApi (cliente del Worker)
│       └── vite.config.js         # build con base: '/backoffice/'
├── packages/
│   └── shared/                     # código compartido entre las dos apps (sin lógica de negocio
│       │                           # propia de cada una): constantes de tags/context de
│       │                           # Cloudinary (ADR-002), tipos/JSDoc de phrases.json y
│       │                           # campaign.json, cliente fetch mínimo reusable
│       └── src/
├── worker/                         # Cloudflare Worker (ADR-001) — NO se despliega a GitHub Pages
│   ├── src/
│   │   ├── gh-oauth-proxy.ts       # forwarding CORS de device flow
│   │   └── moderation.ts           # proxy firmado de Cloudinary Admin API
│   └── wrangler.toml
├── data/
│   ├── phrases.json                # git-as-backend (ADR-002)
│   └── campaign.json                # git-as-backend (ADR-002)
├── docs/
│   ├── requirements/
│   ├── architecture/
│   └── assets/
│       └── branding/
│           └── logo-5ta-marcha-federal.png
├── .github/
│   └── workflows/
│       ├── deploy-pages.yml         # build apps/public (root) + apps/backoffice (subpath) →
│       │                            # un único artefacto → actions/deploy-pages
│       └── deploy-worker.yml        # wrangler deploy, disparado solo por cambios en worker/**
├── package.json                     # workspaces npm (o pnpm) → "apps/*", "packages/*"
└── CLAUDE.md
```

Puntos que fija esta decisión:

- **Monorepo con workspaces** (`apps/*`, `packages/*`), un solo `package.json` raíz con
  `workspaces`, sin herramientas de monorepo adicionales (Nx/Turborepo) — el proyecto es chico y no
  lo justifica.
- **Un solo sitio de GitHub Pages** para las dos apps públicas (Pages es un sitio por repo): la app
  pública se sirve en la raíz (`/`), el backoffice en un subpath (`/backoffice/`, vía `base:
  '/backoffice/'` en su `vite.config.js`). El workflow de deploy construye ambas y combina los
  `dist/` en un único artefacto antes de publicarlo.
- **El Mural (carrusel + grilla) vive dentro de `apps/public`** como una ruta/vista más (ej.
  `/mural`), no como una tercera app: comparte build, PWA config y el fetch de `campaign.json`; REQ
  solo pide que tenga "URL propia", lo cual una ruta de SPA ya satisface. Esto requiere el fallback
  estándar de `404.html` para deep-links de SPA en GitHub Pages (tarea de `deploy-engineer`).
- **`worker/` es un paquete separado, fuera de `apps/`**: no lo construye Vite, no lo sirve GitHub
  Pages, tiene su propio pipeline de deploy (`wrangler deploy`) y su propio ciclo de vida de
  secretos (Cloudflare, no GitHub Pages).
- **`packages/shared`** existe solo si `frontend-developer` y `backoffice-developer` detectan
  duplicación real (constantes de tags de Cloudinary, forma de `phrases.json`); si al implementar
  resulta trivial, puede quedar como un par de archivos sin necesidad de un workspace propio — se
  deja como estructura disponible, no como obligación de usarla desde el día uno.
- **`docs/assets/branding/`** (ya existente, con el logo oficial) es la fuente de verdad del asset;
  `apps/public` lo copia/importa a su propia carpeta de assets de build en vez de referenciarlo por
  ruta relativa cruzada, para que el build de Vite lo procese (hashing, optimización) igual que
  cualquier otro asset.

## Alternativas consideradas

- **Dos repos separados** (uno por app): descartado — complica compartir `data/*.json` y la
  convención de Cloudinary entre ambas apps, y el proyecto ya vive en un único repo
  (`fpuricelli/foto-frase`) según `CLAUDE.md`.
- **Backoffice como repo/Pages-site aparte** para poder tener su propio dominio: descartado por
  ahora — GitHub Pages permite un solo sitio por repo gratis; un segundo sitio implicaría un
  segundo repo (duplicando `data/*.json` o inventando un mecanismo de sincronización). Si el
  usuario necesita separar dominios más adelante, es una decisión de producto a revisar, no un
  bloqueo técnico actual.
- **Mural como aplicación separada de `apps/public`**: descartado por ahora — no hay nada en REQ-001
  que impida que sea una ruta de la misma SPA, y separarla duplicaría build/PWA config sin
  beneficio funcional concreto.

## Impacto

- **Frontend público**: desarrollar dentro de `apps/public`, incluyendo la vista `/mural`.
- **Backoffice**: desarrollar dentro de `apps/backoffice`, con `base: '/backoffice/'` en su config
  de Vite.
- **CI/CD (deploy-engineer)**:
  - Armar `deploy-pages.yml`: instalar deps del workspace, build de ambas apps, combinar
    `apps/public/dist` (raíz) + `apps/backoffice/dist` (en subcarpeta `backoffice/`) en un único
    directorio de salida, publicar con `actions/deploy-pages`.
  - Resolver el fallback `404.html` para rutas de SPA (tanto `/mural` en la app pública como las
    rutas internas del backoffice).
  - Armar `deploy-worker.yml` (trigger solo en cambios bajo `worker/**`), con los secrets de
    Cloudflare (`CLOUDFLARE_API_TOKEN`) y de Cloudinary cargados como GitHub Actions secrets para
    pasarlos a `wrangler secret put` (o `wrangler.toml` con `[vars]`/secrets según corresponda).
  - Cargar `VITE_GITHUB_OAUTH_CLIENT_ID` (no secreto) como variable de build del backoffice.
- **Testing/QA**: verificar que ambos builds conviven sin colisión de rutas/assets en el artefacto
  combinado, y que el deep-link a `/mural` y a `/backoffice/...` funcionan tal cual en GitHub Pages
  (no solo en `vite preview` local).

## Riesgos abiertos

Ninguno de negocio. El único punto a validar en la práctica (no bloqueante para arrancar) es que el
paso de "combinar los dos `dist/` en un artefacto" del workflow de Pages funcione limpio con
`vite-plugin-pwa` en ambas apps a la vez (dos service workers en un mismo origen, con scopes
distintos: `/` y `/backoffice/`) — tarea de verificación de `deploy-engineer` durante la
implementación, no una decisión de arquitectura adicional.
