<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
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
