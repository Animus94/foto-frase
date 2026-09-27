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
 * corner clear of the stripe → (alternative variant only) name sticker in
 * the opposite corner. The exported JPEG Blob is the ONLY image that ever
 * leaves the device — the raw camera frame is never uploaded.
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
   * @param {string} params.phraseText - full resolved sentence, e.g. "Yo voy a la Marcha... Con mi familia".
   * @param {string} [params.stickerName] - required for variant "alternative".
   * @param {boolean} [params.mirror] - true to horizontally flip the base photo (typical selfie preview behavior).
   * @returns {Promise<{ blob: Blob, previewUrl: string, width: number, height: number }>}
   */
  async function composeSubmissionImage({
    source,
    sourceWidth,
    sourceHeight,
    variant,
    phraseText,
    stickerName,
    mirror = false,
  }) {
    isComposing.value = true
    error.value = null
    try {
      if (variant === 'alternative') {
        const sanitized = sanitizeStickerName(stickerName, STICKER_MAX_LENGTH)
        if (!sanitized) {
          throw new Error('El nombre del sticker es obligatorio para la variante alternativa')
        }
        stickerName = sanitized
      }

      const [, logo] = await Promise.all([loadCompositionFont(), loadLogoImage()])

      const { width, height } = computeScaledDimensions(sourceWidth, sourceHeight, MAX_SIDE)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      drawBasePhoto(ctx, source, width, height, mirror)
      drawCaptionStripe(ctx, width, height, phraseText)
      drawWatermark(ctx, width, height, logo)
      if (variant === 'alternative') {
        drawNameSticker(ctx, width, height, stickerName)
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

function drawBasePhoto(ctx, source, width, height, mirror) {
  ctx.save()
  if (mirror) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(source, 0, 0, width, height)
  ctx.restore()
}

function drawCaptionStripe(ctx, width, height, phraseText) {
  const padding = Math.round(width * 0.05)
  const maxFontSize = Math.round(height * 0.052)
  const minFontSize = Math.round(height * 0.026)
  const maxLines = 2
  const lineHeightFactor = 1.25

  const { fontSize, lines } = fitTextToLines(ctx, phraseText, {
    maxWidth: width - padding * 2,
    maxLines,
    maxFontSize,
    minFontSize,
    fontString: (size) => `bold ${size}px "${FONT_FAMILY}"`,
  })

  const lineHeight = fontSize * lineHeightFactor
  const stripePadding = Math.round(fontSize * 0.7)
  const stripeHeight = lines.length * lineHeight + stripePadding * 2

  // Semi-transparent full-width stripe at the bottom, so the caption stays
  // legible over any photo background (ADR-002 §4.3) without covering the
  // center of the photo.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(0, height - stripeHeight, width, stripeHeight)

  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${fontSize}px "${FONT_FAMILY}"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const firstLineY = height - stripeHeight + stripePadding + lineHeight / 2
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, firstLineY + index * lineHeight)
  })
}

function drawWatermark(ctx, width, height, logo) {
  // Top-right corner: never collides with the bottom caption stripe, and
  // (when variant is "alternative") stays clear of the name sticker in the
  // opposite (top-left) corner.
  const margin = Math.round(width * 0.03)
  const logoHeight = Math.round(height * 0.06)
  const logoWidth = Math.round(logoHeight * (logo.naturalWidth / logo.naturalHeight))
  const fontSize = Math.max(Math.round(height * 0.024), 14)
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
}

function drawNameSticker(ctx, width, height, name) {
  // Top-left corner: clear of both the bottom stripe and the top-right
  // watermark.
  const margin = Math.round(width * 0.03)
  const fontSize = Math.max(Math.round(height * 0.026), 15)
  ctx.font = `bold ${fontSize}px "${FONT_FAMILY}"`
  const textWidth = ctx.measureText(name).width

  const paddingX = Math.round(fontSize * 0.7)
  const paddingY = Math.round(fontSize * 0.5)
  const pillWidth = textWidth + paddingX * 2
  const pillHeight = fontSize + paddingY * 2

  drawRoundedRect(ctx, margin, margin, pillWidth, pillHeight, pillHeight / 2, 'rgba(53, 142, 61, 0.85)')

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(name, margin + paddingX, margin + pillHeight / 2)
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
