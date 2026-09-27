<script setup>
import { RouterView, RouterLink } from 'vue-router'
import { usePwaUpdate } from './composables/usePwaUpdate.js'

const { needRefresh, reloadForUpdate } = usePwaUpdate()
</script>

<template>
  <header class="ff-header">
    <RouterLink to="/" class="ff-header__brand">Mural 5ta Marcha</RouterLink>
    <RouterLink to="/mural" class="ff-header__link">Ver Mural</RouterLink>
  </header>

  <div v-if="needRefresh" class="ff-update-banner">
    <span>Hay una versión nueva de la app.</span>
    <button type="button" class="ff-button" @click="reloadForUpdate">Actualizar</button>
  </div>

  <RouterView />
</template>

<style scoped>
.ff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: var(--ff-green);
  color: #fff;
}

.ff-header__brand {
  color: #fff;
  font-weight: 800;
  text-decoration: none;
  font-size: 1rem;
}

.ff-header__link {
  color: #fff;
  text-decoration: underline;
  font-size: 0.9rem;
}

.ff-update-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 1.25rem;
  background: #fff7e0;
  color: #5c4a00;
  font-size: 0.85rem;
  border-bottom: 1px solid #e8d68a;
}

.ff-update-banner .ff-button {
  flex-shrink: 0;
  padding: 0.35rem 0.9rem;
}
</style>
