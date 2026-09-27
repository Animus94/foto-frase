<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true }, // 'selfie' | 'alternative'
  stickerName: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue', 'update:stickerName', 'continue'])

const STICKER_MAX_LENGTH = 20

const canContinue = computed(() => {
  if (props.modelValue === 'selfie') return true
  return props.stickerName.trim().length > 0 && props.stickerName.trim().length <= STICKER_MAX_LENGTH
})
</script>

<template>
  <section class="ff-screen">
    <h1>¿Cómo querés sumarte?</h1>
    <p class="ff-muted">Elegí una opción antes de abrir la cámara.</p>

    <label class="ff-mode-option" :class="{ 'is-selected': modelValue === 'selfie' }">
      <input
        type="radio"
        name="capture-mode"
        value="selfie"
        :checked="modelValue === 'selfie'"
        @change="emit('update:modelValue', 'selfie')"
      />
      <div>
        <strong>Selfie</strong>
        <p class="ff-muted">Sacate una foto con la cámara frontal.</p>
      </div>
    </label>

    <label class="ff-mode-option" :class="{ 'is-selected': modelValue === 'alternative' }">
      <input
        type="radio"
        name="capture-mode"
        value="alternative"
        :checked="modelValue === 'alternative'"
        @change="emit('update:modelValue', 'alternative')"
      />
      <div>
        <strong>Foto de contexto + nombre</strong>
        <p class="ff-muted">Fotografiá un espacio de la universidad y agregale tu nombre.</p>
      </div>
    </label>

    <div v-if="modelValue === 'alternative'" class="ff-sticker-input">
      <label for="sticker-name">Tu nombre (máx. 20 caracteres)</label>
      <input
        id="sticker-name"
        type="text"
        :value="stickerName"
        maxlength="20"
        placeholder="Ej. Ana"
        @input="emit('update:stickerName', $event.target.value)"
      />
    </div>

    <button class="ff-button" :disabled="!canContinue" @click="emit('continue')">Continuar</button>
  </section>
</template>

<style scoped>
.ff-mode-option {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  border: 2px solid #ddd;
  border-radius: 12px;
  padding: 0.9rem;
}

.ff-mode-option.is-selected {
  border-color: var(--ff-green);
  background: rgba(53, 142, 61, 0.06);
}

.ff-mode-option input {
  margin-top: 0.25rem;
}

.ff-sticker-input {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.ff-sticker-input input {
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 1rem;
}
</style>
