<script setup>
import { ref } from 'vue'
import { useAdminCloudinaryUpload } from '../composables/useAdminCloudinaryUpload'

const props = defineProps({
  phrase: { type: Object, required: true },
})

const emit = defineEmits(['add-marco', 'remove-marco', 'update-label', 'update-config'])

const { uploadImage, isUploading, error: uploadError } = useAdminCloudinaryUpload()

async function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  const url = await uploadImage(file)
  if (url) {
    emit('add-marco', props.phrase.id, url, 'Nuevo Marco')
  }
}

function remove(marcoId) {
  if (confirm('Seguro que quers borrar este marco de esta frase?')) {
    emit('remove-marco', props.phrase.id, marcoId)
  }
}

function updateLabel(marcoId, label) {
  emit('update-label', props.phrase.id, marcoId, label)
}
</script>

<template>
  <div class="marcos-manager">
    <h3 style="margin-top:0">Marcos para "{{ phrase.label }}"</h3>
    
    <div v-if="uploadError" class="ff-error">{{ uploadError }}</div>
    
    <div class="marcos-list" v-if="phrase.marcos && phrase.marcos.length > 0">
      <div v-for="marco in phrase.marcos" :key="marco.id" class="marco-card">
        <div class="marco-preview" :style="{ backgroundImage: 'url(' + marco.url + ')' }"></div>
        <div class="marco-info">
          <input 
            type="text" 
            :value="marco.label" 
            @input="updateLabel(marco.id, $event.target.value)" 
            class="ff-input-small"
          />
          <button type="button" class="ff-button ff-button--danger" @click="remove(marco.id)">X</button>
        </div>
      </div>
    </div>
    <div v-else class="ff-muted" style="margin-bottom: 1rem;">
      No hay marcos asociados.
    </div>

    <div class="upload-area">
      <label class="ff-button ff-button--secondary" :class="{ 'opacity-50': isUploading }">
        {{ isUploading ? 'Subiendo...' : 'Subir Marco (PNG transparente)' }}
        <input type="file" accept="image/png" class="hidden" @change="handleFileUpload" :disabled="isUploading" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.marcos-manager {
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
}

.marcos-list {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.marco-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.5rem;
  width: 150px;
}

.marco-preview {
  width: 100%;
  height: 150px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #e2e8f0;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.marco-info {
  display: flex;
  gap: 0.25rem;
}

.ff-input-small {
  width: 100%;
  padding: 0.25rem;
  font-size: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.hidden {
  display: none;
}
</style>
