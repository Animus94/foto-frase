const fs = require('fs');

let content = fs.readFileSync('apps/backoffice/src/composables/usePhrasesEditor.js', 'utf8');

const toAdd = `
  function addMarco(phraseId, url, label, config = null) {
    const option = phraseOptions.value.find((item) => item.id === phraseId)
    if (!option) return
    if (!option.marcos) option.marcos = []
    
    option.marcos.push({
      id: "marco-" + Date.now(),
      url,
      label,
      config: config || {
         phrase: { x: 50, y: 15, color: '#facc15', font: 'Montserrat', fontSize: 24, width: 300 },
         name: { x: 50, y: 80, textColor: '#ffffff', bgColor: '#022c22', font: 'Montserrat', fontSize: 16 }
      }
    })
  }

  function removeMarco(phraseId, marcoId) {
    const option = phraseOptions.value.find((item) => item.id === phraseId)
    if (!option || !option.marcos) return
    option.marcos = option.marcos.filter((m) => m.id !== marcoId)
  }

  function updateMarcoConfig(phraseId, marcoId, newConfig) {
     const option = phraseOptions.value.find((item) => item.id === phraseId)
     if (!option || !option.marcos) return
     const marco = option.marcos.find((m) => m.id === marcoId)
     if (marco) marco.config = newConfig
  }

  function updateMarcoLabel(phraseId, marcoId, newLabel) {
     const option = phraseOptions.value.find((item) => item.id === phraseId)
     if (!option || !option.marcos) return
     const marco = option.marcos.find((m) => m.id === marcoId)
     if (marco) marco.label = newLabel
  }
`;

content = content.replace('updatePrefix,', 'addMarco, removeMarco, updateMarcoConfig, updateMarcoLabel, updatePrefix,');
content = content.replace('updateLabel,', 'updateLabel,\\n' + toAdd);

fs.writeFileSync('apps/backoffice/src/composables/usePhrasesEditor.js', content);
