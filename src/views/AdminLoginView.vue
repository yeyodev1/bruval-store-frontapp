<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/services/adminApi'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const isSubmitting = ref(false)

async function login() {
  isSubmitting.value = true
  error.value = ''
  try {
    const { data } = await adminApi.login(email.value, password.value)
    localStorage.setItem('access_token', data.token)
    localStorage.setItem('admin_name', data.user.name)
    await router.replace('/admin')
  } catch (reason: any) {
    error.value = reason.message || 'No pudimos iniciar sesión.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="admin-login"><a href="/" class="brand">bruval<span>.</span></a><section><p class="eyebrow">Administración</p><h1>Las flores<br><i>en movimiento.</i></h1><p>Accede a ventas, entregas y conversaciones con clientes.</p><form @submit.prevent="login"><label>Correo<input v-model.trim="email" required type="email" autocomplete="email"></label><label>Contraseña<input v-model="password" required type="password" autocomplete="current-password"></label><p v-if="error" class="error">{{ error }}</p><button :disabled="isSubmitting" type="submit">{{ isSubmitting ? 'Ingresando...' : 'Entrar al panel' }} <span>→</span></button></form></section></main>
</template>

<style lang="scss" scoped>
.admin-login { min-height:100vh; box-sizing:border-box; padding:30px 5vw; color:#211817; background:#e7d2c7; } .brand { color:inherit; text-decoration:none; font:600 31px/1 $font-secondary; letter-spacing:-2px; } .brand span,.eyebrow { color:#9a4f58; } section { width:min(480px,100%); margin:12vh auto; } .eyebrow { margin:0 0 16px; font:500 10px $font-principal; letter-spacing:1.7px; text-transform:uppercase; } h1 { margin:0; font:500 clamp(55px,8vw,94px)/.82 $font-secondary; letter-spacing:-.07em; } h1 i { padding-left:7vw; } section > p:not(.eyebrow) { margin:30px 0; color:#625551; line-height:1.6; } form { padding:24px; background:#fffaf6; display:flex; flex-direction:column; gap:16px; } label { display:flex; flex-direction:column; gap:7px; color:#706663; font-size:10px; letter-spacing:1px; text-transform:uppercase; } input { box-sizing:border-box; border:1px solid #d9cbc4; padding:12px; color:#211817; background:#fffdfb; font:14px $font-principal; } button { display:flex; justify-content:space-between; border:0; padding:15px; color:#fffaf6; background:#9a4f58; font:600 12px $font-principal; cursor:pointer; } button:disabled { opacity:.6; } button span { font-size:20px; } .error { margin:0; color:#b23d45; font-size:13px; }
</style>
