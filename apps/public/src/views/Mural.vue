<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCampaign } from '@/composables/useCampaign.js'
import { useMuralListing } from '@/composables/useMuralListing.js'
import MuralGrid from '@/components/MuralGrid.vue'
import JoinQr from '@/components/JoinQr.vue'

const campaign = useCampaign()
// gridPageSize defaults to 100 (REQ-001) until campaign.json resolves.
const mural = useMuralListing({ gridPageSize: 100, allowMock: true })

// Same absolute-URL pattern as shareMural() in CaptureFlow.vue (REQ-002 §7).
const joinUrl = `${window.location.origin}${import.meta.env.BASE_URL}`

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

    <!-- REQ-002 §7: this page was read-only before — now it also invites
         whoever opens the link (e.g. via the "Compartir" button) to submit
         their own photo. -->
    <div class="ff-mural-actions">
      <JoinQr :url="joinUrl" label="Sumate" />
      <RouterLink to="/carrusel" class="ff-button ff-button--secondary">Ver como carrusel</RouterLink>
    </div>

    <p v-if="mural.error.value" class="ff-error">{{ mural.error.value }}</p>
    <p v-else-if="mural.loading.value" class="ff-muted">Cargando…</p>

    <MuralGrid
      v-else
      :items="mural.pageItems.value"
      :page="mural.page.value"
      :total-pages="mural.totalPages.value"
      @update:page="mural.setPage"
    />
  </section>
</template>

<style scoped>
.ff-mural-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
</style>
