<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useCamera } from '@/composables/useCamera.js'

const props = defineProps({
  facingMode: { type: String, required: true }, // 'user' | 'environment'
  mirrorPreview: { type: Boolean, default: false },
})
const emit = defineEmits(['captured'])

const videoRef = ref(null)
const camera = useCamera(props.facingMode)

onMounted(async () => {
  if (camera.getUserMediaSupported && videoRef.value) {
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
  emit('captured', { ...frame, mirror: props.mirrorPreview })
}

async function handleFallbackFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const frame = await camera.loadFallbackFile(file)
  emit('captured', { ...frame, mirror: false })
}
</script>

<template>
  <section class="ff-screen">
    <h1>Tomá tu foto</h1>

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
      <button class="ff-button" :disabled="!camera.isStreaming.value" @click="handleCapture">
        Capturar foto
      </button>
    </template>

    <template v-else>
      <p class="ff-muted">
        Este navegador no soporta acceso directo a la cámara: usá el selector de abajo (en el celular
        te va a abrir la cámara igual).
      </p>
      <label class="ff-button ff-fallback-input">
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
