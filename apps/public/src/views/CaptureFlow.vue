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
import PhotoAdjuster from '@/components/PhotoAdjuster.vue'
import PhraseSelect from '@/components/PhraseSelect.vue'
import ConsentStep from '@/components/ConsentStep.vue'

const phrases = usePhrases()
const campaign = useCampaign()
const deviceSubmissions = useDeviceSubmissions()
const composition = useCanvasComposition()
const upload = useCloudinaryUpload()
const share = useShare()

const step = ref('mode')
const mode = ref('camera') // 'camera' or 'gallery'
const stickerName = ref('')
const capturedFrame = ref(null)
const composed = ref(null)
const selectedPhraseId = ref(null)
const consentChecked = ref(false)
const submitError = ref(null)

onMounted(() => {
  phrases.load()
  campaign.load()
})

onBeforeUnmount(() => {
  if (composed.value?.previewUrl) URL.revokeObjectURL(composed.value.previewUrl)
})

const isSubmissionLimitReached = computed(
  () => !deviceSubmissions.canSubmit(campaign.maxSubmissionsPerDevice.value),
)

function resetToCamera() {
  if (composed.value?.previewUrl) URL.revokeObjectURL(composed.value.previewUrl)
  composed.value = null
  capturedFrame.value = null
  step.value = 'camera'
}

function handleModeContinue() {
  step.value = 'phrase'
}

function handlePhraseContinue() {
  const phraseLabel = phrases.resolvePhraseLabel(selectedPhraseId.value)
  if (!phraseLabel) return
  step.value = 'camera'
}

function handleCaptured(frame) {
  // Convert source (image/video element) to ObjectURL for the adjuster
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(frame.source, 0, 0, frame.width, frame.height);
  canvas.toBlob(blob => {
    frame.srcUrl = URL.createObjectURL(blob);
    capturedFrame.value = frame;
    step.value = 'adjust';
  });
}

async function handleAdjustConfirm(cropTransform) {
  capturedFrame.value.cropTransform = cropTransform;
  const phraseLabel = phrases.resolvePhraseLabel(selectedPhraseId.value)
  if (!phraseLabel) return
  try {
    composed.value = await composition.composeSubmissionImage({
      source: capturedFrame.value.source,
      sourceWidth: capturedFrame.value.width,
      sourceHeight: capturedFrame.value.height,
      variant: VARIANTS.SELFIE,
      phrasePrefix: phrases.prefix.value,
      phraseLabel,
      stickerName: stickerName.value,
      marco: capturedFrame.value.marco,
      mirror: capturedFrame.value.mirror,
      cropTransform: capturedFrame.value.cropTransform,
    })
    step.value = 'consent'
  } catch {
    // composition.error ya contiene el mensaje de error
  }
}

function shareMural() {
  const muralUrl = `${window.location.origin}${import.meta.env.BASE_URL}mural`
  share.share({
    url: muralUrl,
    title: 'Mural — 5ta Marcha Federal Universitaria',
    text: 'Yo me sumé a la marcha por la universidad pública, ¡sumate vos también!',
  })
}

async function handleSubmit(turnstileToken) {
  submitError.value = null

  if (isSubmissionLimitReached.value) {
    submitError.value = `Ya alcanzaste el máximo de ${campaign.maxSubmissionsPerDevice.value} envíos desde este dispositivo.`
    return
  }

  try {
    const phraseText = phrases.resolvePhraseText(selectedPhraseId.value)
    const result = await upload.uploadSubmission({
      blob: composed.value.blob,
      variant: VARIANTS.SELFIE,
      phraseId: selectedPhraseId.value,
      phraseText,
      stickerName: stickerName.value,
      deviceId: deviceSubmissions.deviceId.value,
      turnstileToken,
    })
    deviceSubmissions.recordSubmission({
      public_id: result.publicId,
      submitted_at: result.submittedAt,
    })
    step.value = 'done'
  } catch (err) {
    submitError.value = upload.error.value || (err instanceof Error ? err.message : String(err))
  }
}
</script>

<template>
  <div class="flex-1 w-full flex items-center justify-center p-4 md:p-6">
    
    <!-- Convocatoria Cerrada -->
    <section v-if="campaign.isClosed.value" class="max-w-md w-full bg-emerald-950 border border-emerald-800/80 p-6 rounded-2xl shadow-2xl text-center">
      <h1 class="text-2xl font-black text-cyan-400 mb-3 tracking-wide">La convocatoria ya cerró</h1>
      <p class="text-sm text-emerald-200/90 leading-relaxed">
        Pasó la fecha de la marcha y dejamos de aceptar nuevos envíos. Podés seguir recorriendo las fotos en el
        <RouterLink to="/mural" class="text-cyan-300 underline font-semibold hover:text-cyan-200">Mural</RouterLink>.
      </p>
    </section>

    <!-- Límite alcanzado -->
    <section v-else-if="isSubmissionLimitReached" class="max-w-md w-full bg-emerald-950 border border-emerald-800/80 p-6 rounded-2xl shadow-2xl text-center">
      <h1 class="text-2xl font-black text-cyan-400 mb-3 tracking-wide">Límite de envíos alcanzado</h1>
      <p class="text-sm text-emerald-200/90 leading-relaxed">
        Este dispositivo ya realizó el máximo de {{ campaign.maxSubmissionsPerDevice.value }} envíos permitidos.
      </p>
    </section>

    <!-- Flujo Interactivo de Pasos -->
    <template v-else>
      <ModeSelect
        v-if="step === 'mode'"
        v-model="mode"
        v-model:sticker-name="stickerName"
        @continue="handleModeContinue"
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
        <p v-if="composition.error.value" class="mt-3 text-xs text-rose-400 bg-rose-950/60 p-3 rounded-xl border border-rose-800">
          {{ composition.error.value }}
        </p>
      </template>

      <CameraCapture
        v-else-if="step === 'camera'"
        facing-mode="user"
        :mode="mode"
        :mirror-preview="mode === 'camera'"
        :marcos="phrases.options.value.find(o => o.id === selectedPhraseId)?.marcos || []"
        @captured="handleCaptured"
      />
      <ConsentStep
        v-else-if="step === 'consent'"
        :preview-url="composed.previewUrl"
        v-model="consentChecked"
        :submitting="upload.isUploading.value"
        :error="submitError"
        @submit="handleSubmit"
        @retake="resetToCamera"
      />

      <!-- Pantalla Final: Foto enviada -->
      <section v-else-if="step === 'done'" class="max-w-md w-full bg-emerald-950 border border-emerald-800/80 p-6 rounded-2xl shadow-2xl text-center space-y-4">
        <div class="bg-emerald-900/80 border border-emerald-700/60 p-4 rounded-xl">
          <h1 class="text-2xl font-black text-cyan-300">¡Foto enviada con éxito!</h1>
          <p class="text-xs text-emerald-200 mt-1">
            Quedó pendiente de moderación. Apenas se apruebe aparecerá publicada en el Mural.
          </p>
        </div>

        <button
          class="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-cyan-950/50"
          :disabled="share.isSharing.value"
          @click="shareMural"
        >
          Compartir Mural
        </button>

        <p v-if="share.feedback.value" class="text-xs text-emerald-300">{{ share.feedback.value }}</p>
        <p v-if="share.error.value" class="text-xs text-rose-400">{{ share.error.value }}</p>
      </section>
    </template>
  </div>
</template>