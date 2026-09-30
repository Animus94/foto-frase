<script setup>
import { onMounted } from 'vue'
import { useCampaign } from '@/composables/useCampaign.js'
import { useMuralListing } from '@/composables/useMuralListing.js'
import MuralGrid from '@/components/MuralGrid.vue'

const campaign = useCampaign()
const mural = useMuralListing({ gridPageSize: 100, allowMock: true })

onMounted(async () => {
  await campaign.load()
  await mural.load()
})
</script>

<template>
  <div class="flex-1 w-full h-[calc(100vh-65px)] flex flex-col bg-slate-950 overflow-hidden">
    <p v-if="mural.error.value" class="text-center text-rose-400 text-sm my-auto p-4">{{ mural.error.value }}</p>
    <p v-else-if="mural.loading.value" class="text-center text-cyan-300 text-sm my-auto animate-pulse">Cargando fotos del mural…</p>

    <MuralGrid v-else :items="mural.resources.value" />
  </div>
</template>