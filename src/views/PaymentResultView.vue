<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeApi } from '@/services/storeApi'

const route = useRoute()
const state = ref<'loading' | 'approved' | 'failed'>('loading')
const message = ref('Estamos verificando tu pago seguro...')
const orderNumber = ref('')
const isAdvisorModalOpen = ref(false)
const order = ref<{ items: Array<{ name: string; price: number; quantity: number }>; total: number; customer: { name: string; email: string; phone: string }; delivery: { recipient: string; address: string; mapUrl: string; date: string; timeSlot: string; messageCard: string } } | null>(null)
const formatPrice = (value: number) => `$${value.toFixed(2)}`
const advisorWhatsApp = computed(() => {
  const details = order.value
  const items = details?.items.map((item) => `- ${item.quantity} x ${item.name}: ${formatPrice(item.price * item.quantity)}`).join('\n') || ''
  const message = [
    `Hola, equipo Bruval. Ya realicé el pago de mi pedido ${orderNumber.value} por PayPhone.`,
    '',
    'Gracias por acompañarme en este momento especial. Quisiera confirmar que la coordinación de mi entrega está en orden.',
    '',
    `Resumen de mi pedido:\n${items}`,
    details ? `Total pagado: ${formatPrice(details.total)}` : '',
    details ? `Entrega: ${details.delivery.date}, ${details.delivery.timeSlot}` : '',
    details ? `Recibe: ${details.delivery.recipient}` : '',
    details ? `Dirección: ${details.delivery.address}` : '',
    details?.delivery.mapUrl ? `Ubicación: ${details.delivery.mapUrl}` : '',
    details?.delivery.messageCard ? `Mensaje de tarjeta: ${details.delivery.messageCard}` : '',
    '',
    'Quedo atento/a a su confirmación. Muchas gracias.',
  ].filter(Boolean).join('\n')
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
        <div class="portal-next"><strong>¿Qué sigue?</strong><p>Tu pago fue confirmado con PayPhone. Un asesor de Bruval se pondrá en contacto al número confirmado <b>{{ order.customer.phone }}</b>. También enviamos un correo de respaldo a <b>{{ order.customer.email }}</b>.</p><button class="advisor" type="button" @click="isAdvisorModalOpen = true">Escribir a un asesor por WhatsApp ↗</button><small>El mensaje incluye tu pedido y los datos de entrega para que podamos ayudarte de inmediato.</small></div>
      </div>
      <a href="/" class="button">Volver a Bruval <span>→</span></a>
    </section>
    <Transition name="fade"><div v-if="isAdvisorModalOpen" class="backdrop" @click="isAdvisorModalOpen = false"></div></Transition>
    <Transition name="modal"><aside v-if="isAdvisorModalOpen" class="advisor-modal"><button type="button" @click="isAdvisorModalOpen = false">×</button><p class="eyebrow">Estamos contigo</p><h2>Tu entrega<br>está en buenas manos.</h2><p>Prepararemos un mensaje con el resumen de tu pedido para que nuestro equipo pueda orientarte y coordinar contigo sin pedirte los datos otra vez.</p><a :href="advisorWhatsApp" target="_blank" rel="noopener">Abrir WhatsApp con mi resumen →</a></aside></Transition>
  </main>
</template>

<style lang="scss" scoped>
.result-view { min-height:100vh; box-sizing:border-box; padding:30px 5vw; color:#211817; background:#e7d2c7; display:flex; flex-direction:column; } .brand { color:inherit; text-decoration:none; font:600 31px/1 $font-secondary; letter-spacing:-2px; } .brand span,.eyebrow { color:#9a4f58; } section { width:min(650px,100%); margin:auto; } .eyebrow { margin:0 0 18px; font:500 10px $font-principal; letter-spacing:1.7px; text-transform:uppercase; } h1,h2 { margin:0; font-family:$font-secondary; font-weight:500; letter-spacing:-.07em; } h1 { font-size:clamp(64px,9vw,120px); line-height:.8; } h1 i { padding-left:8vw; } .copy { max-width:390px; margin:42px 0 18px; color:#564643; line-height:1.6; } .order { margin:18px 0; font:12px 'DM Mono',monospace; } .button,.advisor,.advisor-modal a { min-width:220px; display:flex; justify-content:space-between; padding:16px 18px; border:0; color:#fffaf6; background:#9a4f58; text-decoration:none; font:600 12px $font-principal; cursor:pointer; } .button span { font-size:20px; } .spinner { width:27px; height:27px; margin-bottom:28px; border:2px solid #c6aaa0; border-top-color:#9a4f58; border-radius:50%; animation:spin .8s linear infinite; } .order-portal { margin:28px 0; padding:22px; background:#fffaf6; font-size:13px; } .portal-head,.portal-row { display:flex; justify-content:space-between; gap:18px; padding:9px 0; border-bottom:1px solid #eaded7; } .portal-head { color:#9a4f58; text-transform:uppercase; letter-spacing:1px; font-size:10px; } .portal-delivery,.portal-next { margin-top:18px; padding-top:18px; border-top:1px solid #eaded7; line-height:1.55; } .portal-delivery p,.portal-next p { margin:6px 0; color:#625551; } .portal-delivery a { display:inline-block; margin-top:6px; color:#9a4f58; font-weight:600; } .advisor { width:max-content; margin-top:16px; background:#427a55; } small { display:block; margin-top:10px; color:#8a7771; line-height:1.4; } .message-card { font-family:$font-secondary; font-size:17px; } .backdrop { position:fixed; inset:0; z-index:5; background:rgba(33,24,23,.35); backdrop-filter:blur(4px); } .advisor-modal { position:fixed; z-index:6; top:50%; left:50%; width:min(410px,88vw); box-sizing:border-box; padding:42px 30px 30px; transform:translate(-50%,-50%); background:#fffaf6; } .advisor-modal > button { position:absolute; top:12px; right:12px; width:32px; height:32px; border:0; border-radius:50%; background:#eaded7; font-size:22px; cursor:pointer; } .advisor-modal h2 { font-size:48px; line-height:.86; } .advisor-modal p:not(.eyebrow) { margin:24px 0; color:#625551; line-height:1.6; } .fade-enter-active,.fade-leave-active { transition:opacity .2s; } .fade-enter-from,.fade-leave-to { opacity:0; } .modal-enter-active,.modal-leave-active { transition:opacity .2s,transform .25s; } .modal-enter-from,.modal-leave-to { opacity:0; transform:translate(-50%,-46%); } @keyframes spin { to { transform:rotate(360deg); } }
</style>
