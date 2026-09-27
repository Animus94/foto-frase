<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { VARIANTS } from '@foto-frase/shared'
import { usePhrases } from '@/composables/usePhrases.js'
import { useCampaign } from '@/composables/useCampaign.js'
import { useDeviceSubmissions } from '@/composables/useDeviceSubmissions.js'
import { useCanvasComposition } from '@/composables/useCanvasComposition.js'
import { useCloudinaryUpload } from '@/composables/useCloudinaryUpload.js'
import { useShare } from '@/composables/useShare.js'
import ModeSelect from '@/components/ModeSelect.vue'
import CameraCapture from '@/components/CameraCapture.vue'
import PhraseSelect from '@/components/PhraseSelect.vue'
import ConsentStep from '@/components/ConsentStep.vue'

const phrases = usePhrases()
const campaign = useCampaign()
const deviceSubmissions = useDeviceSubmissions()
const composition = useCanvasComposition()
const upload = useCloudinaryUpload()
const share = useShare()

const step = ref('mode') // 'mode' | 'camera' | 'phrase' | 'consent' | 'done'
const mode = ref(VARIANTS.SELFIE) // selfie preselected by default (REQ-001)
const stickerName = ref('')
const capturedFrame = ref(null) // { source, width, height, mirror }
const composed = ref(null) // { blob, previewUrl, width, height }
const selectedPhraseId = ref(null)
const consentChecked = ref(false)
const submitError = ref(null)

const facingMode = computed(() => (mode.value === VARIANTS.SELFIE ? 'user' : 'environment'))

onMounted(() => {
  phrases.load()
  campaign.load()
})

onBeforeUnmount(() => {
  if (composed.value?.previewUrl) URL.revokeObjectURL(composed.value.previewUrl)
})

// Best-effort client-side gates (ADR-002 §5): checked before the flow even
// starts, and the submission-limit re-checked again right before upload.
const isSubmissionLimitReached = computed(
  () => !deviceSubmissions.canSubmit(campaign.maxSubmissionsPerDevice.value),
)

function resetToCamera() {
  if (composed.value?.previewUrl) URL.revokeObjectURL(composed.value.previewUrl)
  composed.value = null
  capturedFrame.value = null
  step.value = 'camera'
}

function handleCaptured(frame) {
  capturedFrame.value = frame
  step.value = 'phrase'
}

async function handlePhraseContinue() {
  const phraseLabel = phrases.resolvePhraseLabel(selectedPhraseId.value)
  if (!phraseLabel || !capturedFrame.value) return
  try {
    composed.value = await composition.composeSubmissionImage({
      source: capturedFrame.value.source,
      sourceWidth: capturedFrame.value.width,
      sourceHeight: capturedFrame.value.height,
      variant: mode.value,
      phrasePrefix: phrases.prefix.value,
      phraseLabel,
      // REQ-002 §1/§2: collected and drawn for both variants now.
      stickerName: stickerName.value,
      mirror: capturedFrame.value.mirror,
    })
    step.value = 'consent'
  } catch {
    // composition.error already holds a user-facing message, shown on the phrase step.
  }
}

/**
 * Shares the Mural's absolute production URL (REQ-002 §7) — built from the
 * current origin + the app's base path, never a hardcoded domain, so it
 * works the same in dev, preview and GitHub Pages.
 */
function shareMural() {
  const muralUrl = `${window.location.origin}${import.meta.env.BASE_URL}mural`
  share.share({
    url: muralUrl,
    title: 'Mural — 5ta Marcha Federal Universitaria',
    text: 'Yo me sumé a la marcha por la universidad pública el 15/10, ahora sumate vos',
  })
}

async function handleSubmit(turnstileToken) {
  submitError.value = null

  // Re-check right before the network call: never rely on Cloudinary to
  // reject the 5th submission (ADR-002 §5).
  if (isSubmissionLimitReached.value) {
    submitError.value = `Ya alcanzaste el máximo de ${campaign.maxSubmissionsPerDevice.value} envíos desde este dispositivo.`
    return
  }

  try {
    const phraseText = phrases.resolvePhraseText(selectedPhraseId.value)
    const result = await upload.uploadSubmission({
      blob: composed.value.blob,
      variant: mode.value,
      phraseId: selectedPhraseId.value,
      phraseText,
      // REQ-002 §1/§2: collected (and now drawn) for both variants.
      stickerName: stickerName.value,
      deviceId: deviceSubmissions.deviceId.value,
      // ADR-004: the Cloudflare Turnstile token ConsentStep.vue's widget
      // just completed — required by the Worker's /upload/sign route.
      turnstileToken,
    })
    deviceSubmissions.recordSubmission({
      public_id: result.publicId,
      submitted_at: result.submittedAt,
    })
    step.value = 'done'
  } catch {
    submitError.value = upload.error.value
  }
}
</script>

<template>
  <section v-if="campaign.isClosed.value" class="ff-screen">
    <h1>La convocatoria a envíos ya cerró</h1>
    <p class="ff-muted">
      Dejamos de aceptar nuevos envíos porque ya pasó la fecha de la marcha. Podés seguir viendo el
      Mural con todo lo que se sumó.
    </p>
  </section>

  <section v-else-if="isSubmissionLimitReached" class="ff-screen">
    <h1>Ya llegaste al máximo de envíos</h1>
    <p class="ff-muted">
      Este dispositivo ya usó sus {{ campaign.maxSubmissionsPerDevice.value }} envíos permitidos.
    </p>
  </section>

  <template v-else>
    <ModeSelect
      v-if="step === 'mode'"
      v-model="mode"
      v-model:sticker-name="stickerName"
      @continue="step = 'camera'"
    />

    <CameraCapture
      v-else-if="step === 'camera'"
      :facing-mode="facingMode"
      :mirror-preview="mode === VARIANTS.SELFIE"
      @captured="handleCaptured"
    />

    <template v-else-if="step === 'phrase'">
      <PhraseSelect
        v-model="selectedPhraseId"
        :prefix="phrases.prefix.value"
        :options="phrases.options.value"
        :loading="phrases.loading.value"
        :error="phrases.error.value"
        @continue="handlePhraseContinue"
      />
      <p v-if="composition.error.value" class="ff-error ff-screen-inline-error">
        {{ composition.error.value }}
      </p>
    </template>

    <ConsentStep
      v-else-if="step === 'consent'"
      :preview-url="composed.previewUrl"
      v-model="consentChecked"
      :submitting="upload.isUploading.value"
      :error="submitError"
      @submit="handleSubmit"
      @retake="resetToCamera"
    />

    <section v-else-if="step === 'done'" class="ff-screen">
      <h1>¡Listo, gracias por sumarte!</h1>
      <p class="ff-muted">
        Tu foto quedó pendiente de revisión. Cuando el equipo la apruebe, va a aparecer en el
        <RouterLink to="/mural">Mural</RouterLink>.
      </p>
      <p class="ff-muted">
        Mientras tanto, ayudá a difundir la campaña compartiendo el Mural con lo que ya se sumó.
      </p>
      <button class="ff-button" :disabled="share.isSharing.value" @click="shareMural">Compartir</button>
      <p v-if="share.feedback.value" class="ff-muted">{{ share.feedback.value }}</p>
      <p v-if="share.error.value" class="ff-error">{{ share.error.value }}</p>
    </section>
  </template>
</template>

<style scoped>
.ff-screen-inline-error {
  padding: 0 1.25rem;
}
</style>
