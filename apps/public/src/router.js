import { createRouter, createWebHistory } from 'vue-router'

const CaptureFlow = () => import('./views/CaptureFlow.vue')
const Mural = () => import('./views/Mural.vue')

// The Mural (carousel + grid) lives inside apps/public as one more route
// (ADR-003): REQ-001 only asks for it to have "its own URL", which a SPA
// route already satisfies. GitHub Pages needs the standard 404.html SPA
// fallback for this deep link — that's deploy-engineer's task.
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'capture', component: CaptureFlow },
    { path: '/mural', name: 'mural', component: Mural },
  ],
})
