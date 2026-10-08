<script setup>
import { onMounted, ref, watch } from 'vue'
import { usePhrasesEditor, slugify } from '../composables/usePhrasesEditor.js'

const {
  prefix,
  options,
  loading,
  saving,
  error,
  load,
  
  addOption,
  setActive,
  updateLabel,
  updatePrefix,
  save,
  addMarco,
  removeMarco,
  updateMarcoConfig,
  updateMarcoLabel

} = usePhrasesEditor({ allowMock: true })

const newLabel = ref('')
const newId = ref('')
const newIdTouchedByHand = ref(false)
const addError = ref(null)
const saveMessage = ref(null)

const savedOk = ref(false)
const expandedPhraseId = ref(null)

function toggleMarcos(id) {
  expandedPhraseId.value = expandedPhraseId.value === id ? null : id
}


watch(newLabel, (label) => {
  if (newIdTouchedByHand.value) return
  newId.value = slugify(label)
})

function handleIdInput(value) {
  newIdTouchedByHand.value = true
  newId.value = value
}

function handleAdd() {
  addError.value = null
  const result = addOption(newId.value, newLabel.value)
  if (!result.ok) {
    addError.value = result.error
    return
  }
  newLabel.value = ''
  newId.value = ''
  newIdTouchedByHand.value = false
}

async function handleSave() {
  savedOk.value = false
  const message = saveMessage.value?.trim() || 'phrases: actualizar opciones/prefijo'
  const ok = await save(message)
  savedOk.value = ok
  if (ok) saveMessage.value = null
}

onMounted(load)
</script>

<template>
  <div class="ff-screen">
    <h1>Editor de frases</h1>
    <p class="ff-muted">
      Edita <code>data/phrases.json</code>. Retirar una opción nunca la borra (queda
      <code>active: false</code>): un envío histórico sigue referenciando su <code>id</code>.
    </p>

    <p v-if="loading" class="ff-muted">Cargando…</p>
    <p v-if="error" class="ff-error">{{ error }}</p>

    <template v-if="!loading">
      <div class="ff-field">
        <label for="prefix">Prefijo</label>
        <input
          id="prefix"
          type="text"
          :value="prefix"
          @input="updatePrefix($event.target.value)"
        />
      </div>

      <div class="ff-table-scroll">
      <table class="ff-table">
        <thead>
          <tr>
            <th>Activa</th>
            <th>id</th>
            <th>Texto</th>
            <th>Vista previa</th>
            <th>Marcos</th>
          </tr>
        </thead>
        
        <tbody>
          <template v-for="option in options" :key="option.id">
            <tr>
              <td>
                <input
                  type="checkbox"
                  :checked="option.active"
                  @change="setActive(option.id, $event.target.checked)"
                />
              </td>
              <td><code>{{ option.id }}</code></td>
              <td>
                <input
                  type="text"
                  :value="option.label"
                  @input="updateLabel(option.id, $event.target.value)"
                />
              </td>
              <td class="ff-muted">{{ prefix }} {{ option.label }}</td>
              <td>
                <button type="button" class="ff-button ff-button--secondary" style="padding: 4px 8px; font-size: 0.8rem;" @click="toggleMarcos(option.id)">
                  {{ expandedPhraseId === option.id ? 'Cerrar Marcos' : 'Marcos (' + (option.marcos ? option.marcos.length : 0) + ')' }}
                </button>
              </td>
            </tr>
            <tr v-if="expandedPhraseId === option.id">
              <td colspan="5" style="padding: 0;">
                <PhraseMarcosManager 
                  :phrase="option" 
                  @add-marco="addMarco" 
                  @remove-marco="removeMarco" 
                  @update-label="updateMarcoLabel" 
                  @update-config="updateMarcoConfig" 
                />
              </td>
            </tr>
          </template>
        </tbody>

      </table>
      </div>

      <div class="ff-card">
        <h2 style="margin: 0; font-size: 1rem">Agregar opción nueva</h2>
        <div class="ff-field">
          <label for="new-label">Texto</label>
          <input id="new-label" v-model="newLabel" type="text" placeholder="Con mi facultad" />
        </div>
        <div class="ff-field">
          <label for="new-id">id (slug, se puede editar)</label>
          <input
            id="new-id"
            :value="newId"
            type="text"
            placeholder="con-mi-facultad"
            @input="handleIdInput($event.target.value)"
          />
        </div>
        <p v-if="addError" class="ff-error">{{ addError }}</p>
        <button type="button" class="ff-button ff-button--secondary" @click="handleAdd">
          Agregar opción
        </button>
      </div>

      <div class="ff-card">
        <div class="ff-field">
          <label for="commit-message">Mensaje de commit</label>
          <input
            id="commit-message"
            v-model="saveMessage"
            type="text"
            placeholder="phrases: agregar opción 'Con mi facultad'"
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

<style scoped>
.ff-table-scroll {
  overflow-x: auto;
}

.ff-table {
  width: 100%;
  min-width: 540px;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.ff-table th,
.ff-table td {
  border-bottom: 1px solid #eee;
  padding: 0.5rem;
  text-align: left;
  vertical-align: middle;
}

.ff-table input[type='text'] {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
}
</style>
