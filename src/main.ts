import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import './styles/index.scss'
import App from './App.vue'
import { i18n } from './i18n'

createApp(App).use(createPinia()).use(i18n).mount('#app')
