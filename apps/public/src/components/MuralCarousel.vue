<script setup>
defineProps({
  resources: { type: Array, required: true },
})
</script>

<template>
  <div class="ff-carousel">
    <div v-if="resources.length === 0" class="ff-muted">Todavía no hay envíos aprobados.</div>
    <div v-else class="ff-carousel__track">
      <figure v-for="resource in resources" :key="resource.public_id" class="ff-carousel__slide">
        <img :src="resource.secure_url ?? resource.url" :alt="resource.public_id" loading="lazy" />
      </figure>
    </div>
  </div>
</template>

<style scoped>
.ff-carousel__track {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 0.5rem;
  -webkit-overflow-scrolling: touch;
}

.ff-carousel__slide {
  flex: 0 0 78%;
  scroll-snap-align: center;
  margin: 0;
}

.ff-carousel__slide img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 12px;
  display: block;
}
</style>
