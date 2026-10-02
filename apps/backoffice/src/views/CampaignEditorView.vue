<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  useCampaignEditor,
  isoToDatetimeLocal,
  datetimeLocalToIso,
} from '../composables/useCampaignEditor.js'
import { useAdminCloudinaryUpload } from '../composables/useAdminCloudinaryUpload.js'

const {
  submissionsCloseAt,
  maxSubmissionsPerDevice,
  gridPageSize,
  marcos,
  loading,
  saving,
  error,
  load,
  save,
} = useCampaignEditor({ allowMock: true })

const saveMessage = ref(null)
const savedOk = ref(false)

const { uploadFrame, uploading: isUploading, error: uploadError } = useAdminCloudinaryUpload()
const fileInput = ref(null)

async function handleUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const url = await uploadFrame(file)
  if (url) {
    marcos.value.push({ id: 'marco-' + Date.now(), label: 'Nuevo Marco', url })
  }
  if (fileInput.value) fileInput.value.value = ''
}

function removeMarco(index) {
  marcos.value.splice(index, 1)
}

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
        <h2 style="margin: 0 0 1rem 0; font-size: 1.1rem">Marcos (PNG transparentes)</h2>
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem;">
          <div v-for="(marco, i) in marcos" :key="marco.id" style="display: flex; gap: 1rem; align-items: center; border: 1px solid #eee; padding: 0.5rem;">
            <img v-if="marco.url" :src="marco.url" style="width: 50px; height: 50px; object-fit: contain; background: #ccc;" />
            <div v-else style="width: 50px; height: 50px; background: #ccc; display: flex; align-items: center; justify-content: center; font-size: 0.8rem">Base</div>
            <div style="flex: 1;">
              <input type="text" v-model="marco.label" style="width: 100%; padding: 0.35rem 0.5rem; border: 1px solid #ccc; border-radius: 6px;" placeholder="Nombre del marco" />
            </div>
            <button type="button" class="ff-button ff-button--ghost" style="color: red; border-color: red" @click="removeMarco(i)">Quitar</button>
          </div>
        </div>
        <p v-if="uploadError" class="ff-error">{{ uploadError }}</p>
        <div>
          <input type="file" ref="fileInput" accept="image/png" style="display: none" @change="handleUpload" />
          <button type="button" class="ff-button ff-button--secondary" :disabled="isUploading" @click="fileInput.click()">
            {{ isUploading ? 'Subiendo imagen...' : 'Subir nuevo marco (PNG)' }}
          </button>
        </div>
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
