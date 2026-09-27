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
  <section class="ff-screen">
    <h1>Mural de la 5ta Marcha — Carrusel</h1>
    <p class="ff-muted">
      Los mismos envíos aprobados del Mural, en formato carrusel para recorrerlos uno por uno.
    </p>

    <div class="ff-mural-actions">
      <RouterLink to="/" class="ff-button">Sumar mi foto</RouterLink>
      <RouterLink to="/mural" class="ff-button ff-button--secondary">Ver como grilla</RouterLink>
    </div>

    <p v-if="mural.error.value" class="ff-error">{{ mural.error.value }}</p>
    <p v-else-if="mural.loading.value" class="ff-muted">Cargando…</p>

    <MuralCarousel v-else :resources="mural.resources.value" />
  </section>
</template>

<style scoped>
.ff-mural-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
</style>
