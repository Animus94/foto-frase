<script setup>
const props = defineProps({
  previewUrl: { type: String, required: true },
  modelValue: { type: Boolean, required: true }, // consent checkbox
  submitting: { type: Boolean, default: false },
  error: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'submit', 'retake'])

// Exact wording required by REQ-001 — do not reword.
const CONSENT_TEXT =
  'Al enviar el post acepto que la imagen será publicada en una web de acceso público.'

defineExpose({ CONSENT_TEXT })
</script>

<template>
  <section class="ff-screen">
    <h1>Confirmá tu envío</h1>
    <p class="ff-muted">Así se va a ver publicado, con la marca de agua y la leyenda ya incluidas.</p>

    <img :src="previewUrl" alt="Vista previa de tu envío compuesto" class="ff-preview" />

    <label class="ff-consent">
      <input
        type="checkbox"
        :checked="modelValue"
        @change="emit('update:modelValue', $event.target.checked)"
      />
      <span>{{ CONSENT_TEXT }}</span>
    </label>

    <p v-if="error" class="ff-error">{{ error }}</p>

    <div class="ff-actions">
      <button class="ff-button ff-button--secondary" :disabled="submitting" @click="emit('retake')">
        Volver a sacar la foto
      </button>
      <button class="ff-button" :disabled="!modelValue || submitting" @click="emit('submit')">
        {{ submitting ? 'Enviando…' : 'Enviar' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.ff-preview {
  width: 100%;
  border-radius: 12px;
  display: block;
}

.ff-consent {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  font-size: 0.9rem;
}

.ff-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
</style>
