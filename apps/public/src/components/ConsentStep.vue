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

    <label class="flex gap-3 items-start p-4 bg-slate-900 border border-slate-700 rounded-xl mt-4 cursor-pointer">
      <input
        type="checkbox"
        :checked="modelValue"
        class="mt-1 accent-cyan-400 w-4 h-4"
        @change="emit('update:modelValue', $event.target.checked)"
      />
      <span class="text-sm text-slate-300 leading-tight">{{ CONSENT_TEXT }}</span>
    </label>

    <div v-if="turnstile.isConfigured" ref="turnstileContainer" class="flex justify-center my-4"></div>
    <p v-else class="text-xs text-rose-400 mt-4 bg-rose-950/40 p-3 rounded-lg border border-rose-900">
      Verificación anti-bot todavía no configurada (falta VITE_TURNSTILE_SITE_KEY) — el envío queda
      deshabilitado hasta que se complete esa configuración (ver docs/deploy/RUNBOOK.md).
    </p>

    <p v-if="turnstile.error.value" class="text-xs text-rose-400 mt-2">{{ turnstile.error.value }}</p>
    <p v-if="error" class="text-xs text-rose-400 mt-2">{{ error }}</p>

    <div class="flex flex-col gap-3 mt-6">
      <button class="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg" :disabled="!canSubmit" @click="handleSubmit">
        {{ submitting ? 'Enviando…' : 'Enviar' }}
      </button>
      <button class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-4 rounded-xl transition-all" :disabled="submitting" @click="emit('retake')">
        Volver a sacar la foto
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
