<script setup lang="ts">
import { ref } from 'vue'
import { storeApi } from '@/services/storeApi'

interface Order {
  orderNumber: string
  items: Array<{ name: string; price: number; quantity: number }>
  total: number
  status: string
  createdAt: string
  delivery: { recipient: string; address: string; date: string; timeSlot: string; mapUrl: string; messageCard: string }
}

const ADVISOR_WHATSAPP = '593999480437'
const value = ref('')
const orders = ref<Order[]>([])
const openOrderNumber = ref<string | null>(null)
const error = ref('')
const loading = ref(false)
const formatPrice = (price: number) => `$${price.toFixed(2)}`
const formatDate = (date: string) => new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(date))
const statusLabel = (status: string) => ({ awaiting_payment: 'Pago pendiente', paid: 'Pago confirmado', payment_failed: 'Pago no aprobado' }[status] || 'En revisión')

function whatsappLink(order: Order) {
  const items = order.items.map((item) => `- ${item.quantity} x ${item.name}: ${formatPrice(item.price * item.quantity)}`).join('\n')
  const message = [
    `Hola, necesito ayuda con mi pedido Bruval ${order.orderNumber}.`,
    '',
    `Estado: ${statusLabel(order.status)}`,
    `Productos:\n${items}`,
    `Total: ${formatPrice(order.total)}`,
    `Entrega: ${order.delivery.date}, ${order.delivery.timeSlot}`,
    `Para: ${order.delivery.recipient}`,
    `Dirección: ${order.delivery.address}`,
    `Ubicación: ${order.delivery.mapUrl}`,
    order.delivery.messageCard ? `Tarjeta: ${order.delivery.messageCard}` : '',
  ].filter(Boolean).join('\n')

  return `https://wa.me/${ADVISOR_WHATSAPP}?text=${encodeURIComponent(message)}`
}

async function lookup() {
  loading.value = true
  error.value = ''
  openOrderNumber.value = null
  try {
    const { data } = await storeApi.lookupOrders(value.value)
    orders.value = data
    if (!data.length) error.value = 'No encontramos pedidos con esos datos.'
  } catch (reason: any) {
    error.value = reason.message || 'No pudimos buscar tu pedido.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="lookup">
    <a href="/" class="brand">bruval<span>.</span></a>
    <section>
      <p class="eyebrow">Tu pedido</p>
      <h1>¿Ya tienes<br><i>un pedido?</i></h1>
      <p>Encuéntralo con el correo de compra o el número de teléfono tal como aparece en WhatsApp.</p>
      <form @submit.prevent="lookup">
        <input v-model.trim="value" required placeholder="correo@ejemplo.com o +593..." autocomplete="email">
        <button :disabled="loading" type="submit">{{ loading ? 'Buscando...' : 'Buscar mi pedido' }} →</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>

      <article v-for="order in orders" :key="order.orderNumber">
        <button class="order-summary" type="button" :aria-expanded="openOrderNumber === order.orderNumber" @click="openOrderNumber = openOrderNumber === order.orderNumber ? null : order.orderNumber">
          <span><b>Pedido {{ order.orderNumber }}</b><small>{{ statusLabel(order.status) }}</small></span>
          <span><strong>{{ formatPrice(order.total) }}</strong><small>{{ openOrderNumber === order.orderNumber ? 'Ocultar detalle ↑' : 'Ver detalle ↓' }}</small></span>
        </button>

        <div v-if="openOrderNumber === order.orderNumber" class="order-detail">
          <p class="created">Comprado el {{ formatDate(order.createdAt) }}</p>
          <div class="items">
            <div v-for="item in order.items" :key="item.name" class="item"><span>{{ item.quantity }} x {{ item.name }}</span><strong>{{ formatPrice(item.price * item.quantity) }}</strong></div>
          </div>
          <div class="delivery">
            <strong>Entrega</strong>
            <p>Para {{ order.delivery.recipient }} · {{ order.delivery.date }}, {{ order.delivery.timeSlot }}</p>
            <p>{{ order.delivery.address }}</p>
            <p v-if="order.delivery.messageCard" class="message-card">“{{ order.delivery.messageCard }}”</p>
            <a :href="order.delivery.mapUrl" target="_blank" rel="noopener">Ver ubicación de entrega ↗</a>
          </div>
          <a class="whatsapp" :href="whatsappLink(order)" target="_blank" rel="noopener">Necesito ayuda por WhatsApp ↗</a>
        </div>
      </article>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.lookup { min-height:100vh; box-sizing:border-box; padding:30px 5vw 80px; color:#211817; background:#e7d2c7; }
.brand { color:inherit; text-decoration:none; font:600 31px/1 $font-secondary; letter-spacing:-2px; }
.brand span,.eyebrow { color:#9a4f58; }
section { width:min(620px,100%); margin:12vh auto; }
.eyebrow { margin:0 0 16px; font:500 10px $font-principal; letter-spacing:1.7px; text-transform:uppercase; }
h1 { margin:0; font:500 clamp(58px,9vw,110px)/.8 $font-secondary; letter-spacing:-.07em; }
h1 i { padding-left:8vw; }
section > p { max-width:390px; margin:30px 0; color:#625551; line-height:1.6; }
form { display:flex; gap:8px; padding:12px; background:#fffaf6; }
input { flex:1; min-width:0; border:1px solid #d9cbc4; padding:12px; font:14px $font-principal; }
form button,.whatsapp { border:0; padding:12px 16px; color:#fffaf6; background:#9a4f58; font:600 12px $font-principal; cursor:pointer; text-decoration:none; }
.error { color:#b23d45; }
article { margin-top:14px; background:#fffaf6; }
.order-summary { width:100%; display:flex; justify-content:space-between; gap:18px; border:0; padding:20px; color:inherit; background:transparent; text-align:left; cursor:pointer; }
.order-summary span { display:flex; flex-direction:column; gap:6px; }
.order-summary span:last-child { align-items:flex-end; }
.order-summary b { font:600 12px 'DM Mono',monospace; }
.order-summary small,.created { color:#706663; font-size:11px; }
.order-detail { padding:0 20px 20px; border-top:1px solid #eaded7; font-size:13px; }
.created { margin:14px 0; }
.items { border-top:1px solid #eaded7; }
.item { display:flex; justify-content:space-between; gap:16px; padding:10px 0; border-bottom:1px solid #eaded7; }
.delivery { margin-top:18px; padding-top:18px; border-top:1px solid #eaded7; line-height:1.5; }
.delivery p { margin:6px 0; color:#625551; }
.delivery a { color:#9a4f58; font-weight:600; }
.message-card { font:17px $font-secondary; }
.whatsapp { display:inline-block; margin-top:18px; background:#427a55; }
@media (max-width:500px) { form { flex-direction:column; } .order-summary { padding:16px; } .order-detail { padding:0 16px 16px; } }
</style>
