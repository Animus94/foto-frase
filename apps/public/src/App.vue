<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <header class="ff-header">
    <RouterLink to="/" class="ff-header__brand">Mural 5ta Marcha</RouterLink>
    <RouterLink to="/mural" class="ff-header__link">Ver Mural</RouterLink>
  </header>
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
</style>
