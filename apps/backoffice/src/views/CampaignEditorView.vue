<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  useCampaignEditor,
  isoToDatetimeLocal,
  datetimeLocalToIso,
} from '../composables/useCampaignEditor.js'

const {
  submissionsCloseAt,
  maxSubmissionsPerDevice,
  gridPageSize,
  loading,
  saving,
  error,
  load,
  save,
} = useCampaignEditor({ allowMock: true })

const saveMessage = ref(null)
const savedOk = ref(false)

const closeAtLocalValue = computed({
  get: () => isoToDatetimeLocal(submissionsCloseAt.value),
  set: (value) => {
    submissionsCloseAt.value = datetimeLocalToIso(value)
  },
})

async function handleSave() {
  savedOk.value = false
  const message = saveMessage.value?.trim() || 'campaign: actualizar parámetros de campaña'
  const ok = await save(message)
  savedOk.value = ok
  if (ok) saveMessage.value = null
}

onMounted(load)
</script>

<template>
  <div class="ff-screen">
    <h1>Editor de campaña</h1>
    <p class="ff-muted">Edita <code>data/campaign.json</code>.</p>

    <p v-if="loading" class="ff-muted">Cargando…</p>
    <p v-if="error" class="ff-error">{{ error }}</p>

    <template v-if="!loading">
      <div class="ff-field">
        <label for="close-at">Cierre de envíos (submissionsCloseAt)</label>
        <input id="close-at" v-model="closeAtLocalValue" type="datetime-local" />
        <span class="ff-muted">Después de esta fecha/hora no se aceptan envíos nuevos; el Mural sigue visible.</span>
      </div>

      <div class="ff-field">
        <label for="max-submissions">Máximo de envíos por dispositivo</label>
        <input id="max-submissions" v-model.number="maxSubmissionsPerDevice" type="number" min="1" />
      </div>

      <div class="ff-field">
        <label for="grid-page-size">Casilleros por grilla</label>
        <input id="grid-page-size" v-model.number="gridPageSize" type="number" min="1" />
      </div>

      <div class="ff-card">
        <div class="ff-field">
          <label for="commit-message">Mensaje de commit</label>
          <input
            id="commit-message"
            v-model="saveMessage"
            type="text"
            placeholder="campaign: mover el cierre de envíos"
          />
        </div>
        <button type="button" class="ff-button" :disabled="saving" @click="handleSave">
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </button>
        <p v-if="savedOk" class="ff-muted">Guardado.</p>
      </div>
    </template>
  </div>
</template>
