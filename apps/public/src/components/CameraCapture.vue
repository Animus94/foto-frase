<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useCamera } from '@/composables/useCamera.js'

const props = defineProps({
  facingMode: { type: String, default: 'user' }, // 'user' | 'environment'
  mirrorPreview: { type: Boolean, default: false },
  mode: { type: String, default: 'camera' }, // 'camera' | 'gallery'
  marcos: { type: Array, default: () => [] }
})
const emit = defineEmits(['captured'])
const selectedMarcoIndex = ref(0)
const selectedMarco = computed(() => props.marcos[selectedMarcoIndex.value] || null)

const videoRef = ref(null)
function nextMarco() {
  if (props.marcos.length === 0) return;
  selectedMarcoIndex.value = (selectedMarcoIndex.value + 1) % props.marcos.length;
}
function prevMarco() {
  if (props.marcos.length === 0) return;
  selectedMarcoIndex.value = (selectedMarcoIndex.value - 1 + props.marcos.length) % props.marcos.length;
}
const camera = useCamera(props.facingMode)

onMounted(async () => {
  if (props.mode === 'camera' && camera.getUserMediaSupported && videoRef.value) {
    await camera.start(videoRef.value)
  }
})

onBeforeUnmount(() => {
  camera.stop()
})

function handleCapture() {
  const frame = camera.captureFrame()
  if (!frame) return
  camera.stop()
  emit('captured', { ...frame, mirror: props.mirrorPreview, marco: selectedMarco.value })
}

async function handleFallbackFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const frame = await camera.loadFallbackFile(file)
  emit('captured', { ...frame, mirror: false, marco: selectedMarco.value })
}
</script>

<template>
  <section class="ff-screen">
    <h1 v-if="props.mode === 'camera'">Tomá tu foto</h1>
    <h1 v-else>Elegí tu foto</h1>

    <template v-if="props.mode === 'camera'">
      <template v-if="camera.getUserMediaSupported">
        <div class="ff-camera-frame">
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
            <button type="button" class="bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm" @click="prevMarco"><</button>
            <span class="bg-black/50 text-white px-3 py-1 rounded-lg text-sm backdrop-blur-sm">{{ selectedMarco?.label || 'Base' }}</span>
            <button type="button" class="bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm" @click="nextMarco">></button>
          </div>
        </div>
        <p v-if="camera.error.value" class="ff-error">{{ camera.error.value }}</p>
        <button class="w-full mt-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all" :disabled="!camera.isStreaming.value" @click="handleCapture">
          Capturar foto
        </button>
      </template>
      <template v-else>
        <p class="ff-muted">
          Este navegador no soporta acceso directo a la cámara: usá el selector de abajo.
        </p>
        <label class="w-full mt-4 inline-block bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all text-center cursor-pointer">
          Abrir cámara
          <input
            type="file"
            accept="image/*"
            :capture="facingMode"
            hidden
            @change="handleFallbackFile"
          />
        </label>
      </template>
    </template>

    <template v-if="props.mode === 'gallery'">
      <div class="flex flex-col items-center justify-center gap-4 py-8">
        <div v-if="marcos.length > 0" class="flex flex-col items-center gap-2 mb-4">
          <p class="text-sm text-emerald-200">Elegí un marco para tu foto:</p>
          <div class="flex items-center gap-4">
            <button type="button" class="bg-emerald-900/50 text-emerald-200 rounded-full w-10 h-10 flex items-center justify-center border border-emerald-700" @click="prevMarco"><</button>
            <span class="text-white font-bold min-w-[120px] text-center">{{ selectedMarco?.label || 'Base' }}</span>
            <button type="button" class="bg-emerald-900/50 text-emerald-200 rounded-full w-10 h-10 flex items-center justify-center border border-emerald-700" @click="nextMarco">></button>
          </div>
          <div v-if="selectedMarco?.url" class="w-32 h-48 border-2 border-emerald-700/50 rounded-lg overflow-hidden mt-2 relative">
            <div class="absolute inset-0 bg-slate-800"></div>
            <div class="absolute inset-0 bg-cover bg-center" :style="{ backgroundImage: 'url(' + selectedMarco.url + ')' }"></div>
          </div>
        </div>
        <label class="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 px-4 rounded-xl transition-all text-center cursor-pointer shadow-lg">
          Seleccionar imagen
          <input
            type="file"
            accept="image/*"
            hidden
            @change="handleFallbackFile"
          />
        </label>
      </div>
    </template>
  </section>
</template>

<style scoped>
.ff-camera-frame {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  aspect-ratio: 3 / 4;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

video.is-mirrored {
  transform: scaleX(-1);
}

.ff-fallback-input {
  text-align: center;
}
</style>
