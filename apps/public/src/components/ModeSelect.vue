<template>
  <section class="max-w-md w-full flex flex-col gap-5 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl">
    
    <!-- Banner Superior Verde Oscuro -->
    <div class="bg-emerald-950/90 border border-emerald-800/80 p-4 rounded-xl">
      <h1 class="text-2xl font-black text-cyan-400 tracking-wide">Sumate al Mural</h1>
      <p class="text-xs text-emerald-200/90 mt-1">Elegí la modalidad de captura antes de encender la cámara.</p>
    </div>

    <!-- Opciones de Captura -->
    <div class="flex flex-col gap-3">
      <label 
        class="flex gap-3.5 items-start p-4 rounded-xl border transition-all cursor-pointer"
        :class="modelValue === 'selfie' 
          ? 'bg-emerald-950/80 border-emerald-600 shadow-md shadow-emerald-950/50' 
          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'"
      >
        <input
          type="radio"
          name="capture-mode"
          value="selfie"
          :checked="modelValue === 'selfie'"
          class="mt-1 accent-cyan-400"
          @change="emit('update:modelValue', 'selfie')"
        />
        <div>
          <strong class="text-cyan-300 block text-sm font-bold">Selfie personal</strong>
          <p class="text-xs text-slate-300 mt-0.5">Capturá una foto con la cámara frontal.</p>
        </div>
      </label>

      <label 
        class="flex gap-3.5 items-start p-4 rounded-xl border transition-all cursor-pointer"
        :class="modelValue === 'alternative' 
          ? 'bg-emerald-950/80 border-emerald-600 shadow-md shadow-emerald-950/50' 
          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'"
      >
        <input
          type="radio"
          name="capture-mode"
          value="alternative"
          :checked="modelValue === 'alternative'"
          class="mt-1 accent-cyan-400"
          @change="emit('update:modelValue', 'alternative')"
        />
        <div>
          <strong class="text-cyan-300 block text-sm font-bold">Foto de lugar / grupo + nombre</strong>
          <p class="text-xs text-slate-300 mt-0.5">Fotografiá tu universidad, cartel o bandera.</p>
        </div>
      </label>
    </div>

    <!-- Campo Tu Nombre -->
    <div class="flex flex-col gap-1.5">
      <label for="sticker-name" class="text-xs font-bold text-cyan-400 uppercase tracking-wider">Tu Nombre o Agrupación</label>
      <input
        id="sticker-name"
        type="text"
        :value="stickerName"
        maxlength="20"
        placeholder="Ej. Juanchy"
        class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
        @input="emit('update:stickerName', $event.target.value)"
      />
    </div>

    <!-- Botón Principal Celeste -->
    <button 
      class="w-full bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-40 text-slate-950 font-black py-3 px-4 rounded-xl transition-all shadow-lg shadow-cyan-950/50 uppercase tracking-wider text-sm"
      :disabled="!canContinue" 
      @click="emit('continue')"
    >
      Continuar a la cámara
    </button>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  stickerName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'update:stickerName', 'continue'])

const canContinue = computed(() => {
  return Boolean(props.modelValue)
})
</script>