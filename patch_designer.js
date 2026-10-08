const fs = require('fs');
let c = fs.readFileSync('apps/backoffice/src/views/PhraseMarcoDesigner.vue', 'utf8');

c = c.replace(
  /const props = defineProps\(\{\s*marco: \{ type: Object, required: true \},?\s*\}\)/,
  `const props = defineProps({
  marco: { type: Object, required: true },
  phraseLabel: { type: String, default: 'Con mis amigos/as' },
  prefix: { type: String, default: 'Yo voy a la Marcha...' }
})`
);

c = c.replace(
  /<template v-if="!config\.phrase\.curve \|\| config\.phrase\.curve === 0">\s*Yo voy a la marcha\.\.\.\s*<\/template>/,
  `<template v-if="!config.phrase.curve || config.phrase.curve === 0">
                {{ props.prefix }} {{ props.phraseLabel }}
              </template>`
);

c = c.replace(
  /v-for="\(char, i\) in 'Yo voy a la marcha\.\.\.'.split\(''\)"/g,
  `v-for="(char, i) in (props.prefix + ' ' + props.phraseLabel).trim().split('')"`
);

// We need to replace the length of 'Yo voy a la marcha...' which was hardcoded to 21 in getCharStyle calls inside the template
c = c.replace(
  /:style="getCharStyle\(i, 21, config.phrase.curve, config.phrase.fontSize\)"/g,
  `:style="getCharStyle(i, (props.prefix + ' ' + props.phraseLabel).trim().length, config.phrase.curve, config.phrase.fontSize)"`
);

c = c.replace(
  />\s*Nombre del Participante\s*<\/div>/,
  `> Tu Nombre o Agrupación </div>`
);

fs.writeFileSync('apps/backoffice/src/views/PhraseMarcoDesigner.vue', c);
