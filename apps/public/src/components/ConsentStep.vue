<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useTurnstile } from '@/composables/useTurnstile.js'

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

// ADR-004: the widget itself gates "Enviar" in addition to the consent
// checkbox above — both must be satisfied before a submission can go out.
const turnstile = useTurnstile()
const turnstileContainer = ref(null)

onMounted(() => {
  turnstile.mount(turnstileContainer.value)
})

// A failed submit means the Worker rejected the token (invalid/expired, or
// already consumed) — Turnstile tokens are single-use, so the widget needs a
// fresh challenge before the user can retry, not just clearing the error.
watch(
  () => props.error,
  (message) => {
    if (message) turnstile.reset()
  },
)

const canSubmit = computed(() => props.modelValue && Boolean(turnstile.token.value) && !props.submitting)

function handleSubmit() {
  emit('submit', turnstile.token.value)
}

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

    <div v-if="turnstile.isConfigured" ref="turnstileContainer" class="ff-turnstile"></div>
    <p v-else class="ff-muted">
      Verificación anti-bot todavía no configurada (falta VITE_TURNSTILE_SITE_KEY) — el envío queda
      deshabilitado hasta que se complete esa configuración (ver docs/deploy/RUNBOOK.md).
    </p>

    <p v-if="turnstile.error.value" class="ff-error">{{ turnstile.error.value }}</p>
    <p v-if="error" class="ff-error">{{ error }}</p>

    <div class="ff-actions">
      <button class="ff-button ff-button--secondary" :disabled="submitting" @click="emit('retake')">
        Volver a sacar la foto
      </button>
      <button class="ff-button" :disabled="!canSubmit" @click="handleSubmit">
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

.ff-turnstile {
  display: flex;
  justify-content: center;
}

.ff-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
</style>
