<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useModerationApi } from '../composables/useModerationApi.js'
import { useGithubDeviceAuth } from '../composables/useGithubDeviceAuth.js'
import SubmissionCard from '../components/SubmissionCard.vue'

const router = useRouter()
const { logout, isMockSession } = useGithubDeviceAuth()
const { isConfigured, items, hasMore, loading, error, loadItems, approve, reject, isActionPending } =
  useModerationApi({ allowMock: true })

const actionError = ref(null)
const activeTab = ref('pending')

function switchTab(tab) {
  activeTab.value = tab
  loadItems(tab, true)
}

async function handleApprove(submission) {
  actionError.value = null
  const ok = await approve(submission.public_id, submission.context)
  if (!ok && error.value) actionError.value = error.value
}

async function handleReject(submission) {
  actionError.value = null
  const ok = await reject(submission.public_id, submission.context)
  if (!ok && error.value) actionError.value = error.value
}

function retryAuth() {
  logout()
  router.push({ name: 'connect', query: { redirect: '/moderacion' } })
}

onMounted(() => loadItems('pending', true))
</script>

<template>
  <div class="ff-screen">
    <h1>Moderación de envíos</h1>
    <p class="ff-muted">Gestion� los env�os pendientes o da de baja fotos ya aprobadas.</p><div style="display: flex; gap: 1rem; margin-bottom: 2rem;"><button :class="['ff-button', activeTab === 'pending' ? 'ff-button--primary' : 'ff-button--ghost']" @click="switchTab('pending')">Pendientes</button><button :class="['ff-button', activeTab === 'approved' ? 'ff-button--primary' : 'ff-button--ghost']" @click="switchTab('approved')">Aprobadas</button></div>

    <p v-if="!isConfigured && !isMockSession" class="ff-warning">
      Falta configuración: <code>VITE_WORKER_BASE_URL</code> no está definida. Ver
      <code>apps/backoffice/.env.example</code>.
    </p>

    <p v-if="loading" class="ff-muted">Cargando…</p>

    <div v-if="error?.kind === 'unauthorized'" class="ff-card">
      <p class="ff-error">{{ error.message }}</p>
      <button type="button" class="ff-button ff-button--secondary" @click="retryAuth">
        Reintentar autenticación
      </button>
    </div>
    <p v-else-if="error" class="ff-error">{{ error.message }}</p>
    <p v-if="actionError && actionError.kind !== 'unauthorized'" class="ff-error">
      {{ actionError.message }}
    </p>

    <p v-if="!loading && !error && items.length === 0" class="ff-muted">
      No hay envíos pendientes de moderación.
    </p>

    <SubmissionCard
      v-for="submission in items"
      :key="submission.public_id"
      :submission="submission"
      :busy="isActionPending(submission.public_id)"
      @approve="handleApprove"
      @reject="handleReject"
    />

    <button
      v-if="hasMore"
      type="button"
      class="ff-button ff-button--ghost"
      :disabled="loading"
      @click="loadItems(activeTab, false)"
    >
      Cargar más
    </button>
  </div>
</template>
