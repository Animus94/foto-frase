# ADR-004: Turnstile + upload firmado — cierra el hueco del preset unsigned

## Requerimientos relacionados

Ninguno formal — decisión de seguridad pedida directamente por el usuario sobre un riesgo ya
documentado en el resumen ejecutivo del proyecto ("Upload sin firmar": cualquiera que inspeccione
el bundle público puede ver `cloud_name` + `upload_preset` y subir contenido directo a Cloudinary,
sin pasar por la app, antes de que la moderación humana lo frene).

## Decisión

Se reemplaza el upload **unsigned** de `apps/public` por un upload **firmado**, gateado por un
chequeo anti-bot (**Cloudflare Turnstile**, gratis, sin trackear como reCAPTCHA):

1. El usuario completa el widget de Turnstile en el paso de consentimiento (antes de "Enviar").
2. La app llama a una ruta nueva del Worker, `POST /upload/sign`, mandando el token de Turnstile +
   los parámetros que se van a subir (`public_id`, `tags`, `context`, `timestamp`).
3. El Worker valida el token contra `https://challenges.cloudflare.com/turnstile/v0/siteverify`
   (con el Turnstile *secret key*, nunca expuesto al cliente). Si es válido, firma esos mismos
   parámetros con el API Secret de Cloudinary (que el Worker ya tenía, de ADR-001) y devuelve
   `{ signature, timestamp, api_key }`.
4. La app sube el archivo directo a Cloudinary con esos tres valores en vez de `upload_preset` —
   sin ellos, Cloudinary rechaza la subida.

Sin pasar el chequeo de Turnstile, no hay forma de conseguir una firma válida — el `cloud_name`
público ya no alcanza para subir nada.

## Alternativas consideradas

- **Solo restringir el upload preset** (formato/tamaño de archivo, alertas de uso en Cloudinary):
  más simple, cero dependencias nuevas, pero no impide que un script automatizado suba contenido
  igual — solo acota el daño. Se descarta como solución única porque el usuario pidió cerrar el
  hueco de verdad, no solo mitigarlo.
- **Rate limiting nativo de Cloudflare** (WAF/Rate Limiting Rules) en vez de o además de Turnstile:
  requiere que el Worker esté detrás de un dominio propio en la zona de Cloudflare — hoy corre en
  `*.workers.dev`, donde esas reglas no aplican igual. Queda como mejora futura si el proyecto suma
  un dominio propio.

## Impacto

- **Datos/esquema**: sin cambios en tags/context de Cloudinary (ADR-002) — solo cambia *cómo* se
  autoriza la subida, no qué se guarda.
- **Frontend público** (`apps/public`): ahora **sí** depende del Worker para poder subir (cambia lo
  que decía ADR-001: "el frontend público no consume el Worker en absoluto"). Si el Worker está
  caído, no se puede enviar ninguna foto nueva — el resto de la app (Mural, elección de frase, etc.)
  sigue funcionando igual. Agregar el widget de Turnstile (site key pública) al paso de
  consentimiento, y reescribir `useCloudinaryUpload.js` para pedir la firma antes de subir.
- **Worker**: nueva ruta `POST /upload/sign`, sin autenticación de GitHub (a diferencia de
  `/moderation/*`) — la autorización acá es el propio token de Turnstile, no un permiso de repo.
  Nuevo secret de Cloudflare: `TURNSTILE_SECRET_KEY`.
- **CI/CD**: nueva variable no secreta `VITE_TURNSTILE_SITE_KEY` (build de `apps/public`) y nuevo
  secret `TURNSTILE_SECRET_KEY` (deploy del Worker) — el usuario tiene que crear el widget de
  Turnstile en el dashboard de Cloudflare y cargar ambos valores, documentado en el RUNBOOK.
- **Testing**: verificar que un `POST /upload/sign` sin token de Turnstile (o con uno inválido) se
  rechaza sin firmar nada; que el flujo real (Turnstile real + subida) sigue funcionando end-to-end.

## Riesgos abiertos

Ninguno de negocio. Turnstile en sí es gratis sin límite de uso conocido para este volumen; si
alguna vez Cloudflare le pusiera un tope, es un ajuste de configuración, no de arquitectura.
