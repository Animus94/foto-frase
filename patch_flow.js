const fs = require('fs');
let c = fs.readFileSync('apps/public/src/views/CaptureFlow.vue', 'utf8');

const target = `function resetToCamera() {
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
      variant: VARIANTS.SELFIE,
      phrasePrefix: phrases.prefix.value,
      phraseLabel,
      stickerName: stickerName.value,
      marco: capturedFrame.value.marco,
      mirror: capturedFrame.value.mirror,
    })
    step.value = 'consent'
  } catch {
    // composition.error ya contiene el mensaje de error
  }
}`;

const replacement = `function resetToCamera() {
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

async function handleCaptured(frame) {
  capturedFrame.value = frame
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
    })
    step.value = 'consent'
  } catch {
    // composition.error ya contiene el mensaje de error
  }
}`;

// normalize line endings for matching
c = c.replace(/\r\n/g, '\n');
const targetN = target.replace(/\r\n/g, '\n');

if (c.includes(targetN)) {
  c = c.replace(targetN, replacement);
  
  // also need to update the template side!
  c = c.replace(
`      <ModeSelect
        v-if="step === 'mode'"
        v-model="mode"
        v-model:sticker-name="stickerName"
        @continue="step = 'camera'"
      />`,
`      <ModeSelect
        v-if="step === 'mode'"
        v-model="mode"
        v-model:sticker-name="stickerName"
        @continue="handleModeContinue"
      />`
  );

  c = c.replace(
`      <CameraCapture
        v-else-if="step === 'camera'"
        facing-mode="user"
        :mode="mode"
        :mirror-preview="mode === 'camera'"
        :marcos="campaign.marcos.value"
        @captured="handleCaptured"
      />

      <template v-else-if="step === 'phrase'">`,
`      <template v-else-if="step === 'phrase'">
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
      />`
  );

  // Remove the old phrase step block at the end
  c = c.replace(
`        <PhraseSelect
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

      <ConsentStep`,
`      <ConsentStep`
  );

  fs.writeFileSync('apps/public/src/views/CaptureFlow.vue', c);
  console.log("Patched!");
} else {
  console.log("Target not found!");
}
