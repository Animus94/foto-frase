import { createApp } from 'vue'
import { router } from './router.js'
import App from './App.vue'
import './assets/main.css'
import { usePwaUpdate } from './composables/usePwaUpdate.js'

createApp(App).use(router).mount('#app')

usePwaUpdate().registerOnce()
