<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  marco: { type: Object, required: true },
  phraseLabel: { type: String, default: 'Con mis amigos/as' },
  prefix: { type: String, default: 'Yo voy a la Marcha...' }
})

const emit = defineEmits(['save', 'cancel'])

const config = ref(JSON.parse(JSON.stringify(props.marco.config)))

// Asegurar valores por defecto para fuentes y fondos
if (!config.value.phrase.font) config.value.phrase.font = 'Montserrat'
if (!config.value.name.font) config.value.name.font = 'Montserrat'

if (config.value.phrase.bgColor === 'transparent' || !config.value.phrase.bgColor) {
  config.value.phrase.bgTransparent = true
  config.value.phrase.bgColor = '#ffffff'
}
if (config.value.name.bgColor === 'transparent' || !config.value.name.bgColor) {
  config.value.name.bgTransparent = true
  config.value.name.bgColor = '#ffffff'
}

if (config.value.phrase.strokeWidth === undefined) config.value.phrase.strokeWidth = 0
if (config.value.phrase.strokeColor === undefined) config.value.phrase.strokeColor = '#000000'
if (config.value.phrase.letterSpacing === undefined) config.value.phrase.letterSpacing = 0
if (config.value.name.strokeWidth === undefined) config.value.name.strokeWidth = 0
if (config.value.name.strokeColor === undefined) config.value.name.strokeColor = '#000000'
if (config.value.name.letterSpacing === undefined) config.value.name.letterSpacing = 0

const availableFonts = [
  'Montserrat', 'Roboto', 'Oswald', 'Playfair Display', 'Pacifico', 'Bebas Neue'
]

const containerRef = ref(null)
const draggingElement = ref(null)

function startDrag(e, element) {
  if (e.type !== 'touchstart') {
    e.preventDefault()
  }
  draggingElement.value = element
  
  const moveHandler = (moveEvent) => {
    if (!draggingElement.value || !containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    let xPx = moveEvent.clientX - rect.left
    let yPx = moveEvent.clientY - rect.top
    let xPct = (xPx / rect.width) * 100
    let yPct = (yPx / rect.height) * 100
    config.value[draggingElement.value].x = Math.round(Math.max(0, Math.min(100, xPct)))
    config.value[draggingElement.value].y = Math.round(Math.max(0, Math.min(100, yPct)))
  }
  
  const touchMoveHandler = (touchEvent) => {
    if (touchEvent.touches.length > 0) {
      touchEvent.preventDefault()
      moveHandler(touchEvent.touches[0])
    }
  }
  
  const upHandler = () => {
    draggingElement.value = null
    window.removeEventListener('mousemove', moveHandler)
    window.removeEventListener('mouseup', upHandler)
    window.removeEventListener('touchmove', touchMoveHandler)
    window.removeEventListener('touchend', upHandler)
  }

  window.addEventListener('mousemove', moveHandler)
  window.addEventListener('mouseup', upHandler)
  window.addEventListener('touchmove', touchMoveHandler, { passive: false })
  window.addEventListener('touchend', upHandler)
}

function getCharStyle(i, len, curve, fontSize, letterSpacing = 0) {
  const anglePerChar = curve / (len - 1 || 1)
  const startAngle = -curve / 2
  const angle = startAngle + i * anglePerChar
  
  // Approximate curve radius based on font size and length, plus letter spacing
  const charWidth = fontSize * 0.45 + letterSpacing
  const L = len * charWidth 
  const angleRad = (Math.abs(curve) * Math.PI) / 180
  
  let R = angleRad > 0.01 ? L / angleRad : 10000
  
  const isRainbow = curve > 0
  const originY = isRainbow ? R : -R
  
  return {
    position: 'absolute',
    transformOrigin: `50% ${originY}px`,
    transform: `translate(-50%, 0) rotate(${angle}deg)`,
    display: 'inline-block'
  }
}

function save() {
  const result = JSON.parse(JSON.stringify(config.value))
  if (result.phrase.bgTransparent) result.phrase.bgColor = 'transparent'
  if (result.name.bgTransparent) result.name.bgColor = 'transparent'
  delete result.phrase.bgTransparent
  delete result.name.bgTransparent
  emit('save', result)
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
        <div class="designer-controls">
          <h3>Texto de Consigna</h3>
          <div class="ff-field">
            <label>Tipografía</label>
            <select v-model="config.phrase.font">
              <option v-for="font in availableFonts" :key="font" :value="font">{{ font }}</option>
            </select>
          </div>
          <div class="ff-field">
            <label>Color (Hex)</label>
            <input type="color" v-model="config.phrase.color" />
          </div>
          <div class="ff-field" style="display:flex; flex-direction:column; gap:0.5rem">
            <label>Color de Fondo</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="color" v-model="config.phrase.bgColor" :disabled="config.phrase.bgTransparent" />
              <label style="display:flex; align-items:center; gap:0.25rem; font-weight:normal; margin:0">
                <input type="checkbox" v-model="config.phrase.bgTransparent" /> Sin fondo
              </label>
            </div>
          </div>
          <div class="ff-field">
            <label>Posición X (%)</label>
            <input type="range" min="0" max="100" v-model.number="config.phrase.x" />
          </div>
          <div class="ff-field">
            <label>Posición Y (%)</label>
            <input type="range" min="0" max="100" v-model.number="config.phrase.y" />
          </div>
          <div class="ff-field">
            <label>Tamaño Fuente</label>
            <input type="number" v-model.number="config.phrase.fontSize" />
          </div>
          <div class="ff-field">
            <label>Curvatura (Grados)</label>
            <input type="range" min="-180" max="180" v-model.number="config.phrase.curve" />
            <div style="text-align:right; font-size:0.8rem; color:#666">{{ config.phrase.curve || 0 }}°</div>
          </div>

          <div class="ff-field">
            <label>Color de Contorno</label>
            <input type="color" v-model="config.phrase.strokeColor" />
          </div>
          <div class="ff-field">
            <label>Grosor de Contorno</label>
            <input type="range" min="0" max="10" v-model.number="config.phrase.strokeWidth" />
            <div style="text-align:right; font-size:0.8rem; color:#666">{{ config.phrase.strokeWidth || 0 }}px</div>
          </div>
          <div class="ff-field">
            <label>Espaciado de letras</label>
            <input type="number" step="0.5" v-model.number="config.phrase.letterSpacing" />
          </div>
          <hr style="margin: 1rem 0; border: none; border-top: 1px solid #ccc;" />

          <h3>Nombre del Participante</h3>
          <div class="ff-field">
            <label>Tipografía</label>
            <select v-model="config.name.font">
              <option v-for="font in availableFonts" :key="font" :value="font">{{ font }}</option>
            </select>
          </div>
          <div class="ff-field">
            <label>Color de Letra</label>
            <input type="color" v-model="config.name.textColor" />
          </div>
          <div class="ff-field" style="display:flex; flex-direction:column; gap:0.5rem">
            <label>Color de Fondo</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="color" v-model="config.name.bgColor" :disabled="config.name.bgTransparent" />
              <label style="display:flex; align-items:center; gap:0.25rem; font-weight:normal; margin:0">
                <input type="checkbox" v-model="config.name.bgTransparent" /> Sin fondo
              </label>
            </div>
          </div>
          <div class="ff-field">
            <label>Posición X (%)</label>
            <input type="range" min="0" max="100" v-model.number="config.name.x" />
          </div>
          <div class="ff-field">
            <label>Posición Y (%)</label>
            <input type="range" min="0" max="100" v-model.number="config.name.y" />
          </div>
          <div class="ff-field">
            <label>Tamaño Fuente</label>
            <input type="number" v-model.number="config.name.fontSize" />
          </div>
          <div class="ff-field">
            <label>Color de Contorno</label>
            <input type="color" v-model="config.name.strokeColor" />
          </div>
          <div class="ff-field">
            <label>Grosor de Contorno</label>
            <input type="range" min="0" max="10" v-model.number="config.name.strokeWidth" />
            <div style="text-align:right; font-size:0.8rem; color:#666">{{ config.name.strokeWidth || 0 }}px</div>
          </div>
          <div class="ff-field">
            <label>Espaciado de letras</label>
            <input type="number" step="0.5" v-model.number="config.name.letterSpacing" />
          </div>
        </div>

        <div class="designer-preview">
          <div class="canvas-container" ref="containerRef" :style="{ backgroundImage: 'url(' + marco.url + ')' }">
            
            <!-- Consigna -->
            <div class="preview-phrase draggable"
                 @mousedown="startDrag($event, 'phrase')"
                 @touchstart="startDrag($event, 'phrase')"
                 :style="{ 
                   left: config.phrase.x + '%', 
                   top: config.phrase.y + '%', 
                   color: config.phrase.color,
                   backgroundColor: (!config.phrase.curve || config.phrase.curve === 0) && !config.phrase.bgTransparent ? config.phrase.bgColor : 'transparent',
                   fontFamily: config.phrase.font,
                   fontSize: config.phrase.fontSize + 'px',
                   letterSpacing: (config.phrase.letterSpacing || 0) + 'px',
                   WebkitTextStroke: (config.phrase.strokeWidth || 0) + 'px ' + (config.phrase.strokeColor || '#000000')
                 }">
              <template v-if="!config.phrase.curve || config.phrase.curve === 0">
                {{ props.prefix }} {{ props.phraseLabel }}
              </template>
              <template v-else>
                <div style="position: relative; width: 0; height: 0; display: flex; justify-content: center;">
                  <span v-for="(char, i) in (props.prefix + ' ' + props.phraseLabel).trim().split('')" :key="i"
                        :style="getCharStyle(i, (props.prefix + ' ' + props.phraseLabel).trim().length, config.phrase.curve, config.phrase.fontSize, config.phrase.letterSpacing || 0)">
                    {{ char === ' ' ? '\u00A0' : char }}
                  </span>
                </div>
              </template>
            </div>
            
            <!-- Nombre -->
            <div class="preview-name draggable"
                 @mousedown="startDrag($event, 'name')"
                 @touchstart="startDrag($event, 'name')"
                 :style="{ 
                   left: config.name.x + '%', 
                   top: config.name.y + '%', 
                   color: config.name.textColor, 
                   backgroundColor: !config.name.bgTransparent ? config.name.bgColor : 'transparent',
                   fontFamily: config.name.font,
                   fontSize: config.name.fontSize + 'px',
                   letterSpacing: (config.name.letterSpacing || 0) + 'px',
                   WebkitTextStroke: (config.name.strokeWidth || 0) + 'px ' + (config.name.strokeColor || '#000000')
                 }"> Tu Nombre o Agrupación </div>
          </div>
        </div>
      </div>

      <div class="designer-actions">
        <span class="ff-muted" style="margin-right:auto; padding-top:0.5rem">💡 Podés arrastrar los textos directamente en la imagen</span>
        <button type="button" class="ff-button ff-button--secondary" @click="cancel">Cancelar</button>
        <button type="button" class="ff-button" @click="save">Guardar Diseño</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Oswald:wght@200..700&family=Pacifico&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');

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

.draggable {
  cursor: grab;
  user-select: none;
}
.draggable:active {
  cursor: grabbing;
}

.preview-phrase {
  position: absolute;
  font-weight: bold;
  transform: translate(-50%, -50%);
  text-align: center;
  white-space: nowrap;
  border-radius: 4px;
  padding: 0.2em 0.5em;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  border: 2px dashed transparent;
  transition: border 0.2s;
}
.preview-phrase:hover {
  border-color: rgba(255,255,255,0.5);
}

.preview-name {
  position: absolute;
  font-weight: bold;
  transform: translate(-50%, -50%);
  padding: 0.2em 0.5em;
  border-radius: 4px;
  white-space: nowrap;
  border: 2px dashed transparent;
  transition: border 0.2s;
}
.preview-name:hover {
  border-color: rgba(255,255,255,0.5);
}

.designer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>
