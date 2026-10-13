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
        Hacia la 5ta Marcha universitaria: Marchamos por la educación, la soberanía y la democracia
      </RouterLink>
      <nav class="flex items-center gap-4">
        <RouterLink to="/mural" class="text-slate-300 hover:text-emerald-400 font-medium text-sm transition-colors">
          Ver Mural
        </RouterLink>
        <a href="https://animus94.github.io/foto-frase/" class="text-slate-300 hover:text-emerald-400 font-medium text-sm transition-colors">
          Sacarse selfie
        </a>
        <a href="https://sudhurok.github.io/reloj-ley-universitaria/" target="_blank" rel="noopener noreferrer" class="text-slate-300 hover:text-emerald-400 font-medium text-sm transition-colors flex items-center gap-1">
          Reloj Ley Universitaria
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
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