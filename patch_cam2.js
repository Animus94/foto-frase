const fs = require('fs');
let content = fs.readFileSync('apps/public/src/components/CameraCapture.vue', 'utf8');

const regex = /<div class="ff-camera-frame">[\s\S]*?<\/div>/;

const replacement = '<div class="ff-camera-frame">\n          <video\n            ref="videoRef"\n            autoplay\n            playsinline\n            muted\n            :class="{ \'is-mirrored\': mirrorPreview }"\n          />\n          <!-- Marco Overlay -->\n          <div v-if="selectedMarco?.url" class="absolute inset-0 pointer-events-none z-10" style="background-size: cover; background-position: center;" :style="{ backgroundImage: \'url(\' + selectedMarco.url + \')\' }"></div>\n          \n          <!-- Marco Controls -->\n          <div v-if="marcos.length > 0" class="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4 z-20">\n            <button type="button" class="bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm" @click="prevMarco"><</button>\n            <span class="bg-black/50 text-white px-3 py-1 rounded-lg text-sm backdrop-blur-sm">{{ selectedMarco?.label || \'Base\' }}</span>\n            <button type="button" class="bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm" @click="nextMarco">></button>\n          </div>\n        </div>';

content = content.replace(regex, replacement);

const galleryTarget = /<div class="flex flex-col items-center justify-center gap-4 py-8">/;
const galleryReplacement = '<div class="flex flex-col items-center justify-center gap-4 py-8">\n        <div v-if="marcos.length > 0" class="flex flex-col items-center gap-2 mb-4">\n          <p class="text-sm text-emerald-200">Elegí un marco para tu foto:</p>\n          <div class="flex items-center gap-4">\n            <button type="button" class="bg-emerald-900/50 text-emerald-200 rounded-full w-10 h-10 flex items-center justify-center border border-emerald-700" @click="prevMarco"><</button>\n            <span class="text-white font-bold min-w-[120px] text-center">{{ selectedMarco?.label || \'Base\' }}</span>\n            <button type="button" class="bg-emerald-900/50 text-emerald-200 rounded-full w-10 h-10 flex items-center justify-center border border-emerald-700" @click="nextMarco">></button>\n          </div>\n          <div v-if="selectedMarco?.url" class="w-32 h-48 border-2 border-emerald-700/50 rounded-lg overflow-hidden mt-2 relative">\n            <div class="absolute inset-0 bg-slate-800"></div>\n            <div class="absolute inset-0 bg-cover bg-center" :style="{ backgroundImage: \'url(\' + selectedMarco.url + \')\' }"></div>\n          </div>\n        </div>';

content = content.replace(galleryTarget, galleryReplacement);

fs.writeFileSync('apps/public/src/components/CameraCapture.vue', content);
