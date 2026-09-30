<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  resources: {
    type: Array,
    default: () => []
  },
  intervalMs: {
    type: Number,
    default: 4000
  }
})

const currentIndex = ref(0)
const isPaused = ref(false)
let timer = null

const currentItem = computed(() => props.resources[currentIndex.value] || null)

function next() {
  if (props.resources.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % props.resources.length
}

function prev() {
  if (props.resources.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + props.resources.length) % props.resources.length
}

function goTo(index) {
  currentIndex.value = index
}

function startAutoplay() {
  stopAutoplay()
  if (props.resources.length > 1) {
    timer = setInterval(() => {
      if (!isPaused.value) {
        next()
      }
    }, props.intervalMs)
  }
}

function stopAutoplay() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

watch(() => props.resources, () => {
  currentIndex.value = 0
  startAutoplay()
}, { deep: true })

onMounted(() => {
  startAutoplay()
})

onBeforeUnmount(() => {
  stopAutoplay()
})
</script>

<template>
  <div
    class="flex flex-col items-center gap-5 w-full max-w-lg mx-auto"
    @mouseenter="isPaused = true"
    @mouseleave="isPaused = false"
  >
    <div v-if="!currentItem" class="py-20 text-slate-500 text-sm font-medium">
      Cargando o sin imágenes para mostrar...
    </div>

    <template v-else>
      <!-- Marco de Foto Exhibida -->
      <div class="relative aspect-square w-full bg-slate-900 border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl group">
        <!-- Transición entre fotos -->
        <Transition name="fade" mode="out-in">
          <img
            :key="currentItem.public_id || currentIndex"
            :src="currentItem.secure_url || currentItem.url"
            :alt="currentItem.sticker_name || 'Foto del carrusel'"
            class="w-full h-full object-cover"
          />
        </Transition>

        <!-- Capa con gradiente y nombre -->
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-5 pt-12 flex justify-between items-end">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block mb-0.5">Participante</span>
            <span class="text-base font-bold text-white tracking-wide">
              {{ currentItem.sticker_name || 'Anónimo' }}
            </span>
          </div>

          <!-- Indicador de Pausa al Hover -->
          <span v-if="isPaused" class="text-[10px] bg-slate-900/80 text-amber-300 font-semibold px-2 py-1 rounded-md border border-amber-500/30 backdrop-blur-xs">
            Pausado
          </span>
        </div>

        <!-- Botones de Navegación -->
        <button
          type="button"
          aria-label="Foto anterior"
          class="absolute left-3 top-1/2 -translate-y-1/2 bg-slate-950/70 hover:bg-emerald-600 text-white w-11 h-11 rounded-full border border-slate-700/60 flex items-center justify-center backdrop-blur-md transition-all shadow-lg active:scale-95"
          @click="prev"
        >
          ‹
        </button>

        <button
          type="button"
          aria-label="Foto siguiente"
          class="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-950/70 hover:bg-emerald-600 text-white w-11 h-11 rounded-full border border-slate-700/60 flex items-center justify-center backdrop-blur-md transition-all shadow-lg active:scale-95"
          @click="next"
        >
          ›
        </button>
      </div>

      <!-- Barra de progreso e indicadores de diapositiva -->
      <div class="flex items-center gap-2 w-full justify-center flex-wrap px-4">
        <button
          v-for="(_, idx) in resources.slice(0, 20)"
          :key="idx"
          type="button"
          class="h-1.5 rounded-full transition-all duration-300"
          :class="idx === currentIndex ? 'w-8 bg-emerald-400' : 'w-2 bg-slate-800 hover:bg-slate-700'"
          @click="goTo(idx)"
        ></button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>