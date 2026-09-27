<script setup>
import { RouterView, RouterLink, useRouter } from 'vue-router'
import { useGithubDeviceAuth } from './composables/useGithubDeviceAuth.js'

const router = useRouter()
const { isAuthenticated, isMockSession, logout } = useGithubDeviceAuth()

function handleLogout() {
  logout()
  router.push({ name: 'connect' })
}
</script>

<template>
  <header class="ff-header">
    <div class="ff-header__brand">Backoffice — Mural 5ta Marcha</div>
    <nav v-if="isAuthenticated" class="ff-header__nav">
      <RouterLink to="/moderacion">Moderación</RouterLink>
      <RouterLink to="/frases">Frases</RouterLink>
      <RouterLink to="/campania">Campaña</RouterLink>
      <span v-if="isMockSession" class="ff-badge ff-badge--mock">modo demo</span>
      <button type="button" class="ff-button ff-button--ghost" @click="handleLogout">
        Cerrar sesión
      </button>
    </nav>
  </header>
  <RouterView />
</template>

<style scoped>
.ff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  background: var(--ff-green);
  color: #fff;
}

.ff-header__brand {
  font-weight: 800;
  font-size: 1rem;
}

.ff-header__nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.9rem;
}

.ff-header__nav :deep(a) {
  color: #fff;
  text-decoration: underline;
}

.ff-header__nav :deep(a.router-link-active) {
  text-decoration: none;
  font-weight: 700;
}

.ff-header__nav .ff-button--ghost {
  border-color: #fff;
  color: #fff;
}
</style>
