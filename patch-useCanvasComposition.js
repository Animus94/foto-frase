const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/public/src/composables/useCanvasComposition.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update composeSubmissionImage signature and width/height calculation
content = content.replace(
  /async function composeSubmissionImage\(\{\s*source,\s*sourceWidth,\s*sourceHeight,\s*variant,\s*phrasePrefix,\s*phraseLabel,\s*stickerName,\s*mirror = false,\s*marco,\s*\}\) \{/,
  `async function composeSubmissionImage({
    source,
    sourceWidth,
    sourceHeight,
    variant,
    phrasePrefix,
    phraseLabel,
    stickerName,
    mirror = false,
    marco,
    cropTransform,
  }) {`
);

content = content.replace(
  /const \{ width, height \} = computeScaledDimensions\(sourceWidth, sourceHeight, MAX_SIDE\)/,
  `let width, height;
      if (cropTransform || marco) {
        height = Math.min(MAX_SIDE, Math.max(sourceWidth, sourceHeight));
        width = Math.round(height * 0.75);
      } else {
        const dims = computeScaledDimensions(sourceWidth, sourceHeight, MAX_SIDE);
        width = dims.width;
        height = dims.height;
      }`
);

content = content.replace(
  /drawBasePhoto\(ctx, source, width, height, mirror\)/,
  `drawBasePhoto(ctx, source, sourceWidth, sourceHeight, width, height, mirror, cropTransform)`
);

// 2. Update drawBasePhoto
const targetFunction = `function drawBasePhoto(ctx, source, width, height, mirror) {
  ctx.save()
  if (mirror) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(source, 0, 0, width, height)
  ctx.restore()
}`;

const replacementFunction = `function drawBasePhoto(ctx, source, sourceWidth, sourceHeight, width, height, mirror, cropTransform) {
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
}`;

// Do a robust replace regardless of exact whitespace
content = content.replace(/function drawBasePhoto\(ctx, source, width, height, mirror\) \{[\s\S]*?ctx\.restore\(\)\r?\n\}/, replacementFunction);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched useCanvasComposition.js');
