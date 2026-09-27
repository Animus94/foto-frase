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
  - (b) grilla de "casilleros" que se completan a medida que llegan envíos, hasta un máximo de
    **100** casilleros por grilla; al superarse esa cantidad, se habilita otra grilla a la que se
    accede scrolleando.
- Límite de **4 envíos por persona/dispositivo**, para evitar spam de un mismo usuario.
- Si el admin rechaza un envío: no se le notifica al usuario y no tiene una vía de reintento sobre
  ese mismo envío (queda descartado en silencio).
- Consentimiento: checkbox obligatorio antes de poder enviar, con el texto exacto: *"Al enviar el
  post acepto que la imagen será publicada en una web de acceso público."*
- El Mural público es accesible por cualquiera que tenga la URL, sin ningún control de acceso.
- La app deja de aceptar envíos nuevos después del 15/10 (fecha de la marcha); el Mural público
  (carrusel + grilla) sigue visible después de esa fecha como archivo del evento.
- Marca de agua obligatoria sobre **toda** foto subida (selfie o alternativa): el logo oficial
  (`docs/assets/branding/logo-5ta-marcha-federal.png`) + el texto "#Yo voy", superpuestos como
  marca de agua — el propósito explícito es que la imagen no pueda reutilizarse sin esa marca si
  alguien la descarga o la scrapea, por lo que la marca de agua tiene que quedar **incorporada a la
  imagen que se sube**, no solo mostrada como overlay en la página del Mural.
- Leyenda "Yo voy a la Marcha... <frase elegida>" superpuesta sobre la imagen, ubicada al pie para
  no tapar el centro de la foto.
- Para la alternativa sin selfie, el nombre que el usuario agrega se superpone también sobre la
  imagen (sticker), con un límite de 20 caracteres y sujeto a la misma moderación de contenido que
  la imagen.

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
      completando a medida que hay envíos aprobados, y al llegar a 100 casilleros se habilita una
      grilla siguiente accesible scrolleando.
- [ ] Toda foto subida (selfie o alternativa) queda con el logo oficial + el texto "#Yo voy" como
      marca de agua incorporada a la propia imagen, y con la leyenda "Yo voy a la Marcha... <frase>"
      superpuesta al pie.
- [ ] En la alternativa sin selfie, el nombre agregado por el usuario se superpone a la imagen,
      respeta un máximo de 20 caracteres y es moderado junto con la imagen.
- [ ] El sistema impide un 5º envío desde la misma persona/dispositivo (límite de 4).
- [ ] Un envío rechazado por el admin no genera ningún aviso al usuario ni una vía de reintento
      sobre ese envío.
- [ ] El checkbox de consentimiento muestra exactamente el texto: "Al enviar el post acepto que la
      imagen será publicada en una web de acceso público."
- [ ] Después del 15/10 la app deja de aceptar nuevos envíos, pero el Mural público sigue visible.

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
- **Sin base de datos propia, aplicado al límite de 4 envíos por dispositivo y al corte del
  15/10**: sin un backend con estado, ambos controles solo pueden aplicarse del lado del cliente
  (ej. algo guardado en el propio dispositivo, y una comparación de fecha en el propio código). Esto
  es best-effort: alguien que borre los datos de su navegador o use otro dispositivo puede volver a
  enviar. `architect` debe dejar constancia de esta limitación, no inventar una solución que
  requiera servidor propio para "cerrarla" del todo.

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
4. Resuelto: la frase va como texto superpuesto sobre la imagen, al pie, para no tapar el centro
   de la foto.
5. Se asume que "no se avisa al usuario" ante un rechazo (respuesta del usuario: "NO") implica
   también que no hay ninguna vía de reintento sobre ese envío puntual — la persona simplemente
   podría volver a intentar como un envío nuevo, dentro del límite general de 4 envíos por
   dispositivo. Si esto no es lo que se quiso decir, hay que corregirlo.
6. Se asume que la marca de agua (logo + "#Yo voy") y la leyenda de la frase se aplican sobre la
   imagen en el momento de armar el envío, antes de subirla a Cloudinary (composición del lado del
   cliente), ya que el propósito explícito es que la marca de agua viaje con la imagen aunque se
   descargue — el mecanismo técnico exacto lo define `architect`/`frontend-developer`, esto solo
   fija el resultado esperado.

## Preguntas abiertas

Ninguna. Las dos últimas quedaron resueltas:

- X = **100** casilleros por grilla (a partir del casillero 101 se pasa a una grilla siguiente,
  scrolleando).
- Después del 15/10 solo se bloquean los envíos nuevos; el Mural público (carrusel + grilla) sigue
  visible como archivo del evento.

REQ-001 queda cerrado y listo para pasar a `architect`.
