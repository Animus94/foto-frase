<script setup>
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  url: { type: String, required: true },
  label: { type: String, default: 'Sumate' },
})

const dataUrl = ref(null)

async function generate() {
  dataUrl.value = await QRCode.toDataURL(props.url, {
    width: 128,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  })
}

onMounted(generate)
watch(() => props.url, generate)
</script>

<template>
  <a 
    :href="url" 
    :aria-label="`${label} — escaneá o tocá para sumar tu foto`"
    class="inline-flex items-center gap-3 bg-slate-900 hover:bg-slate-800/80 border border-emerald-500/50 rounded-2xl p-3 text-slate-100 transition-all shadow-lg hover:shadow-emerald-950/40"
  >
    <img v-if="dataUrl" class="w-16 h-16 rounded-lg bg-white p-1" :src="dataUrl" alt="QR" />
    <span class="font-bold text-emerald-400 text-sm sm:text-base">{{ label }}</span>
  </a>
</template>