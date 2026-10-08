const fs = require('fs');

let grid = fs.readFileSync('apps/public/src/components/MuralGrid.vue', 'utf8');
grid = grid.replace(
  /<div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950\/90 via-slate-950\/40 to-transparent p-2.5 flex items-end">\s*<span class="text-xs font-bold text-cyan-300 truncate">\{\{ photo.sticker_name \|\| 'An[^']*' \}\}<\/span>\s*<\/div>/g,
  '<div v-if="photo.sticker_name" class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2.5 flex items-end">\n              <span class="text-xs font-bold text-cyan-300 truncate">{{ photo.sticker_name }}</span>\n            </div>'
);
fs.writeFileSync('apps/public/src/components/MuralGrid.vue', grid);

let carousel = fs.readFileSync('apps/public/src/components/MuralCarousel.vue', 'utf8');
carousel = carousel.replace(
  /<div>\s*<span class="text-\[10px\] uppercase font-bold tracking-widest text-emerald-400 block mb-0.5">Participante<\/span>\s*<span class="text-base font-bold text-white tracking-wide">\s*\{\{ currentItem.sticker_name \|\| 'An[^']*' \}\}\s*<\/span>\s*<\/div>/,
  '<div v-if="currentItem.sticker_name">\n            <span class="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block mb-0.5">Participante</span>\n            <span class="text-base font-bold text-white tracking-wide">\n              {{ currentItem.sticker_name }}\n            </span>\n          </div>'
);
fs.writeFileSync('apps/public/src/components/MuralCarousel.vue', carousel);
