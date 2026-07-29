<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeApi } from '@/services/storeApi'

const route = useRoute()
const state = ref<'loading' | 'approved' | 'failed'>('loading')
const message = ref('Estamos verificando tu pago seguro...')
const orderNumber = ref('')

onMounted(async () => {
  const id = String(route.query.id || '')
  const clientTransactionId = String(route.query.clientTransactionId || '')
  if (!id || !clientTransactionId) {
    state.value = 'failed'
    message.value = 'No encontramos una referencia de pago válida.'
    return
  }
  try {
    const { data } = await storeApi.confirmPayphonePayment(id, clientTransactionId)
    orderNumber.value = data.orderNumber
    state.value = data.approved ? 'approved' : 'failed'
    message.value = data.approved ? 'Tu pago fue aprobado. Estamos preparando algo muy especial.' : data.message
  } catch (error: any) {
    state.value = 'failed'
    message.value = error.message || 'No pudimos confirmar el pago. Escríbenos para ayudarte.'
  }
})
</script>

<template>
  <main class="result-view">
    <a href="/" class="brand">bruval<span>.</span></a>
    <section>
      <div v-if="state === 'loading'" class="spinner"></div>
      <p class="eyebrow">{{ state === 'approved' ? 'Pago confirmado' : state === 'failed' ? 'Revisión necesaria' : 'Pago seguro' }}</p>
      <h1 v-if="state === 'approved'">Gracias por<br><i>elegir sentir.</i></h1>
      <h1 v-else-if="state === 'failed'">Algo necesita<br><i>atención.</i></h1>
      <h1 v-else>Un momento<br><i>floreciendo.</i></h1>
      <p class="copy">{{ message }}</p>
      <p v-if="orderNumber" class="order">Pedido {{ orderNumber }}</p>
      <a href="/" class="button">Volver a Bruval <span>→</span></a>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.result-view { min-height:100vh; box-sizing:border-box; padding:30px 5vw; color:#211817; background:#e7d2c7; display:flex; flex-direction:column; } .brand { color:inherit; text-decoration:none; font:600 31px/1 $font-secondary; letter-spacing:-2px; } .brand span,.eyebrow { color:#9a4f58; } section { width:min(650px,100%); margin:auto; } .eyebrow { margin:0 0 18px; font:500 10px $font-principal; letter-spacing:1.7px; text-transform:uppercase; } h1 { margin:0; font:500 clamp(64px,9vw,120px)/.8 $font-secondary; letter-spacing:-.07em; } h1 i { padding-left:8vw; } .copy { max-width:390px; margin:42px 0 18px; color:#564643; line-height:1.6; } .order { margin-bottom:28px; font:12px 'DM Mono',monospace; } .button { min-width:220px; display:flex; justify-content:space-between; padding:16px 18px; color:#fffaf6; background:#9a4f58; text-decoration:none; font:600 12px $font-principal; } .button span { font-size:20px; } .spinner { width:27px; height:27px; margin-bottom:28px; border:2px solid #c6aaa0; border-top-color:#9a4f58; border-radius:50%; animation:spin .8s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } }
</style>
