<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGithubDeviceAuth } from '../composables/useGithubDeviceAuth.js'

const route = useRoute()
const router = useRouter()
const {
  isConfigured,
  isAuthenticated,
  status,
  userCode,
  verificationUri,
  error,
  startDeviceFlow,
  startMockSession,
} = useGithubDeviceAuth()

// `import.meta.env.DEV` can't be used directly inside a template expression
// (Vue's template compiler parses it as plain JS, which rejects a bare
// `import.meta`) — bind it to a local const in the script instead.
const isDev = import.meta.env.DEV

// Once the device flow (or the dev-only mock session) succeeds, follow the
// original destination the router guard redirected from, or fall back to
// moderation.
watch(isAuthenticated, (value) => {
  if (!value) return
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/moderacion'
  router.replace(redirect)
})
</script>

<template>
  <div class="ff-screen">
    <h1>Conectar con GitHub</h1>
    <p class="ff-muted">
      El backoffice edita <code>data/phrases.json</code> y <code>data/campaign.json</code> como tu
      propio usuario de GitHub, y modera envíos con el mismo permiso. No hay usuario/contraseña
      propio del backoffice: todo pasa por tu sesión de GitHub.
    </p>

    <p v-if="!isConfigured" class="ff-warning">
      Falta configuración: <code>VITE_WORKER_BASE_URL</code> y/o
      <code>VITE_GITHUB_OAUTH_CLIENT_ID</code> no están definidas. Completá
      <code>apps/backoffice/.env.example</code> (o pedile a quien mantiene el proyecto que lo
      haga) antes de poder conectar con GitHub.
    </p>

    <template v-else>
      <button
        type="button"
        class="ff-button"
        :disabled="status === 'requesting' || status === 'pending'"
        @click="startDeviceFlow"
      >
        {{ status === 'pending' ? 'Esperando confirmación…' : 'Conectar con GitHub' }}
      </button>

      <div v-if="status === 'pending' && userCode" class="ff-card">
        <p>
          1. Abrí <a :href="verificationUri" target="_blank" rel="noopener">{{ verificationUri }}</a>
        </p>
        <p>
          2. Pegá este código: <strong style="font-size: 1.4rem; letter-spacing: 0.15em">{{
            userCode
          }}</strong>
        </p>
        <p class="ff-muted">Esta pantalla se actualiza sola apenas confirmes en GitHub.</p>
      </div>

      <p v-if="status === 'timeout'" class="ff-error">
        El código expiró antes de confirmarse. Volvé a apretar "Conectar con GitHub".
      </p>
      <p v-else-if="status === 'denied'" class="ff-error">
        Se canceló la autorización desde GitHub. Volvé a intentar si fue un error.
      </p>
      <p v-else-if="error" class="ff-error">{{ error }}</p>
    </template>

    <div v-if="isDev" class="ff-card">
      <p class="ff-muted">
        Modo desarrollo: el Worker y la OAuth App todavía no existen (los arma
        <code>deploy-engineer</code>). Podés probar la UI de moderación y los editores con datos
        de ejemplo, sin conectar con GitHub de verdad.
      </p>
      <button type="button" class="ff-button ff-button--secondary" @click="startMockSession">
        Probar con datos de ejemplo (mock)
      </button>
    </div>
  </div>
</template>
