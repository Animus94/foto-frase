# REQ-002: Mejoras post-prueba global

## Contexto

Después de la prueba global de punta a punta (REQ-001 ya funcionando en producción), el usuario
pidió seis ajustes de producto/diseño basados en ver la app funcionando de verdad.

## Alcance

**Incluye:**

1. El modo **Selfie** también pide el nombre (sticker), igual que la alternativa de "foto de
   contexto". Antes solo se pedía en esa segunda variante.
2. La marca de agua (logo + "#Yo voy") se agranda.
3. El nombre-sticker se agranda.
4. El prefijo **"Yo voy a la Marcha..."** de la leyenda cambia su estilo visual a look de
   tag/hashtag (chip, color distinto), sin cambiar el texto. La frase elegida después del prefijo
   mantiene su estilo de texto normal. No se toca la marca de agua "#Yo voy" (son dos elementos
   distintos).
5. El Mural se separa en **dos URLs propias**:
   - `/mural` → grilla paginada.
   - `/carrusel` → carrusel.
6. Después de enviar, aparece un botón **"Compartir"** que comparte la URL del Mural (`/mural`) —
   pensado para difundir la campaña, no el envío propio (que puede tardar en aprobarse). Además, el
   propio Mural (`/mural`) tiene que tener un llamado a la acción visible para que quien reciba el
   link también pueda sumar su foto (volver al flujo de captura), ya que hoy esa página es solo de
   lectura.

**No incluye:**

- Cambiar la lista de frases predefinidas ni el resto del flujo de moderación (sin cambios).
- Botones específicos por red social (WhatsApp/Instagram/etc.) — se usa el share nativo del
  dispositivo (Web Share API) con fallback a copiar el link, no una integración por plataforma.

## Criterios de aceptación

- [ ] En la pantalla inicial, "Selfie" también muestra el campo de nombre (mismo límite de 20
      caracteres y misma validación que ya tenía la alternativa).
- [ ] La imagen final compuesta dibuja el nombre-sticker para **ambas** variantes cuando el usuario
      cargó un nombre.
- [ ] La marca de agua y el nombre-sticker se ven notoriamente más grandes que antes, sin invadir
      el centro de la foto ni la franja de la leyenda.
- [ ] El prefijo "Yo voy a la Marcha..." se dibuja con estilo de chip/tag (fondo/color propio,
      diferenciado de la frase), la frase elegida mantiene el estilo de texto plano actual.
- [ ] `/mural` muestra solo la grilla paginada; `/carrusel` muestra solo el carrusel. Ambas rutas
      funcionan como deep-link directo (recarga de página) en producción (GitHub Pages).
- [ ] Tras un envío exitoso, un botón "Compartir" dispara el share nativo del dispositivo (o copia
      el link si el navegador no lo soporta) con la URL de `/mural`.
- [ ] La página `/mural` tiene un botón/llamado a la acción visible para ir a sumar una foto propia.

## Restricciones aplicables

Ninguna nueva — sigue dentro de lo ya fijado en `CLAUDE.md` (sin base de datos, hosteable en
GitHub Pages). El fallback de deep-link de GitHub Pages (`docs/deploy/404.html`) ya cubre cualquier
ruta nueva dentro de `apps/public` sin cambios, porque no distingue rutas por nombre dentro de esa
app.

## Supuestos

- El botón "Compartir" comparte la URL absoluta de producción de `/mural` (no una relativa), para
  que funcione bien sin importar desde dónde se abra.
- "Agrandar" la marca de agua/nombre queda a criterio de `frontend-developer` en cuánto
  exactamente, mientras sea un salto perceptible y siga sin taparse con la franja de la leyenda.
