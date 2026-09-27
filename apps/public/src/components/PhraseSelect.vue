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

    <ul v-else class="ff-phrase-list">
      <li v-for="option in options" :key="option.id">
        <label class="ff-phrase-option" :class="{ 'is-selected': modelValue === option.id }">
          <input
            type="radio"
            name="phrase-option"
            :value="option.id"
            :checked="modelValue === option.id"
            @change="emit('update:modelValue', option.id)"
          />
          {{ option.label }}
        </label>
      </li>
    </ul>

    <button class="ff-button" :disabled="!modelValue" @click="emit('continue')">Continuar</button>
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
