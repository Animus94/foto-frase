<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

// Triplicamos la lista para garantizar el scroll infinito continuo
const triplicatedItems = computed(() => {
  if (!props.items || props.items.length === 0) return []
  return [...props.items, ...props.items, ...props.items]
})

const joinUrl = computed(() => `${window.location.origin}${import.meta.env.BASE_URL}`)
const qrCodeUrl = computed(() => 
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl.value)}&color=020617&bgcolor=06b6d4`
)
</script>

<template>
  <div class="flex-1 w-full bg-slate-950 flex flex-col justify-around py-2 overflow-hidden relative min-h-0 select-none">
    
    <div v-if="!items.length" class="text-center text-slate-500 text-sm my-auto">
      No hay fotos disponibles para mostrar en el mural.
    </div>

    <template v-else>
      <!-- FILA 1: Desplazamiento DERECHA -->
      <div class="w-full overflow-hidden flex items-center py-1">
        <div class="track animate-marquee-right flex flex-row flex-nowrap gap-4 w-max items-center">
          <div 
            v-for="(photo, index) in triplicatedItems" 
            :key="'r1-' + index"
            class="shrink-0 aspect-[3/4] h-48 md:h-64 bg-slate-900 rounded-2xl overflow-hidden border border-emerald-900/60 shadow-xl shadow-black/80 relative flex items-center justify-center"
          >
            <img 
              :src="photo.secure_url || photo.url" 
              :alt="photo.sticker_name || 'Foto'" 
              class="w-full h-full object-contain block" 
            />
            <div v-if="photo.sticker_name" class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2.5 flex items-end">
              <span class="text-xs font-bold text-cyan-300 truncate">{{ photo.sticker_name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FILA 2: Desplazamiento IZQUIERDA -->
      <div class="w-full overflow-hidden flex items-center py-1">
        <div class="track animate-marquee-left flex flex-row flex-nowrap gap-4 w-max items-center">
          <div 
            v-for="(photo, index) in triplicatedItems" 
            :key="'r2-' + index"
            class="shrink-0 aspect-[3/4] h-48 md:h-64 bg-slate-900 rounded-2xl overflow-hidden border border-cyan-900/60 shadow-xl shadow-black/80 relative flex items-center justify-center"
          >
            <img 
              :src="photo.secure_url || photo.url" 
              :alt="photo.sticker_name || 'Foto'" 
              class="w-full h-full object-contain block" 
            />
            <div v-if="photo.sticker_name" class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2.5 flex items-end">
              <span class="text-xs font-bold text-cyan-300 truncate">{{ photo.sticker_name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FILA 3: Desplazamiento DERECHA (Desfasada) -->
      <div class="w-full overflow-hidden flex items-center py-1">
        <div class="track animate-marquee-right flex flex-row flex-nowrap gap-4 w-max items-center" style="animation-delay: -22.5s;">
          <div 
            v-for="(photo, index) in triplicatedItems" 
            :key="'r3-' + index"
            class="shrink-0 aspect-[3/4] h-48 md:h-64 bg-slate-900 rounded-2xl overflow-hidden border border-emerald-900/60 shadow-xl shadow-black/80 relative flex items-center justify-center"
          >
            <img 
              :src="photo.secure_url || photo.url" 
              :alt="photo.sticker_name || 'Foto'" 
              class="w-full h-full object-contain block" 
            />
            <div v-if="photo.sticker_name" class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2.5 flex items-end">
              <span class="text-xs font-bold text-cyan-300 truncate">{{ photo.sticker_name }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- QR FLOTANTE INFERIOR DERECHO -->
    <div class="fixed bottom-5 right-5 z-40 bg-emerald-950/95 border-2 border-emerald-600 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-xs">
      <div class="bg-cyan-400 p-1 rounded-xl shrink-0 shadow-md">
        <img :src="qrCodeUrl" alt="QR para sumarse" class="w-20 h-20 rounded-lg block" />
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-xs font-black text-cyan-300 leading-tight">¡Sumá tu foto!</h2>
        <p class="text-[10px] text-emerald-200/90 leading-snug">Escaneá el código QR con tu celular para subir tu foto al mural.</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
@keyframes marqueeLeft {
  0% { transform: translateX(0%); }
  100% { transform: translateX(-33.333%); }
}

@keyframes marqueeRight {
  0% { transform: translateX(-33.333%); }
  100% { transform: translateX(0%); }
}

.animate-marquee-left {
  animation: marqueeLeft 45s linear infinite;
}

.animate-marquee-right {
  animation: marqueeRight 45s linear infinite;
}

.w-full:hover .track {
  animation-play-state: paused;
}
</style>