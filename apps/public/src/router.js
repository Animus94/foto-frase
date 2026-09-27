import { createRouter, createWebHistory } from 'vue-router'

const CaptureFlow = () => import('./views/CaptureFlow.vue')
const Mural = () => import('./views/Mural.vue')
const Carrusel = () => import('./views/Carrusel.vue')

// REQ-002 §6: the Mural's grid and carousel each get their own URL instead
// of sharing one route — /mural (grid only) and /carrusel (carousel only).
// Both still read the same data via useMuralListing (sessionStorage-cached
// ~60s), instantiated separately in each view. GitHub Pages needs the
// standard 404.html SPA fallback for these deep links — already handled
// generically by docs/deploy/404.html (deploy-engineer's task, no change
// needed since it doesn't distinguish routes by name within this app).
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'capture', component: CaptureFlow },
    { path: '/mural', name: 'mural', component: Mural },
    { path: '/carrusel', name: 'carrusel', component: Carrusel },
  ],
})
