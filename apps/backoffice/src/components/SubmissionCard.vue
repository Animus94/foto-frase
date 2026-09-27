<script setup>
import { VARIANTS } from '@foto-frase/shared'

const props = defineProps({
  submission: { type: Object, required: true },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['approve', 'reject'])

function variantLabel(variant) {
  return variant === VARIANTS.ALTERNATIVE ? 'Foto de contexto + nombre' : 'Selfie'
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-AR')
  } catch {
    return iso
  }
}
</script>

<template>
  <article class="ff-card ff-submission">
    <img
      :src="submission.secure_url || submission.url"
      :alt="submission.context?.phrase_text || submission.public_id"
      class="ff-submission__image"
    />
    <div class="ff-submission__body">
      <p><strong>{{ submission.context?.phrase_text || '(sin frase)' }}</strong></p>
      <p class="ff-muted">{{ variantLabel(submission.context?.variant) }}</p>
      <p v-if="submission.context?.sticker_name" class="ff-muted">
        Nombre: {{ submission.context.sticker_name }}
      </p>
      <p class="ff-muted">Enviado: {{ formatDate(submission.context?.submitted_at || submission.created_at) }}</p>
      <p class="ff-muted"><code>{{ submission.public_id }}</code></p>
    </div>
    <div class="ff-submission__actions">
      <button
        type="button"
        class="ff-button"
        :disabled="props.busy"
        @click="emit('approve', submission)"
      >
        Aprobar
      </button>
      <button
        type="button"
        class="ff-button ff-button--danger"
        :disabled="props.busy"
        @click="emit('reject', submission)"
      >
        Rechazar
      </button>
    </div>
  </article>
</template>

<style scoped>
/*
 * Stacked by default (image, then text, then actions in a row) so the card
 * stays usable on a narrow viewport. Widens into a 3-column row (image |
 * text | actions) only once there's enough width for it, since the
 * backoffice isn't restricted to a phone-sized layout like apps/public.
 */
.ff-submission {
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

.ff-submission__image {
  width: 100%;
  max-width: 220px;
  height: 180px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
  background: #f0f0f0;
}

.ff-submission__body {
  flex: 1;
  min-width: 0;
}

.ff-submission__body p {
  margin: 0.2rem 0;
}

.ff-submission__actions {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
}

.ff-submission__actions .ff-button {
  flex: 1;
}

@media (min-width: 640px) {
  .ff-submission {
    flex-direction: row;
    align-items: flex-start;
  }

  .ff-submission__image {
    width: 120px;
    max-width: 120px;
  }

  .ff-submission__actions {
    flex-direction: column;
  }

  .ff-submission__actions .ff-button {
    flex: none;
  }
}
</style>
