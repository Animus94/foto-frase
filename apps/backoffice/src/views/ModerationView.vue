<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useModerationApi } from '../composables/useModerationApi.js'
import { useGithubDeviceAuth } from '../composables/useGithubDeviceAuth.js'
import SubmissionCard from '../components/SubmissionCard.vue'

const router = useRouter()
const { logout, isMockSession } = useGithubDeviceAuth()
const { isConfigured, items, hasMore, loading, error, loadPending, approve, reject, isActionPending } =
  useModerationApi({ allowMock: true })

const actionError = ref(null)

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

onMounted(() => loadPending(true))
</script>

<template>
  <div class="ff-screen">
    <h1>Moderación de envíos</h1>
    <p class="ff-muted">
      Envíos pendientes (tag <code>moderation:pending</code>), vía el Worker de ADR-001. Aprobar
      agrega el tag <code>mural-public</code>; rechazar solo retagea el envío, nunca lo borra.
    </p>

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
      @click="loadPending(false)"
    >
      Cargar más
    </button>
  </div>
</template>
