<script setup>
defineProps({
  prefix: { type: String, required: true },
  options: { type: Array, required: true }, // [{ id, label, active }]
  modelValue: { type: String, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'continue'])
</script>

<template>
  <section class="ff-screen">
    <h1>Elegí tu frase</h1>
    <p class="ff-phrase-prefix">{{ prefix }}</p>

    <p v-if="loading" class="ff-muted">Cargando frases…</p>
    <p v-else-if="error" class="ff-error">{{ error }}</p>

    <ul v-else class="flex flex-col gap-3 mt-4">
      <li v-for="option in options" :key="option.id">
        <label 
          class="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all"
          :class="modelValue === option.id ? 'border-cyan-400 bg-cyan-950/30' : 'border-slate-800 bg-slate-900'"
        >
          <input
            type="radio"
            name="phrase-option"
            :value="option.id"
            :checked="modelValue === option.id"
            class="accent-cyan-400"
            @change="emit('update:modelValue', option.id)"
          />
          <span class="text-slate-200 font-medium">{{ option.label }}</span>
        </label>
      </li>
    </ul>

    <button 
      class="w-full mt-6 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg" 
      :disabled="!modelValue" 
      @click="emit('continue')"
    >
      Continuar
    </button>
  </section>
</template>

<style scoped>
.ff-phrase-prefix {
  font-weight: 700;
  color: var(--ff-green);
}

.ff-phrase-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.ff-phrase-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: 2px solid #ddd;
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
}

.ff-phrase-option.is-selected {
  border-color: var(--ff-green);
  background: rgba(53, 142, 61, 0.06);
}
</style>
