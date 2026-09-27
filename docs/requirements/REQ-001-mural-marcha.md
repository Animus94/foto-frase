# REQ-001: Mural de la Marcha — selfie/foto + frase con moderación

## Contexto

La campaña "Rumbo a la 5ta Marcha Federal Universitaria" (15/10) necesita una vía digital para que
la gente exprese y muestre públicamente su adhesión antes del evento. La idea es que cualquier
persona, accediendo por QR o por URL, pueda sumar una foto propia (o una alternativa) junto con una
frase de adhesión, y que esos envíos —una vez revisados por un admin— se acumulen en un "Mural"
colectivo visible públicamente, en dos formatos: carrusel y grilla de casilleros.

## Historia de usuario

Como persona convocada a la marcha, quiero sacarme una selfie (o fotografiar un espacio de la
universidad y ponerle mi nombre) y elegir una frase de adhesión ("Yo voy a la Marcha..."), para
sumar mi presencia al Mural colectivo de la campaña antes del 15 de octubre.

## Alcance

**Incluye:**

- Acceso a la app vía QR (distribuido por distintos canales) o vía URL directa.
- Captura de una selfie con la cámara del dispositivo.
- Alternativa a la selfie: fotografiar un espacio de la universidad y agregarle un nombre que se
  superpone a la imagen como texto/sticker.
- Selección de una frase entre una lista predefinida y administrable, bajo la consigna "Yo voy a
  la Marcha...", con las opciones dadas como ejemplo: "Con mi familia", "Con mis amigos/as", "Con
  mis compañeros/as", "Con mi comisión", "Con mis hijos".
- Paso de consentimiento explícito del usuario para compartir y publicar su foto, previo al envío.
- Envío de la foto (selfie o alternativa) + frase elegida, que queda en estado pendiente de
  moderación — no es público automáticamente.
- Aprobación del envío por parte de un admin en el backoffice como condición para pasar a integrar
  el Mural público (para evitar fakes o malas intenciones).
- Web pública del Mural, con URL propia, que muestra los envíos ya aprobados en dos formatos:
  - (a) carrusel/"carrete" que va pasando las fotos.
  - (b) grilla de "casilleros" que se completan a medida que llegan envíos.
- Uso del logo oficial ya disponible en el repo
  (`docs/assets/branding/logo-5ta-marcha-federal.png`) en la app y/o el Mural (alcance exacto: ver
  pregunta abierta).

**No incluye:**

- Diseño detallado de la pantalla/flujo de moderación del backoffice (qué ve el admin, cómo
  aprueba/rechaza) — eso corresponde a un requerimiento o diseño técnico propio para
  `backoffice-developer`; este REQ solo fija que la aprobación del admin es condición necesaria
  para la publicación.
- Definición del mecanismo técnico de moderación/Cloudinary Admin API (ya señalado como riesgo
  abierto de arquitectura en `CLAUDE.md`, a cargo de `architect`).
- Gestión de identidad/autenticación de usuarios finales (no fue mencionada; se asume que no hay
  login de usuario final, más allá del propio flujo de captura y envío).
- Resolución de las preguntas abiertas listadas más abajo.

## Criterios de aceptación

- [ ] El usuario puede ingresar a la app escaneando un QR o accediendo por una URL directa.
- [ ] Al ingresar, el usuario puede tomar una selfie con la cámara del dispositivo.
- [ ] Como alternativa a la selfie, el usuario puede fotografiar un espacio de la universidad y
      agregarle un nombre que se superpone a la imagen como texto/sticker.
- [ ] El usuario selecciona una frase de una lista predefinida y administrable, bajo la consigna
      "Yo voy a la Marcha...", con al menos las opciones: "Con mi familia", "Con mis amigos/as",
      "Con mis compañeros/as", "Con mi comisión", "Con mis hijos".
- [ ] El usuario debe dar un consentimiento explícito para compartir y publicar su foto antes de
      poder completar el envío; sin ese consentimiento, el envío no se puede enviar.
- [ ] Al enviar, la foto (selfie o alternativa) + frase elegida quedan en estado "pendiente de
      moderación" y no son visibles en el Mural público todavía.
- [ ] Un admin puede aprobar el envío desde el backoffice; solo tras esa aprobación el envío pasa a
      integrar el Mural público.
- [ ] Existe una web pública del Mural, accesible por su propia URL, que muestra únicamente
      envíos aprobados.
- [ ] En esa web, el Mural puede visualizarse como carrusel que va pasando las fotos aprobadas.
- [ ] En esa misma web, el Mural puede visualizarse también como grilla de casilleros que se van
      completando a medida que hay envíos aprobados.

## Restricciones aplicables

- **Sin base de datos propia**: las frases predefinidas y administrables de este requerimiento se
  resuelven vía git-as-backend (`data/phrases.json` o similar); cada envío (foto + frase + estado
  de moderación) se resuelve como imagen + metadata en Cloudinary, sin BD separada.
- **Hosteable 100% en GitHub Pages**: tanto la app de captura/envío como la web pública del Mural
  deben poder servirse como sitio estático.
- **Upload unsigned a Cloudinary** desde el navegador del usuario final; las operaciones
  privilegiadas de moderación (listar pendientes, aprobar/rechazar) dependen del mecanismo que
  `architect` defina para no exponer el API Secret de Cloudinary — este REQ da por sentado que ese
  mecanismo existirá, pero no lo especifica.

## Supuestos

Marcados explícitamente como supuestos del analista, no como decisiones del usuario:

1. Se asume que existe **un único Mural** para toda la campaña (no uno por sede, comisión o
   canal de difusión), ya que el usuario no mencionó ninguna fragmentación.
2. Se asume que la aprobación del admin es la **única** condición para que un envío pase a ser
   público (no hay un paso intermedio adicional, como una revisión en dos etapas).
3. Se asume que las dos vías de imagen mencionadas (selfie y foto de un espacio de la universidad)
   son captura en vivo con la cámara del dispositivo, y que **no** existe una opción de subir una
   foto ya existente desde la galería del dispositivo — el usuario habló de "sacarse una selfie" y
   "sacar una foto", no de adjuntar un archivo.
4. Se asume que la frase elegida ("Yo voy a la Marcha... + opción") queda asociada al envío y se
   muestra junto con la foto en el Mural, aunque el mecanismo visual exacto (si va como texto
   superpuesto sobre la imagen, como caption debajo, etc.) no fue definido por el usuario — ver
   pregunta abierta agregada al final.

## Preguntas abiertas

Estas preguntas surgen directamente de lo que el usuario contó y no fueron resueltas por él; se
listan tal cual para repreguntarle:

1. ¿El logo de la marcha se superpone como marca/frame sobre cada foto que se sube al Mural, o es
   solo material de branding para la UI de la app (splash, header, etc.)?
2. ¿La grilla de "casilleros" tiene una cantidad fija de casilleros (por ejemplo, representando un
   objetivo de X asistentes) o crece sin límite a medida que llegan envíos?
3. ¿Qué pasa con un envío rechazado por el admin? ¿Se le avisa al usuario? ¿Puede reintentar?
4. ¿La lista de frases predefinidas admite además una opción de texto libre, o es estrictamente de
   opción múltiple cerrada?
5. ¿Cuál es el límite de caracteres y la validación de contenido para el nombre que se superpone
   como sticker en la alternativa sin selfie (moderación de texto libre, no solo de imagen)?
6. ¿Hay algún límite de envíos por persona/dispositivo, para evitar spam de un mismo usuario?
7. ¿Cuál es el texto exacto que se le muestra al usuario para el consentimiento? (¿Hace falta
   aceptar términos y condiciones formales, uso de imagen con fines de la campaña, etc.?)
8. ¿Hasta cuándo queda funcionando la app: solo hasta el 15/10, o sigue después como archivo del
   evento?
9. ¿El Mural público (carrusel + grilla) es accesible por cualquiera con la URL, o requiere algún
   tipo de acceso?
10. *(Adicional, detectada por el analista)* ¿Cómo se muestra la frase elegida junto a la foto en
    el Mural — como texto superpuesto sobre la imagen, como caption/leyenda debajo, solo visible al
    tocar la foto, u otra forma?
