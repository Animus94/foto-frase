<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  src: { type: String, required: true }, // The object URL of the captured/selected image
  marcoUrl: { type: String, default: null },
  mirror: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])

const containerRef = ref(null)
const imageRef = ref(null)

const scale = ref(1)
const panX = ref(0)
const panY = ref(0)

const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const startPanX = ref(0)
const startPanY = ref(0)

// For pinch zoom
const startDist = ref(0)
const startScale = ref(1)

function handleStart(e) {
  if (e.touches && e.touches.length === 2) {
    // Pinch start
    startDist.value = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    )
    startScale.value = scale.value
    return
  }
  
  isDragging.value = true
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  startX.value = clientX
  startY.value = clientY
  startPanX.value = panX.value
  startPanY.value = panY.value
}

function handleMove(e) {
  if (e.touches && e.touches.length === 2) {
    // Pinch move
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    )
    const newScale = startScale.value * (dist / startDist.value)
    scale.value = Math.max(1, Math.min(newScale, 5))
    e.preventDefault()
    return
  }

  if (!isDragging.value) return
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  const dx = clientX - startX.value
  const dy = clientY - startY.value
  
  panX.value = startPanX.value + dx
  panY.value = startPanY.value + dy
}

function handleEnd() {
  isDragging.value = false
}

function handleWheel(e) {
  e.preventDefault()
  const delta = e.deltaY * -0.001
  scale.value = Math.max(1, Math.min(scale.value + delta, 5))
}

function confirm() {
  // We need to return the transform so the canvas can apply it.
  // We can return panX, panY, scale relative to the container size.
  const containerRect = containerRef.value.getBoundingClientRect()
  emit('confirm', {
    panX: panX.value,
    panY: panY.value,
    scale: scale.value,
    containerWidth: containerRect.width,
    containerHeight: containerRect.height
  })
}

onMounted(() => {
  window.addEventListener('mousemove', handleMove, { passive: false })
  window.addEventListener('mouseup', handleEnd)
  window.addEventListener('touchmove', handleMove, { passive: false })
  window.addEventListener('touchend', handleEnd)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMove)
  window.removeEventListener('mouseup', handleEnd)
  window.removeEventListener('touchmove', handleMove)
  window.removeEventListener('touchend', handleEnd)
})
</script>

<template>
  <div class="ff-adjuster w-full flex flex-col items-center">
    <div class="relative overflow-hidden w-full max-w-sm rounded-2xl bg-black aspect-[3/4]" 
         ref="containerRef"
         @mousedown="handleStart"
         @touchstart="handleStart"
         @wheel="handleWheel">
      
      <!-- Image Layer -->
      <img 
        ref="imageRef"
        :src="src" 
        class="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover pointer-events-none"
        :style="{
          transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale}) ${mirror ? 'scaleX(-1)' : ''}`
        }"
      />
      
      <!-- Marco Layer -->
      <div v-if="marcoUrl" 
           class="absolute inset-0 pointer-events-none z-10" 
           :style="{ backgroundImage: `url(${marcoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }">
      </div>
    </div>
    
    <div class="mt-4 text-emerald-200 text-sm text-center">
      Arrastrá para acomodar, pellizcá para hacer zoom
    </div>
    
    <div class="mt-6 w-full flex gap-3 max-w-sm">
      <button class="flex-1 bg-slate-800 text-white font-bold py-3 px-4 rounded-xl" @click="emit('cancel')">
        Volver
      </button>
      <button class="flex-1 bg-cyan-500 text-slate-950 font-bold py-3 px-4 rounded-xl" @click="confirm">
        Confirmar
      </button>
    </div>
  </div>
</template>

