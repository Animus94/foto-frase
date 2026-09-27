<script setup>
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'

// Small reusable component: renders a scannable QR that links to `url`,
// generated 100% client-side (no third-party API calls) so it still works
// offline/at the venue. Used by Mural.vue and Carrusel.vue in place of the
// old "Sumar mi foto" button — the QR itself stays a real <a href> so it
// also works as a plain link when opened on the visitor's own phone.
const props = defineProps({
  url: { type: String, required: true },
  label: { type: String, default: 'Sumate' },
})

const dataUrl = ref(null)

async function generate() {
  dataUrl.value = await QRCode.toDataURL(props.url, {
    width: 128,
    margin: 1,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  })
}

onMounted(generate)
watch(() => props.url, generate)
</script>

<template>
  <a class="ff-join-qr" :href="url" :aria-label="`${label} — escaneá o tocá para sumar tu foto`">
    <img v-if="dataUrl" class="ff-join-qr__code" :src="dataUrl" width="96" height="96" alt="" />
    <span class="ff-join-qr__label">{{ label }}</span>
  </a>
</template>

<style scoped>
.ff-join-qr {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: var(--ff-ink);
  border: 2px solid var(--ff-green);
  border-radius: 12px;
  padding: 0.5rem 0.9rem;
  background: #fff;
}

.ff-join-qr__code {
  display: block;
  width: 64px;
  height: 64px;
  border-radius: 4px;
}

.ff-join-qr__label {
  font-weight: 700;
  color: var(--ff-green);
}
</style>
