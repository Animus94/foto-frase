# ADR-002: Modelo de datos, convención de metadata en Cloudinary, composición de imagen y límites client-side

## Requerimientos relacionados

REQ-001

## Decisión

### 1. Esquema de `data/phrases.json` (git-as-backend)

```json
{
  "version": 1,
  "prefix": "Yo voy a la Marcha...",
  "options": [
    { "id": "familia", "label": "Con mi familia", "active": true },
    { "id": "amigos", "label": "Con mis amigos/as", "active": true },
    { "id": "companeros", "label": "Con mis compañeros/as", "active": true },
    { "id": "comision", "label": "Con mi comisión", "active": true },
    { "id": "hijos", "label": "Con mis hijos", "active": true }
  ]
}
```

- `id`: slug estable, **no se reutiliza ni se renombra** una vez publicado (es lo que queda
  referenciado en envíos ya hechos — ver más abajo). Agregar una opción nueva = nuevo objeto con
  `id` nuevo. Retirar una opción = `active: false` (nunca borrar el objeto), para no romper la
  trazabilidad de envíos históricos que la usaron.
- `label`: texto que arma la frase completa junto con `prefix` (`"Yo voy a la Marcha... Con mi
  familia"`). Editable en cualquier momento desde el backoffice sin afectar envíos ya compuestos
  (la imagen ya subida tiene el texto *baked in*, no se re-renderiza).
- El orden del array es el orden de presentación en la UI pública.

### 2. `data/campaign.json` (nuevo, mismo mecanismo git-as-backend)

```json
{
  "version": 1,
  "submissionsCloseAt": "2025-10-15T23:59:59-03:00",
  "maxSubmissionsPerDevice": 4,
  "gridPageSize": 100
}
```

Se separa de `phrases.json` porque son parámetros de campaña (fechas/límites), no frases —
editable por el mismo admin, misma Contents API de GitHub, mismo commit-as-deploy. Fija en
**código/config**, no hardcodeado en el bundle, el corte del 15/10 y el tamaño de página de la
grilla (ya definidos por REQ como 100), para que un cambio de fecha u otro parámetro no requiera
tocar código fuente.

### 3. Convención de tags vs. context en Cloudinary

Cada envío es **una imagen en Cloudinary** con:

**Tags** (usados para *filtrar* — Cloudinary indexa/filtra tags de forma eficiente y son el
mecanismo recomendado para búsquedas frecuentes; `context` libre no está pensado para filtrar a
este volumen sin plan Enterprise de "structured metadata"):

- `marcha-5ta` — namespace fijo de la campaña (por si la cuenta de Cloudinary se reusa para otra
  cosa).
- `moderation:pending` | `moderation:approved` | `moderation:rejected` — estado actual,
  **mutuamente excluyente**; el Worker (ADR-001) es el único que lo cambia (approve/reject
  reemplazan el tag, no lo acumulan).
- `variant:selfie` | `variant:alternative`.
- `mural-public` — **se agrega únicamente en el momento del approve**, nunca en el upload inicial
  ni en pending/rejected. Es el tag que consume el sitio público (ver punto 7 / ADR de listado). Al
  mantenerlo desacoplado de `moderation:approved`, un tag "adivinado" por un tercero
  (`moderation:pending`, por ejemplo) nunca expone contenido no aprobado, aun si se habilita
  listado público por tag a nivel de cuenta (ver riesgo más abajo).

**Context** (metadata de detalle, pensada para lectura/depuración desde el propio dashboard de
Cloudinary o desde el Worker, no para filtrar masivamente):

- `phrase_id`: el `id` de `phrases.json` elegido (trazabilidad/analítica).
- `phrase_text`: **snapshot resuelto** del texto completo ("Yo voy a la Marcha... Con mi familia")
  al momento del envío — se guarda aparte de `phrase_id` porque si mañana se edita o desactiva esa
  opción en `phrases.json`, el envío histórico no debe cambiar de significado ni depender de que el
  `id` siga existiendo.
- `variant`: `"selfie"` | `"alternative"` (duplicado del tag, más cómodo de leer a mano).
- `sticker_name`: nombre de hasta 20 caracteres. **Actualizado por REQ-002**: se dibuja y se guarda para ambas variantes (`selfie` y `alternative`) — originalmente esta ADR lo limitaba a `alternative`, pero REQ-002 pidió que Selfie también pida y muestre el nombre.
- `status`: duplicado legible del tag de moderación.
- `submitted_at`: ISO 8601, generado por el cliente al momento del envío.
- `device_id`: UUID anónimo generado por el dispositivo (ver punto 6) — **solo para uso interno de
  moderación/anti-abuso**, nunca expuesto en el sitio público.
- `moderated_at` / `moderated_by`: completados por el Worker al aprobar/rechazar (`moderated_by` =
  login de GitHub del admin que actuó, resuelto en ADR-001).

Un rechazo **no borra** el asset de Cloudinary (se retagea a `moderation:rejected`, sin
`mural-public`): permite deshacer un error de moderación y mantiene trazabilidad anti-abuso.
**Decisión del usuario**: los envíos rechazados y los pendientes viejos **quedan almacenados sin
límite** (no hay borrado automático ni manual programado) — se archivan tal cual, dentro del plan
Free de Cloudinary del usuario (ver punto 6 y Riesgos abiertos sobre el volumen esperado contra los
límites de ese plan).

Convención de `public_id`/carpeta: `marcha-5ta/submissions/<uuid-v4>` (uuid generado client-side),
para evitar colisiones y mantener namespacing dentro de la cuenta de Cloudinary.

### 4. Composición de imagen client-side (antes de subir)

Pipeline en el navegador, sobre un `<canvas>` fuera de pantalla (nunca se sube el frame crudo de
cámara):

1. Capturar el frame actual del `<video>` (getUserMedia) al canvas, redimensionado a un máximo de
   lado (ej. 1600px) para acotar peso de subida.
2. Dibujar la foto base como primera capa del canvas.
3. Dibujar la **franja de leyenda**: un rectángulo semitransparente de ancho completo en el pie del
   canvas (para garantizar legibilidad sobre cualquier fondo), y sobre esa franja el texto "Yo voy
   a la Marcha... <frase>" (wrap a 2 líneas máx., con reducción automática de tamaño de fuente si
   el texto no entra) — layout exacto a cargo de `frontend-developer`, esta ADR solo fija que va al
   pie y no tapa el centro de la imagen (ya pedido por REQ).
4. Dibujar la **marca de agua** (logo `docs/assets/branding/logo-5ta-marcha-federal.png` + texto
   "#Yo voy") como capa siguiente, en una esquina fija que no se superponga con la franja de
   leyenda del pie.
5. Solo para variante `alternative`: dibujar el **sticker de nombre** (texto del usuario, ≤20
   caracteres, validado tanto por `maxlength` del input como revalidado antes de dibujar) como una
   capa adicional tipo "pill"/badge, en una posición que no choque con la franja del pie.
6. Exportar el canvas final con `canvas.toBlob('image/jpeg', ~0.85)` — **ese Blob compuesto es el
   único que se sube** (unsigned) a Cloudinary; el frame original sin marca de agua nunca sale del
   dispositivo.
7. Antes del envío final, mostrarle al usuario el **resultado ya compuesto** (no la vista de
   cámara cruda) en el paso de consentimiento, para que apruebe exactamente lo que se va a publicar.
8. Fuente tipográfica para el texto dibujado en canvas: **debe estar embebida/bundleada en la PWA**
   (no cargada de un CDN de fuentes en runtime), para que la composición funcione offline y de
   forma determinística — requisito de arquitectura; la elección de familia tipográfica concreta
   queda a criterio de `frontend-developer`.

### 5. Enforcement client-side del límite de envíos y del corte de fecha

- `localStorage` key `ff:mural:device_id` → UUID v4 generado una única vez por dispositivo/navegador
  (persiste entre sesiones, a diferencia del token de GitHub que es sessionStorage — son
  mecanismos distintos para propósitos distintos).
- `localStorage` key `ff:mural:submissions:v1` → array JSON:
  ```json
  [
    { "public_id": "marcha-5ta/submissions/<uuid>", "submitted_at": "<ISO>" }
  ]
  ```
  La longitud del array es el contador. Al alcanzar `maxSubmissionsPerDevice` (de
  `campaign.json`, default 4) se deshabilita el flujo de captura con un mensaje explícito, **antes**
  de intentar el upload (no se depende de que Cloudinary/servidor rechace nada).
- Corte de fecha: al cargar la app pública, comparar `Date.now()` contra `submissionsCloseAt` (de
  `campaign.json`); si ya pasó, ocultar/deshabilitar el flujo de captura y mostrar mensaje de cierre,
  dejando accesible igual el Mural (carrusel + grilla).
- **Explícitamente best-effort**, tal como ya lo asume REQ-001: ambos controles son evadibles
  borrando datos del navegador, usando otro dispositivo/navegador, modo incógnito, o adelantando/
  atrasando el reloj del dispositivo. No se intenta "cerrar" esto del lado servidor porque
  requeriría el backend con estado que la restricción dura del proyecto prohíbe. `device_id` viaja
  también como `context.device_id` en cada upload (punto 3) únicamente para que un admin que
  detecte abuso pueda correlacionar envíos del mismo dispositivo manualmente vía Cloudinary — no
  para bloquear nada de forma automática.

### 6. Paginación de la grilla del Mural (100 casilleros por página) sin base de datos

- Se habilita en la consola de Cloudinary la opción de cuenta **"Resource list"** (listado público
  no firmado por tag), que expone
  `GET https://res.cloudinary.com/<cloud_name>/image/list/mural-public.json` — **sin necesidad de
  API Secret**, apto para ser llamado directo desde `apps/public` en GitHub Pages.
- Es seguro habilitar esta opción de cuenta porque el único tag público-enumerable con contenido
  real es `mural-public`, y ese tag **solo existe en assets ya aprobados** (punto 3) — no hay forma
  de que alguien "adivinando" el nombre de un tag llegue a ver pendientes o rechazados.
- El frontend público pide ese JSON **una vez** (con un cache corto client-side, ej.
  `sessionStorage` con TTL de ~60s, para no repetir el fetch en cada scroll/navegación de página
  dentro de la misma sesión), ordena el array resultante de forma determinística por
  `created_at`/`version`, y pagina **en el propio navegador** cortando el array en bloques de
  `gridPageSize` (100): página 1 = índices 0-99, página 2 = 100-199, etc. El carrusel consume el
  mismo array ya obtenido (no dispara un fetch aparte).
- Esta paginación es 100% client-side sobre un único listado — no hay cursor de servidor
  involucrado en el camino público.

## Alternativas consideradas

- **Guardar la frase solo como `phrase_id` sin snapshot de texto**: descartado — un cambio o
  borrado posterior de esa opción en `phrases.json` cambiaría retroactivamente qué dice un envío ya
  publicado, o lo rompería si el `id` desaparece.
- **Usar únicamente `context` (sin tags) para el estado de moderación**: descartado por rendimiento/
  fiabilidad de filtrado a medida que crece el volumen — `context` no está indexado para búsquedas
  masivas de la misma forma que los tags en el plan usado.
- **Listado público de la grilla vía Cloudinary Search API (firmada) a través del Worker**, en vez
  del listado unsigned por tag: más flexible (paginación real de servidor, sin límite de recursos
  devueltos) pero convierte al Worker en dependencia obligatoria de la página más visitada del
  proyecto (el Mural), contradiciendo el espíritu de "sin servidor propio en runtime" para la parte
  pública. Se deja como **plan de contingencia documentado** (ver Riesgos abiertos), no como
  decisión primaria.
- **Borrar físicamente los envíos rechazados**: descartado como default por falta de reversibilidad
  y de trazabilidad anti-abuso; ver nota de retención en Riesgos abiertos.

## Impacto

- **Datos/esquema**: `data/phrases.json` y `data/campaign.json` con la forma de arriba; convención
  de tags/context de Cloudinary fijada arriba, vinculante para `frontend-developer` (upload) y
  `backoffice-developer` (moderación, vía Worker de ADR-001).
- **Frontend público** (`apps/public`):
  - Leer `phrases.json`/`campaign.json` (fetch estático, son archivos servidos por GitHub Pages).
  - Implementar el pipeline de composición en canvas (punto 4), incluyendo carga de la fuente
    embebida y del logo desde `docs/assets/branding/` (copiado/bundleado como asset del build).
  - Implementar enforcement de límite de 4 y corte de fecha (punto 5).
  - Implementar el fetch unsigned + cache corto + paginación client-side de la grilla, y el
    carrusel reusando el mismo listado (punto 6).
  - Upload unsigned a Cloudinary con el upload preset público, seteando tags/context según la
    convención de este ADR.
- **Backoffice**: al aprobar/rechazar (vía Worker de ADR-001), enviar exactamente los cambios de
  tags/context descritos arriba (agregar/quitar `mural-public`, rotar `moderation:*`, completar
  `moderated_at`/`moderated_by`). Formulario de edición de `phrases.json`/`campaign.json` con altas,
  soft-disable (`active:false`) y edición de `submissionsCloseAt`.
- **CI/CD**: ninguna tarea nueva más allá de que el build de `apps/public` incluya el logo y la
  fuente embebida como assets estáticos versionados en el repo (no descargados en runtime).
- **Testing/QA**:
  - Envío con frase desactivada después (verificar que el snapshot `phrase_text` histórico no
    cambia).
  - Sticker de nombre con exactamente 20/21 caracteres (límite y un caso por encima).
  - Corte de fecha: reloj del dispositivo antes/después de `submissionsCloseAt`, incluyendo el
    instante exacto.
  - 4º envío permitido, intento de 5º bloqueado en el propio cliente sin llamar a Cloudinary.
  - Grilla con 0, 99, 100, 101 y 250 aprobados (paginación en el borde de 100 y con más de una
    grilla completa).
  - Verificar que `GET .../list/moderation:pending.json` (con el tag interno, no `mural-public`)
    **no** devuelve nada útil aunque alguien lo pruebe manualmente — validación de que el tag
    público está desacoplado del tag de estado.

## Riesgos abiertos

- **Límite de recursos devueltos por el endpoint unsigned `list/<tag>.json`**: **confirmado: la
  cuenta usada en esta etapa es plan Free de Cloudinary.** Cloudinary documenta un tope de recursos
  devueltos por este endpoint que varía según plan y puede cambiar con el tiempo; no lo doy por
  buena una cifra de memoria acá — queda como tarea concreta de `deploy-engineer` verificarlo contra
  la documentación vigente de Cloudinary al momento de implementar, y validarlo empíricamente
  (subiendo unos cuantos assets de prueba con el tag `mural-public` y confirmando que el listado los
  devuelve todos) antes de acercarse al volumen real esperado para el 15/10. Como los rechazados y
  pendientes **ahora se sabe que se archivan sin borrarse** (ver Decisión, punto 3), el volumen
  total en la cuenta crece más rápido que solo los aprobados — otro motivo para validar el tope
  temprano. El plan de contingencia ya diseñado (mover el listado público detrás del Worker con
  Search API paginada) sigue en pie si el plan Free no alcanza.
- **Retención de envíos rechazados/pendientes viejos**: **resuelto** — decisión del usuario: no se
  borra nada, queda archivado sin límite de tiempo (ver Decisión, punto 3).
