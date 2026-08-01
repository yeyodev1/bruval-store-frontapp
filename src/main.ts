import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@/styles/global.scss'

window.addEventListener('auth:token-expired', () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('admin_name')

  if (router.currentRoute.value.path !== '/admin/login') {
    router.replace('/admin/login')
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
