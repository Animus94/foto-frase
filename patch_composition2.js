const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'apps/public/src/composables/useCanvasComposition.js');
let content1 = fs.readFileSync(file1, 'utf8');

// Update useCanvasComposition.js
content1 = content1.replace(
  /async function composeSubmissionImage\(\{\s*source,\s*sourceWidth,\s*sourceHeight,\s*variant,\s*phrasePrefix,\s*phraseLabel,\s*stickerName,\s*mirror = false,\s*marco,\s*cropTransform,\s*\}\) \{/,
  `async function composeSubmissionImage({
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
  }) {`
);

content1 = content1.replace(
  /if \(marcoImg\) \{\s*ctx\.drawImage\(marcoImg, 0, 0, width, height\)\s*\}/,
  `if (marcoImg) {
        ctx.drawImage(marcoImg, 0, 0, width, height)
        if (marco.config) {
          drawMarcoConfiguredText(ctx, width, height, phrasePrefix + ' ' + phraseLabel, sanitizedStickerName, marco.config)
        }
      }`
);

content1 = content1.replace(
  /drawCaptionStripe\(ctx, width, height, phrasePrefix, phraseLabel\)\s*const \{ pillWidth: watermarkPillWidth \} = drawWatermark\(ctx, width, height, logo\)\s*\/\/ REQ-002[^\n]*\s*\/\/ as long as[^\n]*\s*if \(sanitizedStickerName\) \{\s*drawNameSticker\(ctx, width, height, sanitizedStickerName, watermarkPillWidth\)\s*\}/,
  `if (!marcoImg && phraseId === 'amigos') {
        drawCaptionStripe(ctx, width, height, phrasePrefix, phraseLabel)
        const { pillWidth: watermarkPillWidth } = drawWatermark(ctx, width, height, logo)
        if (sanitizedStickerName) {
          drawNameSticker(ctx, width, height, sanitizedStickerName, watermarkPillWidth)
        }
      }`
);

fs.writeFileSync(file1, content1, 'utf8');

const file2 = path.join(__dirname, 'apps/public/src/views/CaptureFlow.vue');
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(
  /variant: VARIANTS\.SELFIE,/,
  `variant: VARIANTS.SELFIE,
        phraseId: selectedPhraseId.value,`
);

const shareInstaMethod = `async function shareInstagram() {
  if (!composed.value?.blob) return
  const file = new File([composed.value.blob], 'foto-marcha.jpg', { type: 'image/jpeg' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Mi foto en la Marcha',
        text: 'Yo tambiǸn me sumo!'
      })
    } catch (e) {
      console.error(e)
    }
  } else {
    // Fallback: download
    const link = document.createElement('a')
    link.href = composed.value.previewUrl
    link.download = 'foto-marcha.jpg'
    link.click()
  }
}

function shareMural() {`;

content2 = content2.replace(/function shareMural\(\) \{/, shareInstaMethod);

const shareInstaBtn = `<button
          class="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg"
          @click="shareInstagram"
        >
          Compartir en Instagram (o descargar)
        </button>

        <button
          class="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-cyan-950/50"`;

content2 = content2.replace(/<button\s*class="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-cyan-950\/50"/, shareInstaBtn);

fs.writeFileSync(file2, content2, 'utf8');

console.log('Patched composition logic and added instagram share');
