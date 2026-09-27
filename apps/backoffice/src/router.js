import { createRouter, createWebHistory } from 'vue-router'
import { useGithubDeviceAuth } from './composables/useGithubDeviceAuth.js'

const ConnectView = () => import('./views/ConnectView.vue')
const PhrasesEditorView = () => import('./views/PhrasesEditorView.vue')
const CampaignEditorView = () => import('./views/CampaignEditorView.vue')
const ModerationView = () => import('./views/ModerationView.vue')

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/moderacion' },
    { path: '/conectar', name: 'connect', component: ConnectView },
    {
      path: '/frases',
      name: 'phrases',
      component: PhrasesEditorView,
      meta: { requiresAuth: true },
    },
    {
      path: '/campania',
      name: 'campaign',
      component: CampaignEditorView,
      meta: { requiresAuth: true },
    },
    {
      path: '/moderacion',
      name: 'moderation',
      component: ModerationView,
      meta: { requiresAuth: true },
    },
  ],
})

// Every screen except "Conectar con GitHub" requires an active session
// (real device-flow token or, in dev, a mock session — see
// useGithubDeviceAuth's MOCK_TOKEN). Unauthenticated visits get redirected
// to /conectar instead of hitting the GitHub Contents API / Worker with no
// token and showing a raw 401.
router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true
  const { isAuthenticated } = useGithubDeviceAuth()
  if (isAuthenticated.value) return true
  return { name: 'connect', query: { redirect: to.fullPath } }
})
