/**
 * Pure helpers for useCanvasComposition.js, split out so qa-tester can unit
 * test the layout math without needing a real <canvas>/2D context (a fake
 * object exposing `measureText` is enough for `wrapTextToLines`).
 */

/**
 * Scales (sourceWidth, sourceHeight) down so its longest side is at most
 * maxSide, preserving aspect ratio. Never scales up.
 * @param {number} sourceWidth
 * @param {number} sourceHeight
 * @param {number} maxSide
 * @returns {{ width: number, height: number }}
 */
export function computeScaledDimensions(sourceWidth, sourceHeight, maxSide) {
  const longestSide = Math.max(sourceWidth, sourceHeight)
  if (longestSide <= maxSide) {
    return { width: Math.round(sourceWidth), height: Math.round(sourceHeight) }
  }
  const scale = maxSide / longestSide
  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale),
  }
}

/**
 * Greedily wraps `text` into lines that each fit within `maxWidth`, using
 * `ctx.measureText` (only property required from ctx).
 * @param {{ measureText(text: string): { width: number } }} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string[]}
 */
export function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ').filter(Boolean)
  const lines = []
  let currentLine = ''

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

/**
 * Finds the largest font size (within [minFontSize, maxFontSize]) for which
 * `text` wraps into at most `maxLines` lines that each fit within
 * `maxWidth`. Steps the size down until it fits, then re-wraps at the
 * chosen size — the caller applies `ctx.font` before calling and after each
 * probed size change.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {object} options
 * @param {number} options.maxWidth
 * @param {number} options.maxLines
 * @param {number} options.maxFontSize
 * @param {number} options.minFontSize
 * @param {(size: number) => string} options.fontString - builds the `ctx.font` value for a given px size.
 * @returns {{ fontSize: number, lines: string[] }}
 */
export function fitTextToLines(ctx, text, options) {
  const { maxWidth, maxLines, maxFontSize, minFontSize, fontString } = options
  let fontSize = maxFontSize
  let lines = []

  while (fontSize >= minFontSize) {
    ctx.font = fontString(fontSize)
    lines = wrapText(ctx, text, maxWidth)
    const allLinesFit = lines.length <= maxLines && lines.every((line) => ctx.measureText(line).width <= maxWidth)
    if (allLinesFit) break
    fontSize -= 2
  }

  if (fontSize < minFontSize) {
    fontSize = minFontSize
    ctx.font = fontString(fontSize)
    lines = wrapText(ctx, text, maxWidth).slice(0, maxLines)
  }

  return { fontSize, lines }
}

/**
 * Validates the sticker name against REQ-001's 20-character limit. Returns
 * a trimmed, truncated-if-needed value — composeSubmissionImage revalidates
 * with this right before drawing, in addition to the input's `maxlength`.
 * @param {string} name
 * @param {number} [maxLength]
 * @returns {string}
 */
export function sanitizeStickerName(name, maxLength = 20) {
  return (name ?? '').trim().slice(0, maxLength)
}
