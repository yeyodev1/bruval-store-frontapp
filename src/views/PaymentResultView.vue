<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeApi } from '@/services/storeApi'

const route = useRoute()
const state = ref<'loading' | 'approved' | 'failed'>('loading')
const message = ref('Estamos verificando tu pago seguro...')
const orderNumber = ref('')
const order = ref<{ items: Array<{ name: string; price: number; quantity: number }>; total: number; customer: { name: string; email: string; phone: string }; delivery: { recipient: string; address: string; mapUrl: string; date: string; timeSlot: string; messageCard: string } } | null>(null)
const formatPrice = (value: number) => `$${value.toFixed(2)}`
const advisorWhatsApp = computed(() => {
  const message = `Hola, acabo de pagar mi pedido Bruval ${orderNumber.value} por PayPhone. Por favor no modifiques este primer mensaje para que un asesor pueda atenderte más rápido.`
  return `https://wa.me/593999480437?text=${encodeURIComponent(message)}`
})

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
    order.value = data.order
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
      <div v-if="state === 'approved' && order" class="order-portal">
        <div class="portal-head"><span>Pago confirmado por PayPhone</span><strong>{{ formatPrice(order.total) }}</strong></div>
        <div v-for="item in order.items" :key="item.name" class="portal-row"><span>{{ item.quantity }} x {{ item.name }}</span><strong>{{ formatPrice(item.price * item.quantity) }}</strong></div>
        <div class="portal-delivery"><strong>Entrega</strong><p>Para {{ order.delivery.recipient }} · {{ order.delivery.date }}, {{ order.delivery.timeSlot }}</p><p>{{ order.delivery.address }}</p><p class="message-card">“{{ order.delivery.messageCard }}”</p><a :href="order.delivery.mapUrl" target="_blank" rel="noopener">Ver ubicación en Google Maps ↗</a></div>
        <div class="portal-next"><strong>¿Qué sigue?</strong><p>Tu pago fue confirmado con PayPhone. Un asesor de Bruval se pondrá en contacto al número confirmado <b>{{ order.customer.phone }}</b>. También enviamos un correo de respaldo a <b>{{ order.customer.email }}</b>.</p><a class="advisor" :href="advisorWhatsApp" target="_blank" rel="noopener">Escribir a un asesor por WhatsApp ↗</a><small>No modifiques el primer mensaje de WhatsApp para que podamos atenderte más rápido.</small></div>
      </div>
      <a href="/" class="button">Volver a Bruval <span>→</span></a>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.result-view { min-height:100vh; box-sizing:border-box; padding:30px 5vw; color:#211817; background:#e7d2c7; display:flex; flex-direction:column; } .brand { color:inherit; text-decoration:none; font:600 31px/1 $font-secondary; letter-spacing:-2px; } .brand span,.eyebrow { color:#9a4f58; } section { width:min(650px,100%); margin:auto; } .eyebrow { margin:0 0 18px; font:500 10px $font-principal; letter-spacing:1.7px; text-transform:uppercase; } h1 { margin:0; font:500 clamp(64px,9vw,120px)/.8 $font-secondary; letter-spacing:-.07em; } h1 i { padding-left:8vw; } .copy { max-width:390px; margin:42px 0 18px; color:#564643; line-height:1.6; } .order { margin:18px 0; font:12px 'DM Mono',monospace; } .button,.advisor { min-width:220px; display:flex; justify-content:space-between; padding:16px 18px; color:#fffaf6; background:#9a4f58; text-decoration:none; font:600 12px $font-principal; } .button span { font-size:20px; } .spinner { width:27px; height:27px; margin-bottom:28px; border:2px solid #c6aaa0; border-top-color:#9a4f58; border-radius:50%; animation:spin .8s linear infinite; } .order-portal { margin:28px 0; padding:22px; background:#fffaf6; font-size:13px; } .portal-head,.portal-row { display:flex; justify-content:space-between; gap:18px; padding:9px 0; border-bottom:1px solid #eaded7; } .portal-head { color:#9a4f58; text-transform:uppercase; letter-spacing:1px; font-size:10px; } .portal-delivery,.portal-next { margin-top:18px; padding-top:18px; border-top:1px solid #eaded7; line-height:1.55; } .portal-delivery p,.portal-next p { margin:6px 0; color:#625551; } .portal-delivery a { display:inline-block; margin-top:6px; color:#9a4f58; font-weight:600; } .advisor { width:max-content; margin-top:16px; background:#427a55; } small { display:block; margin-top:10px; color:#8a7771; line-height:1.4; } .message-card { font-family:$font-secondary; font-size:17px; } @keyframes spin { to { transform:rotate(360deg); } }
</style>
