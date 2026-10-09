<script setup>
import { RouterView, RouterLink } from 'vue-router'
import { usePwaUpdate } from './composables/usePwaUpdate.js'

const { needRefresh, reloadForUpdate } = usePwaUpdate()
</script>

<template>
  <div id="app" class="min-h-screen w-full flex flex-col bg-slate-950 text-slate-100 overflow-x-hidden">
    <!-- Header Fijo Superior -->
    <header class="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3 flex items-center justify-between shrink-0">
      <RouterLink to="/" class="text-emerald-400 font-extrabold text-lg hover:text-emerald-300 transition-colors">
        Mural 5ta Marcha 🇦🇷
      </RouterLink>
      <nav class="flex items-center gap-4">
        <RouterLink to="/mural" class="text-slate-300 hover:text-emerald-400 font-medium text-sm transition-colors">
          Ver Mural
        </RouterLink>
        <a href="https://animus94.github.io/foto-frase/" class="text-slate-300 hover:text-emerald-400 font-medium text-sm transition-colors">
          Volver
        </a>
      </nav>
    </header>

    <!-- Notificación PWA -->
    <div v-if="needRefresh" class="bg-cyan-950 border-b border-cyan-700 px-4 py-2 text-center text-xs text-cyan-200 flex items-center justify-center gap-3 shrink-0">
      <span>Nueva versión disponible.</span>
      <button @click="reloadForUpdate" class="bg-cyan-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs">Actualizar</button>
    </div>

    <!-- Main sin restricción de ancho -->
    <main class="flex-1 w-full flex flex-col min-h-0">
      <RouterView />
    </main>
  </div>
</template>