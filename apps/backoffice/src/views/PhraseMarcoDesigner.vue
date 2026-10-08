<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  marco: { type: Object, required: true },
})

const emit = defineEmits(['save', 'cancel'])

const config = ref(JSON.parse(JSON.stringify(props.marco.config)))

function save() {
  emit('save', config.value)
}

function cancel() {
  emit('cancel')
}
</script>

<template>
  <div class="designer-modal">
    <div class="designer-content">
      <h2 style="margin-top:0">Diseñador del Marco: {{ marco.label }}</h2>
      
      <div class="designer-layout">
        <!-- Controles -->
        <div class="designer-controls">
          <h3>Texto de Consigna</h3>
          <div class="ff-field">
            <label>Color (Hex)</label>
            <input type="color" v-model="config.phrase.color" />
          </div>
          <div class="ff-field">
            <label>Posición X (%)</label>
            <input type="range" min="0" max="100" v-model.number="config.phrase.x" />
            <span>{{ config.phrase.x }}%</span>
          </div>
          <div class="ff-field">
            <label>Posición Y (%)</label>
            <input type="range" min="0" max="100" v-model.number="config.phrase.y" />
            <span>{{ config.phrase.y }}%</span>
          </div>
          <div class="ff-field">
            <label>Tamaño Fuente</label>
            <input type="number" v-model.number="config.phrase.fontSize" />
          </div>

          <hr style="margin: 1rem 0; border: none; border-top: 1px solid #ccc;" />

          <h3>Nombre del Participante</h3>
          <div class="ff-field">
            <label>Color de Letra</label>
            <input type="color" v-model="config.name.textColor" />
          </div>
          <div class="ff-field">
            <label>Color de Fondo</label>
            <input type="color" v-model="config.name.bgColor" />
          </div>
          <div class="ff-field">
            <label>Posición X (%)</label>
            <input type="range" min="0" max="100" v-model.number="config.name.x" />
            <span>{{ config.name.x }}%</span>
          </div>
          <div class="ff-field">
            <label>Posición Y (%)</label>
            <input type="range" min="0" max="100" v-model.number="config.name.y" />
            <span>{{ config.name.y }}%</span>
          </div>
          <div class="ff-field">
            <label>Tamaño Fuente</label>
            <input type="number" v-model.number="config.name.fontSize" />
          </div>
        </div>

        <!-- Previsualización Visual -->
        <div class="designer-preview">
          <div class="canvas-container" :style="{ backgroundImage: 'url(' + marco.url + ')' }">
            <div class="preview-phrase" 
                 :style="{ 
                   left: config.phrase.x + '%', 
                   top: config.phrase.y + '%', 
                   color: config.phrase.color, 
                   fontSize: config.phrase.fontSize + 'px' 
                 }">
              Yo voy a la marcha...
            </div>
            <div class="preview-name" 
                 :style="{ 
                   left: config.name.x + '%', 
                   top: config.name.y + '%', 
                   color: config.name.textColor, 
                   backgroundColor: config.name.bgColor,
                   fontSize: config.name.fontSize + 'px' 
                 }">
              Nombre del Participante
            </div>
          </div>
        </div>
      </div>

      <div class="designer-actions">
        <button type="button" class="ff-button ff-button--secondary" @click="cancel">Cancelar</button>
        <button type="button" class="ff-button" @click="save">Guardar Diseño</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.designer-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.designer-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}

.designer-layout {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
}

.designer-controls {
  flex: 0 0 350px;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.designer-controls h3 {
  margin-top: 0;
  font-size: 1rem;
  color: #333;
}

.designer-preview {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  min-height: 600px;
}

.canvas-container {
  width: 450px;
  height: 600px;
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

.preview-phrase {
  position: absolute;
  font-family: 'Montserrat', sans-serif;
  font-weight: bold;
  transform: translate(-50%, -50%);
  text-align: center;
  width: 80%;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.preview-name {
  position: absolute;
  font-family: 'Montserrat', sans-serif;
  font-weight: bold;
  transform: translate(-50%, -50%);
  padding: 0.2em 0.5em;
  border-radius: 4px;
  white-space: nowrap;
}

.designer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>
