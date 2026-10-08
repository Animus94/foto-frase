const fs = require('fs');
let c = fs.readFileSync('apps/public/src/views/CaptureFlow.vue', 'utf8');

c = c.replace(
  "import CameraCapture from '@/components/CameraCapture.vue'",
  "import CameraCapture from '@/components/CameraCapture.vue'\nimport PhotoAdjuster from '@/components/PhotoAdjuster.vue'"
);

const targetReplace = `async function handleCaptured(frame) {
  capturedFrame.value = frame
  const phraseLabel = phrases.resolvePhraseLabel(selectedPhraseId.value)
  if (!phraseLabel) return
  try {
    composed.value = await composition.composeSubmissionImage({`;

const replacement = `function handleCaptured(frame) {
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
    composed.value = await composition.composeSubmissionImage({`;

c = c.replace(targetReplace, replacement);

const templateTarget = `      <CameraCapture
        v-else-if="step === 'camera'"
        facing-mode="user"
        :mode="mode"
        :mirror-preview="mode === 'camera'"
        :marcos="phrases.options.value.find(o => o.id === selectedPhraseId)?.marcos || []"
        @captured="handleCaptured"
      />

      <ConsentStep`;

const templateReplacement = `      <CameraCapture
        v-else-if="step === 'camera'"
        facing-mode="user"
        :mode="mode"
        :mirror-preview="mode === 'camera'"
        :marcos="phrases.options.value.find(o => o.id === selectedPhraseId)?.marcos || []"
        @captured="handleCaptured"
      />

      <PhotoAdjuster
        v-else-if="step === 'adjust'"
        :src="capturedFrame.srcUrl"
        :marco-url="capturedFrame.marco?.url"
        :mirror="capturedFrame.mirror"
        @confirm="handleAdjustConfirm"
        @cancel="step = 'camera'"
      />

      <ConsentStep`;

c = c.replace(templateTarget, templateReplacement);
fs.writeFileSync('apps/public/src/views/CaptureFlow.vue', c);
