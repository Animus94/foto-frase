import { ref } from 'vue'
import {
  computeScaledDimensions,
  fitTextToLines,
  sanitizeStickerName,
} from './canvasCompositionHelpers.js'

// Bundled as build-time assets (ADR-002 §4.8 / §3 impact): the watermark
// font must be embedded, never loaded from a fonts CDN at runtime, so
// composition works offline and deterministically.
import fontUrl from '@/assets/fonts/NotoSans-Bold-subset.woff2?url'
import logoUrl from '@/assets/branding/logo-5ta-marcha-federal.png?url'

const FONT_FAMILY = 'FF Composition'
const MAX_SIDE = 1600
const JPEG_QUALITY = 0.85
const STICKER_MAX_LENGTH = 20

let fontLoadPromise = null
let logoLoadPromise = null

/** Loads and registers the embedded composition font exactly once. */
function loadCompositionFont() {
  if (!fontLoadPromise) {
    fontLoadPromise = (async () => {
      const face = new FontFace(FONT_FAMILY, `url(${fontUrl})`)
      await face.load()
      document.fonts.add(face)
      return face
    })()
  }
  return fontLoadPromise
}

/** Loads the official campaign logo image exactly once. */

function loadMarcoImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar el marco'))
    img.src = url
  })
}

function loadLogoImage() {
  if (!logoLoadPromise) {
    logoLoadPromise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('No se pudo cargar el logo de marca de agua'))
      img.src = logoUrl
    })
  }
  return logoLoadPromise
}

/**
 * Client-side image composition pipeline (ADR-002 §4): base photo → bottom
 * caption stripe with the chosen phrase → logo + "#Yo voy" watermark in a
 * corner clear of the stripe → name sticker in the opposite corner whenever
 * a name was entered (REQ-002 §1/§2: both variants now, not just
 * "alternative"). The exported JPEG Blob is the ONLY image that ever leaves
 * the device — the raw camera frame is never uploaded.
 */
export function useCanvasComposition() {
  const isComposing = ref(false)
  const error = ref(null)

  /**
   * @param {object} params
   * @param {CanvasImageSource} params.source - live <video> frame or fallback <img>.
   * @param {number} params.sourceWidth
   * @param {number} params.sourceHeight
   * @param {'selfie'|'alternative'} params.variant
   * @param {string} params.phrasePrefix - fixed campaign prefix, e.g. "Yo voy a la Marcha...".
   * @param {string} params.phraseLabel - the chosen phrase option's label, e.g. "Con mi familia".
   * @param {string} [params.stickerName] - name-sticker text (REQ-002 §1/§2: collected and drawn
   *   for BOTH variants now, not just "alternative" — drawn whenever non-empty).
   * @param {boolean} [params.mirror] - true to horizontally flip the base photo (typical selfie preview behavior).
   * @returns {Promise<{ blob: Blob, previewUrl: string, width: number, height: number }>}
   */
  async function composeSubmissionImage({
    source,
    sourceWidth,
    sourceHeight,
    variant,
    phraseId,
    phrasePrefix,
    phraseLabel,
    stickerName,
    mirror = false,
    marco,
    cropTransform,
  }) {
    isComposing.value = true
    error.value = null
    try {
      const sanitizedStickerName = sanitizeStickerName(stickerName, STICKER_MAX_LENGTH)

      const [, logo, marcoImg] = await Promise.all([
          loadCompositionFont(),
          loadLogoImage(),
          marco?.url ? loadMarcoImage(marco.url) : Promise.resolve(null)
        ])

      let width, height;
      if (cropTransform || marco) {
        height = Math.min(MAX_SIDE, Math.max(sourceWidth, sourceHeight));
        width = Math.round(height * 0.75);
      } else {
        const dims = computeScaledDimensions(sourceWidth, sourceHeight, MAX_SIDE);
        width = dims.width;
        height = dims.height;
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      drawBasePhoto(ctx, source, sourceWidth, sourceHeight, width, height, mirror, cropTransform)
      if (marcoImg) {
        ctx.drawImage(marcoImg, 0, 0, width, height)
        if (marco.config) {
          drawMarcoConfiguredText(ctx, width, height, phrasePrefix + ' ' + phraseLabel, sanitizedStickerName, marco.config)
        }
      }
      if (!marcoImg && phraseId === 'amigos') {
        drawCaptionStripe(ctx, width, height, phrasePrefix, phraseLabel)
        const { pillWidth: watermarkPillWidth } = drawWatermark(ctx, width, height, logo)
        if (sanitizedStickerName) {
          drawNameSticker(ctx, width, height, sanitizedStickerName, watermarkPillWidth)
        }
      }

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('No se pudo exportar la imagen'))),
          'image/jpeg',
          JPEG_QUALITY,
        )
      })
      const previewUrl = URL.createObjectURL(blob)
      return { blob, previewUrl, width, height }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isComposing.value = false
    }
  }

  return { composeSubmissionImage, isComposing, error }
}

function drawBasePhoto(ctx, source, sourceWidth, sourceHeight, width, height, mirror, cropTransform) {
  ctx.save()
  if (cropTransform) {
    const { panX, panY, scale, containerWidth, containerHeight } = cropTransform
    const canvasScale = width / containerWidth
    
    // Simulate object-fit: cover sizing
    const coverScale = Math.max(containerWidth / sourceWidth, containerHeight / sourceHeight)
    const drawW = sourceWidth * coverScale
    const drawH = sourceHeight * coverScale
    
    // DOM centers the element then applies pan/scale.
    ctx.translate(width / 2, height / 2)
    ctx.translate(panX * canvasScale, panY * canvasScale)
    ctx.scale(scale, scale)
    
    if (mirror) {
      ctx.scale(-1, 1)
    }
    
    const finalW = drawW * canvasScale
    const finalH = drawH * canvasScale
    
    ctx.drawImage(source, -finalW / 2, -finalH / 2, finalW, finalH)
  } else {
    if (mirror) {
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(source, 0, 0, width, height)
  }
  ctx.restore()
}

function drawCaptionStripe(ctx, width, height, phrasePrefix, phraseLabel) {
  const padding = Math.round(width * 0.05)
  const maxFontSize = Math.round(height * 0.052)
  const minFontSize = Math.round(height * 0.026)
  const maxLines = 2
  const lineHeightFactor = 1.25

  const { fontSize, lines } = fitTextToLines(ctx, phraseLabel, {
    maxWidth: width - padding * 2,
    maxLines,
    maxFontSize,
    minFontSize,
    fontString: (size) => `bold ${size}px "${FONT_FAMILY}"`,
  })
  const lineHeight = fontSize * lineHeightFactor
  const stripePadding = Math.round(fontSize * 0.7)

  // REQ-002 §5: the fixed "Yo voy a la Marcha..." prefix gets its own
  // tag/hashtag look — solid pill, uppercase, bold, a bit smaller than the
  // phrase — visually separated from the freely-chosen phrase below it,
  // which keeps the exact plain-text style it already had. This is a
  // distinct element from the logo/"#Yo voy" watermark (untouched here).
  const tagFontSize = Math.max(Math.round(fontSize * 0.6), 14)
  ctx.font = `bold ${tagFontSize}px "${FONT_FAMILY}"`
  const tagText = phrasePrefix.toUpperCase()
  const tagTextWidth = ctx.measureText(tagText).width
  const tagPaddingX = Math.round(tagFontSize * 0.65)
  const tagPaddingY = Math.round(tagFontSize * 0.45)
  const tagPillWidth = Math.min(tagTextWidth + tagPaddingX * 2, width - padding * 2)
  const tagPillHeight = tagFontSize + tagPaddingY * 2
  const tagGap = Math.round(fontSize * 0.4)

  const phraseBlockHeight = lines.length * lineHeight
  const stripeHeight = stripePadding * 2 + tagPillHeight + tagGap + phraseBlockHeight

  // Semi-transparent full-width stripe at the bottom, so the caption stays
  // legible over any photo background (ADR-002 §4.3) without covering the
  // center of the photo.
  const stripeTop = height - stripeHeight
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(0, stripeTop, width, stripeHeight)

  // Tag/chip for the prefix.
  const tagPillX = width / 2 - tagPillWidth / 2
  const tagPillY = stripeTop + stripePadding
  drawRoundedRect(ctx, tagPillX, tagPillY, tagPillWidth, tagPillHeight, tagPillHeight / 2, '#358e3d')
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${tagFontSize}px "${FONT_FAMILY}"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(tagText, width / 2, tagPillY + tagPillHeight / 2, tagPillWidth - tagPaddingX)

  // Plain-text phrase, same style as before.
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${fontSize}px "${FONT_FAMILY}"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const firstLineY = tagPillY + tagPillHeight + tagGap + lineHeight / 2
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, firstLineY + index * lineHeight)
  })
}

function drawWatermark(ctx, width, height, logo) {
  // Top-right corner: never collides with the bottom caption stripe, and
  // stays clear of the name sticker in the opposite (top-left) corner
  // (drawNameSticker uses this pill's width, returned below, to guarantee
  // that gap).
  // REQ-002 §3: sized up noticeably from the original (logoHeight 0.06 → 0.095,
  // fontSize 0.024 → 0.038 of height) while staying anchored to the top-right
  // corner, clear of both the photo's center and the bottom caption stripe.
  const margin = Math.round(width * 0.03)
  const logoHeight = Math.round(height * 0.095)
  const logoWidth = Math.round(logoHeight * (logo.naturalWidth / logo.naturalHeight))
  const fontSize = Math.max(Math.round(height * 0.038), 20)
  const label = '#Yo voy'

  ctx.font = `bold ${fontSize}px "${FONT_FAMILY}"`
  const labelWidth = ctx.measureText(label).width

  const innerPaddingX = Math.round(fontSize * 0.6)
  const innerPaddingY = Math.round(fontSize * 0.5)
  const gap = Math.round(fontSize * 0.5)

  const pillWidth = innerPaddingX * 2 + logoWidth + gap + labelWidth
  const pillHeight = Math.max(logoHeight, fontSize) + innerPaddingY * 2
  const pillX = width - margin - pillWidth
  const pillY = margin

  drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2, 'rgba(0, 0, 0, 0.45)')

  const logoX = pillX + innerPaddingX
  const logoY = pillY + (pillHeight - logoHeight) / 2
  ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight)

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, logoX + logoWidth + gap, pillY + pillHeight / 2)

  return { pillWidth }
}

function drawNameSticker(ctx, width, height, name, watermarkPillWidth) {
  // Top-left corner: clear of both the bottom stripe and the top-right
  // watermark.
  // REQ-002 §4: sized up noticeably (fontSize 0.026 → 0.042 of height), same
  // top-left placement so it stays clear of the bottom caption stripe. Names
  // are user-typed (up to 20 chars) so, unlike the watermark, the pill width
  // here isn't fixed — at this larger size a long name can get close to the
  // watermark pill on narrower photos. `watermarkPillWidth` bounds how much
  // room is actually free, and the font shrinks (then truncates as a last
  // resort) to always leave a clear gap between the two.
  const margin = Math.round(width * 0.03)
  const maxFontSize = Math.max(Math.round(height * 0.042), 22)
  const minFontSize = Math.max(Math.round(height * 0.022), 14)
  const safetyGap = Math.round(width * 0.04)
  const maxPillWidth = Math.max(
    width - margin * 2 - watermarkPillWidth - safetyGap,
    Math.round(width * 0.22),
  )

  let fontSize = maxFontSize
  let paddingX = Math.round(fontSize * 0.7)
  let textWidth = 0
  let pillWidth = 0
  for (;;) {
    ctx.font = `bold ${fontSize}px "${FONT_FAMILY}"`
    paddingX = Math.round(fontSize * 0.7)
    textWidth = ctx.measureText(name).width
    pillWidth = textWidth + paddingX * 2
    if (pillWidth <= maxPillWidth || fontSize <= minFontSize) break
    fontSize -= 1
  }

  let renderedName = name
  if (pillWidth > maxPillWidth) {
    // Still doesn't fit even at the minimum font size: truncate with an
    // ellipsis rather than let it overlap the watermark.
    while (renderedName.length > 1) {
      renderedName = renderedName.slice(0, -1)
      const candidate = `${renderedName}…`
      textWidth = ctx.measureText(candidate).width
      pillWidth = textWidth + paddingX * 2
      if (pillWidth <= maxPillWidth) {
        renderedName = candidate
        break
      }
    }
  }

  const paddingY = Math.round(fontSize * 0.5)
  const pillHeight = fontSize + paddingY * 2

  drawRoundedRect(ctx, margin, margin, pillWidth, pillHeight, pillHeight / 2, 'rgba(53, 142, 61, 0.85)')

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(renderedName, margin + paddingX, margin + pillHeight / 2)
}

function drawRoundedRect(ctx, x, y, w, h, radius, fillStyle) {
  const r = Math.min(radius, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fillStyle = fillStyle
  ctx.fill()
}

function drawMarcoConfiguredText(ctx, width, height, phraseText, nameText, config) {
  // Config coords are in %, fontSizes are based on a 450x600 reference
  const scale = height / 600;

  // Draw Phrase
  if (config.phrase) {
    ctx.save();
    const x = (config.phrase.x / 100) * width;
    const y = (config.phrase.y / 100) * height;
    const fontSize = (config.phrase.fontSize || 24) * scale;
    const curve = config.phrase.curve || 0;
    
    ctx.font = `${fontSize}px "${config.phrase.font || 'Montserrat'}"`;
    ctx.fillStyle = config.phrase.color || '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (curve === 0) {
      ctx.fillText(phraseText, x, y);
    } else {
      drawCurvedText(ctx, phraseText, x, y, fontSize, curve);
    }
    ctx.restore();
  }

  // Draw Name
  if (config.name && nameText) {
    ctx.save();
    const x = (config.name.x / 100) * width;
    const y = (config.name.y / 100) * height;
    const fontSize = (config.name.fontSize || 16) * scale;
    
    ctx.font = `${fontSize}px "${config.name.font || 'Montserrat'}"`;
    const textWidth = ctx.measureText(nameText).width;
    const paddingX = fontSize * 0.5;
    const paddingY = fontSize * 0.3;
    const w = textWidth + paddingX * 2;
    const h = fontSize + paddingY * 2;
    
    // Background
    if (config.name.bgColor && config.name.bgColor !== 'transparent') {
      ctx.fillStyle = config.name.bgColor;
      drawRoundedRect(ctx, x - w/2, y - h/2, w, h, 8);
    }
    
    ctx.fillStyle = config.name.textColor || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nameText, x, y);
    ctx.restore();
  }
}

function drawCurvedText(ctx, text, x, y, fontSize, curve) {
  const len = text.length;
  // match the designer logic
  const L = len * fontSize * 0.45;
  const angleRad = (Math.abs(curve) * Math.PI) / 180;
  const R = angleRad > 0.01 ? L / angleRad : 10000;
  const isRainbow = curve > 0;
  
  ctx.save();
  ctx.translate(x, y);
  
  // if rainbow, origin is R below. So we move down by R, then rotate around it.
  const originY = isRainbow ? R : -R;
  ctx.translate(0, originY);
  
  for (let i = 0; i < len; i++) {
    ctx.save();
    const anglePerChar = curve / (len - 1 || 1);
    const startAngle = -curve / 2;
    const angle = startAngle + i * anglePerChar;
    
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(0, -originY);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
