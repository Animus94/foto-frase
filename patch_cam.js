const fs = require('fs');
let content = fs.readFileSync('apps/public/src/components/CameraCapture.vue', 'utf8');

const target = \<div class="ff-camera-frame">
          <video
            ref="videoRef"
            autoplay
            playsinline
            muted
            :class="{ 'is-mirrored': mirrorPreview }"
          />
        </div>\;

const replacement = \<div class="ff-camera-frame">
          <video
            ref="videoRef"
            autoplay
            playsinline
            muted
            :class="{ 'is-mirrored': mirrorPreview }"
          />
          <!-- Marco Overlay -->
          <div v-if="selectedMarco?.url" class="absolute inset-0 pointer-events-none z-10" style="background-size: cover; background-position: center;" :style="{ backgroundImage: 'url(' + selectedMarco.url + ')' }"></div>
          
          <!-- Marco Controls -->
          <div v-if="marcos.length > 0" class="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4 z-20">
            <button class="bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm" @click="prevMarco">&lt;</button>
            <span class="bg-black/50 text-white px-3 py-1 rounded-lg text-sm backdrop-blur-sm">{{ selectedMarco?.label || 'Base' }}</span>
            <button class="bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm" @click="nextMarco">&gt;</button>
          </div>
        </div>\;

content = content.replace(target, replacement);

fs.writeFileSync('apps/public/src/components/CameraCapture.vue', content);
