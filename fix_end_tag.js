const fs = require('fs');
let c = fs.readFileSync('apps/public/src/components/PhotoAdjuster.vue', 'utf8');
c = c.replace(/<\/template>\s*<\/template>/, '</template>\n');
fs.writeFileSync('apps/public/src/components/PhotoAdjuster.vue', c);
