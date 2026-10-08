const fs = require('fs');

let c = fs.readFileSync('apps/public/src/composables/useCanvasComposition.js', 'utf8');

const target1 = `    try {
      const sanitizedStickerName = sanitizeStickerName(stickerName, STICKER_MAX_LENGTH)

      const [, logo, marcoImg] = await Promise.all([
          loadCompositionFont(),
          loadLogoImage(),
          marco?.url ? loadMarcoImage(marco.url) : Promise.resolve(null)
        ])`;

const replace1 = `    try {
      const sanitizedStickerName = sanitizeStickerName(stickerName, STICKER_MAX_LENGTH)

      // Ensure required fonts from marco are loaded
      if (marco?.config) {
         const f1 = marco.config.phrase?.font || 'Montserrat';
         const f2 = marco.config.name?.font || 'Montserrat';
         const families = new Set([f1, f2]);
         for (const family of families) {
           const id = 'font-' + family.replace(/ /g, '');
           if (!document.getElementById(id)) {
             const link = document.createElement('link');
             link.id = id;
             link.rel = 'stylesheet';
             link.href = 'https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + '&display=swap';
             document.head.appendChild(link);
           }
         }
         // wait a bit for browser to parse font
         await new Promise(r => setTimeout(r, 100));
      }

      const [, logo, marcoImg] = await Promise.all([
          loadCompositionFont(),
          loadLogoImage(),
          marco?.url ? loadMarcoImage(marco.url) : Promise.resolve(null)
        ])

      // wait for the actual fonts to load into document.fonts
      if (marco?.config) {
         const f1 = marco.config.phrase?.font || 'Montserrat';
         const f2 = marco.config.name?.font || 'Montserrat';
         await document.fonts.load('16px "' + f1 + '"');
         await document.fonts.load('16px "' + f2 + '"');
      }
`;

const target2 = `      drawBasePhoto(ctx, source, width, height, mirror)
      if (marcoImg) {
        ctx.drawImage(marcoImg, 0, 0, width, height)
      }
      drawCaptionStripe(ctx, width, height, phrasePrefix, phraseLabel)
      const { pillWidth: watermarkPillWidth } = drawWatermark(ctx, width, height, logo)
      // REQ-002 §1/§2: no longer gated by variant — draw it for selfie too,
      // as long as the user actually entered a name.
      if (sanitizedStickerName) {
        drawNameSticker(ctx, width, height, sanitizedStickerName, watermarkPillWidth)
      }`;

const replace2 = `      drawBasePhoto(ctx, source, width, height, mirror, cropTransform)
      if (marcoImg) {
        ctx.drawImage(marcoImg, 0, 0, width, height)
      }

      if (marco?.config) {
        drawMarcoConfiguredText(ctx, width, height, phrasePrefix + ' ' + phraseLabel, sanitizedStickerName, marco.config)
      } else {
        drawCaptionStripe(ctx, width, height, phrasePrefix, phraseLabel)
        const { pillWidth: watermarkPillWidth } = drawWatermark(ctx, width, height, logo)
        if (sanitizedStickerName) {
          drawNameSticker(ctx, width, height, sanitizedStickerName, watermarkPillWidth)
        }
      }`;

const target3 = `function drawBasePhoto(ctx, source, width, height, mirror) {
  ctx.save()
  if (mirror) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(source, 0, 0, width, height)
  ctx.restore()
}`;

const replace3 = `function drawBasePhoto(ctx, source, width, height, mirror, cropTransform) {
  ctx.save()
  
  // Center of canvas
  ctx.translate(width / 2, height / 2);
  
  if (cropTransform) {
    // panX and panY are relative to the container width/height
    const panX = (cropTransform.panX / cropTransform.containerWidth) * width;
    const panY = (cropTransform.panY / cropTransform.containerHeight) * height;
    ctx.translate(panX, panY);
    ctx.scale(cropTransform.scale, cropTransform.scale);
  }

  if (mirror) {
    ctx.scale(-1, 1);
  }

  // Draw centered
  // Since useCanvasCompositionHelpers computes scaled width/height so image fits or covers,
  // we need to mimic the 'object-fit: cover' logic.
  let drawW = width;
  let drawH = height;
  if (source.width && source.height) {
     const scale = Math.max(width / source.width, height / source.height);
     drawW = source.width * scale;
     drawH = source.height * scale;
  }
  ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore()
}`;

const replace4 = `
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
    
    ctx.font = \`\${fontSize}px "\${config.phrase.font || 'Montserrat'}"\`;
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
    
    ctx.font = \`\${fontSize}px "\${config.name.font || 'Montserrat'}"\`;
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
`;


// Append the new functions at the end of the file
c = c.replace(target1, replace1);
c = c.replace(target2, replace2);
c = c.replace(target3, replace3);
c += replace4;

fs.writeFileSync('apps/public/src/composables/useCanvasComposition.js', c);
console.log("Patched composition!");
