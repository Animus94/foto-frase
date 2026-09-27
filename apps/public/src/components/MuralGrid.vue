<script setup>
defineProps({
  items: { type: Array, required: true },
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})
const emit = defineEmits(['update:page'])
</script>

<template>
  <div class="ff-grid-wrap">
    <div v-if="items.length === 0" class="ff-muted">Todavía no hay envíos aprobados en esta página.</div>
    <div v-else class="ff-grid">
      <figure v-for="resource in items" :key="resource.public_id" class="ff-grid__cell">
        <img :src="resource.secure_url ?? resource.url" :alt="resource.public_id" loading="lazy" />
      </figure>
    </div>

    <nav v-if="totalPages > 1" class="ff-pagination">
      <button
        class="ff-button ff-button--secondary"
        :disabled="page <= 1"
        @click="emit('update:page', page - 1)"
      >
        Anterior
      </button>
      <span class="ff-muted">Página {{ page }} de {{ totalPages }}</span>
      <button
        class="ff-button ff-button--secondary"
        :disabled="page >= totalPages"
        @click="emit('update:page', page + 1)"
      >
        Siguiente
      </button>
    </nav>
  </div>
</template>

<style scoped>
.ff-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}

.ff-grid__cell {
  margin: 0;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 6px;
  background: #eee;
}

.ff-grid__cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ff-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
}
</style>
