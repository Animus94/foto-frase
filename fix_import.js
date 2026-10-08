const fs = require('fs');
let c = fs.readFileSync('apps/backoffice/src/views/PhrasesEditorView.vue', 'utf8');
c = c.replace(
  "import { usePhrasesEditor, slugify } from '../composables/usePhrasesEditor.js'",
  "import { usePhrasesEditor, slugify } from '../composables/usePhrasesEditor.js'\nimport PhraseMarcosManager from './PhraseMarcosManager.vue'"
);
fs.writeFileSync('apps/backoffice/src/views/PhrasesEditorView.vue', c);
