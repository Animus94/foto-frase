const fs = require('fs');

let content = fs.readFileSync('apps/backoffice/src/views/PhrasesEditorView.vue', 'utf8');

const imports = `import { onMounted, ref, watch } from 'vue'
import { usePhrasesEditor, slugify } from '../composables/usePhrasesEditor.js'
import PhraseMarcosManager from './PhraseMarcosManager.vue'`;

content = content.replace("import { onMounted, ref, watch } from 'vue'\nimport { usePhrasesEditor, slugify } from '../composables/usePhrasesEditor.js'", imports);

const methodsAdd = `
  addOption,
  setActive,
  updateLabel,
  updatePrefix,
  save,
  addMarco,
  removeMarco,
  updateMarcoConfig,
  updateMarcoLabel
`;

content = content.replace(/addOption,\s*setActive,\s*updateLabel,\s*updatePrefix,\s*save,/, methodsAdd);

const toggleRef = `
const savedOk = ref(false)
const expandedPhraseId = ref(null)

function toggleMarcos(id) {
  expandedPhraseId.value = expandedPhraseId.value === id ? null : id
}
`;

content = content.replace('const savedOk = ref(false)', toggleRef);

const tableHtml = `
        <tbody>
          <template v-for="option in options" :key="option.id">
            <tr>
              <td>
                <input
                  type="checkbox"
                  :checked="option.active"
                  @change="setActive(option.id, $event.target.checked)"
                />
              </td>
              <td><code>{{ option.id }}</code></td>
              <td>
                <input
                  type="text"
                  :value="option.label"
                  @input="updateLabel(option.id, $event.target.value)"
                />
              </td>
              <td class="ff-muted">{{ prefix }} {{ option.label }}</td>
              <td>
                <button type="button" class="ff-button ff-button--secondary" style="padding: 4px 8px; font-size: 0.8rem;" @click="toggleMarcos(option.id)">
                  {{ expandedPhraseId === option.id ? 'Cerrar Marcos' : 'Marcos (' + (option.marcos ? option.marcos.length : 0) + ')' }}
                </button>
              </td>
            </tr>
            <tr v-if="expandedPhraseId === option.id">
              <td colspan="5" style="padding: 0;">
                <PhraseMarcosManager 
                  :phrase="option" 
                  @add-marco="addMarco" 
                  @remove-marco="removeMarco" 
                  @update-label="updateMarcoLabel" 
                  @update-config="updateMarcoConfig" 
                />
              </td>
            </tr>
          </template>
        </tbody>
`;

content = content.replace(/<tbody>[\s\S]*?<\/tbody>/, tableHtml);
content = content.replace('<th>Vista previa</th>', '<th>Vista previa</th>\n            <th>Marcos</th>');

fs.writeFileSync('apps/backoffice/src/views/PhrasesEditorView.vue', content);
