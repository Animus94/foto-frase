const fs = require('fs');
let content = fs.readFileSync('apps/public/src/composables/useCanvasComposition.js', 'utf8');

content = content.replace(
  /phraseLabel,\s+stickerName,\s+mirror = false,\s+\}\) \{/,
  "phraseLabel,\n    stickerName,\n    mirror = false,\n    marco,\n  }) {"
);

fs.writeFileSync('apps/public/src/composables/useCanvasComposition.js', content);
