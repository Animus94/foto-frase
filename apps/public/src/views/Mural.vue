<script setup>
import { onMounted } from 'vue'
import { useCampaign } from '@/composables/useCampaign.js'
import { useMuralListing } from '@/composables/useMuralListing.js'
import MuralCarousel from '@/components/MuralCarousel.vue'
import MuralGrid from '@/components/MuralGrid.vue'

const campaign = useCampaign()
// gridPageSize defaults to 100 (REQ-001) until campaign.json resolves.
const mural = useMuralListing({ gridPageSize: 100, allowMock: true })

onMounted(async () => {
  await campaign.load()
  await mural.load()
})
</script>

<template>
  <section class="ff-screen">
    <h1>Mural de la 5ta Marcha</h1>
    <p class="ff-muted">
      Envíos ya aprobados por el equipo de moderación. El Mural sigue visible después del cierre de
      envíos, como archivo del evento.
    </p>

    <p v-if="mural.error.value" class="ff-error">{{ mural.error.value }}</p>
    <p v-else-if="mural.loading.value" class="ff-muted">Cargando…</p>

    <template v-else>
      <h2>Carrusel</h2>
      <MuralCarousel :resources="mural.resources.value" />

      <h2>Grilla</h2>
      <MuralGrid
        :items="mural.pageItems.value"
        :page="mural.page.value"
        :total-pages="mural.totalPages.value"
        @update:page="mural.setPage"
      />
    </template>
  </section>
</template>
