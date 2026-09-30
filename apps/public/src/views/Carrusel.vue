<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCampaign } from '@/composables/useCampaign.js'
import { useMuralListing } from '@/composables/useMuralListing.js'
import MuralCarousel from '@/components/MuralCarousel.vue'

const campaign = useCampaign()
const mural = useMuralListing({ gridPageSize: 100, allowMock: true })

onMounted(async () => {
  await campaign.load()
  await mural.load()
})
</script>

<template>
  <section class="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col items-center justify-center">
    <div class="w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col gap-4">
      <div class="bg-emerald-950/90 border border-emerald-800/80 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-xl font-black text-cyan-400">Carrusel de Fotos</h1>
          <p class="text-xs text-emerald-200/90 mt-0.5">Recorré los envíos aprobados uno por uno.</p>
        </div>
        <RouterLink to="/mural" class="text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3.5 py-2 rounded-xl transition-all">
          Ver Mural En Vivo
        </RouterLink>
      </div>

      <p v-if="mural.error.value" class="text-xs text-rose-400 bg-rose-950/60 p-3 rounded-xl border border-rose-800">
        {{ mural.error.value }}
      </p>
      <p v-else-if="mural.loading.value" class="text-xs text-cyan-300 animate-pulse text-center py-6">Cargando carrusel…</p>

      <MuralCarousel v-else :resources="mural.resources.value" />
    </div>
  </section>
</template>