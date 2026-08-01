<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi, type AdminOrder } from '@/services/adminApi'

const router = useRouter()
const orders = ref<AdminOrder[]>([])
const orderSearch = ref('')
const orderView = ref<'all' | 'paid'>('all')
const selectedOrder = ref<AdminOrder | null>(null)
const isLoadingOrders = ref(true)
const ordersError = ref('')

const formatPrice = (value: number) => `$${value.toFixed(2)}`
const statusLabel = (status: string) => ({ awaiting_payment: 'Pendiente', paid: 'Pagado', payment_failed: 'Fallido' }[status] || 'Sin estado')
const statusClass = (status: string) => ({ awaiting_payment: 'warn', paid: 'ok', payment_failed: 'err' }[status] || '')
const paidOrders = computed(() => orders.value.filter((order) => order.status === 'paid'))
const awaitingOrders = computed(() => orders.value.filter((order) => order.status === 'awaiting_payment'))
const salesTotal = computed(() => paidOrders.value.reduce((total, order) => total + order.total, 0))

const filteredOrders = computed(() => {
  const term = orderSearch.value.trim().toLowerCase()
  return orders.value.filter((order) => {
    const matchesView = orderView.value === 'all' || order.status === 'paid'
    const matchesSearch = !term || `${order.orderNumber} ${order.customer.name} ${order.customer.email} ${order.customer.phone}`.toLowerCase().includes(term)
    return matchesView && matchesSearch
  })
})

async function loadOrders() {
  isLoadingOrders.value = true
  ordersError.value = ''
  try {
    const { data } = await adminApi.orders()
    orders.value = data
  } catch (reason: any) {
    ordersError.value = reason.message || 'No pudimos cargar las órdenes.'
  } finally {
    isLoadingOrders.value = false
  }
}

function selectOrder(order: AdminOrder) {
  selectedOrder.value = order
}

function changeOrderView(view: 'all' | 'paid') {
  orderView.value = view
  selectedOrder.value = null
}

function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('admin_name')
  router.replace('/admin/login')
}

function whatsappLink(phone: string, orderNumber: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, te escribimos de Bruval sobre tu pedido ${orderNumber}.`)}`
}

onMounted(loadOrders)
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <a href="/" class="brand">bruval<span>.</span></a>
      <nav>
        <span class="admin-label">Admin</span>
        <RouterLink to="/admin">Órdenes</RouterLink>
        <RouterLink to="/admin/productos">Productos</RouterLink>
        <button type="button" @click="logout">Cerrar sesión</button>
      </nav>
    </header>

    <main class="dash">
      <section class="dash-head">
        <div>
          <p class="overline">Panel de administración · Guayaquil</p>
          <h1>Órdenes y<br><i>ventas.</i></h1>
          <p>Consulta las compras, confirma los pagos y revisa los datos de entrega de cada pedido.</p>
        </div>
        <div class="head-actions">
          <RouterLink class="products-link" to="/admin/productos">Gestionar productos</RouterLink>
          <button class="refresh-btn" type="button" @click="loadOrders">Actualizar</button>
        </div>
      </section>

      <section class="cards-row" aria-label="Resumen de ventas">
        <div class="stat"><span>Compras realizadas</span><strong>{{ orders.length }}</strong></div>
        <div class="stat"><span>Pagos confirmados</span><strong>{{ paidOrders.length }}</strong></div>
        <div class="stat"><span>Total cobrado</span><strong>{{ formatPrice(salesTotal) }}</strong></div>
        <div class="stat"><span>Por confirmar</span><strong>{{ awaitingOrders.length }}</strong></div>
      </section>

      <section class="orders-card">
        <div class="card-header">
          <div>
            <p class="overline">Compras</p>
            <h2>Órdenes</h2>
          </div>
          <input v-model.trim="orderSearch" type="search" placeholder="Buscar orden o cliente">
        </div>

        <div class="order-views" role="tablist" aria-label="Vista de compras">
          <button :class="{ active: orderView === 'all' }" type="button" role="tab" :aria-selected="orderView === 'all'" @click="changeOrderView('all')">Todas <span>{{ orders.length }}</span></button>
          <button :class="{ active: orderView === 'paid' }" type="button" role="tab" :aria-selected="orderView === 'paid'" @click="changeOrderView('paid')">Pagadas <span>{{ paidOrders.length }}</span></button>
        </div>

        <p v-if="isLoadingOrders" class="status-line">Cargando órdenes...</p>
        <p v-else-if="ordersError" class="status-line error">{{ ordersError }}</p>
        <div v-else class="orders-workspace">
          <div class="orders-list">
            <button v-for="order in filteredOrders" :key="order._id" class="order-row" :class="{ selected: selectedOrder?._id === order._id }" type="button" @click="selectOrder(order)">
              <span class="order-main"><b>{{ order.orderNumber }}</b><small>{{ order.customer.name }} · {{ order.customer.email }}</small></span>
              <span class="order-meta"><span :class="['badge', statusClass(order.status)]">{{ statusLabel(order.status) }}</span><b>{{ formatPrice(order.total) }}</b></span>
            </button>
            <p v-if="!filteredOrders.length" class="status-line">No hay órdenes en esta vista.</p>
          </div>

          <aside v-if="selectedOrder" class="order-detail">
            <div class="detail-top">
              <div><p class="detail-label">Pedido</p><h3>{{ selectedOrder.orderNumber }}</h3></div>
              <span :class="['badge', statusClass(selectedOrder.status)]">{{ statusLabel(selectedOrder.status) }}</span>
            </div>
            <div class="detail-grid">
              <div><p class="detail-label">Cliente</p><p class="detail-value">{{ selectedOrder.customer.name }}</p><p>{{ selectedOrder.customer.email }}<br>{{ selectedOrder.customer.phone }}</p></div>
              <div><p class="detail-label">Entrega</p><p class="detail-value">Para {{ selectedOrder.delivery.recipient }}</p><p>{{ selectedOrder.delivery.date }} · {{ selectedOrder.delivery.timeSlot }}<br>{{ selectedOrder.delivery.address }}</p><a :href="selectedOrder.delivery.mapUrl" target="_blank" rel="noopener">Ver mapa</a></div>
            </div>
            <div v-if="selectedOrder.delivery.messageCard" class="message-card"><p class="detail-label">Tarjeta</p><p>“{{ selectedOrder.delivery.messageCard }}”</p></div>
            <div class="items"><p class="detail-label">Items</p><div v-for="item in selectedOrder.items" :key="`${item.name}-${item.price}`"><span>{{ item.quantity }} × {{ item.name }}</span><span>{{ formatPrice(item.price * item.quantity) }}</span></div><div class="total"><span>Total</span><strong>{{ formatPrice(selectedOrder.total) }}</strong></div></div>
            <a class="whatsapp-link" :href="whatsappLink(selectedOrder.customer.phone, selectedOrder.orderNumber)" target="_blank" rel="noopener">Contactar por WhatsApp</a>
          </aside>
          <aside v-else class="empty-detail">Selecciona una orden para ver el cliente, la entrega y los productos comprados.</aside>
        </div>
      </section>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.shell { min-height: 100vh; background: #f5f0ec; color: #211817; font-family: $font-principal; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 5vw; background: #fffaf6; border-bottom: 1px solid #e4d7d0; }
.brand { color: inherit; text-decoration: none; font: 600 28px/1 $font-secondary; letter-spacing: -2px; }.brand span { color: #9a4f58; }
nav { display: flex; align-items: center; gap: 16px; } nav a, nav button { border: 0; padding: 0; color: #706663; background: transparent; font: 600 11px $font-principal; text-decoration: none; cursor: pointer; } nav a.router-link-exact-active, nav a:hover, nav button:hover { color: #211817; }
.admin-label { padding: 3px 8px; color: #9a4f58; border: 1px solid #ddc8c0; border-radius: 4px; font: 500 9px $font-principal; letter-spacing: 1.4px; text-transform: uppercase; }
.dash { max-width: 1220px; margin: 0 auto; padding: 44px 5vw 80px; }.dash-head { display: flex; justify-content: space-between; gap: 28px; align-items: flex-end; margin-bottom: 32px; }.overline { margin: 0; color: #9a4f58; font: 500 9px $font-principal; letter-spacing: 1.6px; text-transform: uppercase; }.dash-head h1 { margin: 8px 0 18px; font: 500 clamp(42px, 6vw, 72px)/.82 $font-secondary; letter-spacing: -.06em; }.dash-head h1 i { padding-left: 7vw; }.dash-head > div > p:last-child { max-width: 420px; margin: 0; color: #706663; font-size: 14px; line-height: 1.5; }.head-actions { display: flex; gap: 16px; align-items: center; padding-bottom: 5px; }.products-link, .refresh-btn { border: 0; padding: 0 0 4px; color: #211817; background: transparent; border-bottom: 1px solid #211817; font: 600 10px $font-principal; text-decoration: none; cursor: pointer; }.products-link { color: #9a4f58; border-bottom-color: #9a4f58; }
.cards-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin-bottom: 36px; overflow: hidden; background: #ddcec6; border-radius: 8px; }.stat { display: flex; flex-direction: column; gap: 6px; padding: 18px 22px; background: #fffaf6; }.stat span, .detail-label { color: #9c8c86; font: 600 8px $font-principal; letter-spacing: .12em; text-transform: uppercase; }.stat strong { font: 500 29px $font-secondary; letter-spacing: -.04em; }
.orders-card { overflow: hidden; background: #fffaf6; border: 1px solid #e4d7d0; border-radius: 10px; }.card-header { display: flex; align-items: end; justify-content: space-between; gap: 20px; padding: 18px 22px; border-bottom: 1px solid #ede3dd; }.card-header h2 { margin: 4px 0 0; font: 500 27px $font-secondary; letter-spacing: -.04em; }.card-header input { width: min(260px, 100%); box-sizing: border-box; border: 1px solid #d9cbc4; border-radius: 6px; padding: 9px 11px; color: #211817; background: #fffdfb; font: 13px $font-principal; }
.order-views { display: flex; gap: 18px; padding: 11px 22px; border-bottom: 1px solid #ede3dd; }.order-views button { border: 0; padding: 0 0 4px; color: #9c8c86; background: transparent; border-bottom: 1px solid transparent; font: 600 9px $font-principal; letter-spacing: .05em; text-transform: uppercase; cursor: pointer; }.order-views button.active { color: #9a4f58; border-bottom-color: #9a4f58; }.order-views span { display: inline-flex; align-items: center; justify-content: center; min-width: 16px; height: 16px; margin-left: 3px; border-radius: 50%; background: #f0e1da; font-size: 8px; }
.orders-workspace { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(300px, .95fr); min-height: 430px; }.orders-list { max-height: 640px; overflow-y: auto; }.order-row { display: flex; justify-content: space-between; width: 100%; gap: 16px; padding: 14px 20px; border: 0; border-bottom: 1px solid #f0e7e2; background: transparent; text-align: left; cursor: pointer; }.order-row:hover { background: #f9f3ef; }.order-row.selected { background: #f0e1da; }.order-main, .order-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }.order-main b { font-size: 13px; }.order-main small { overflow: hidden; color: #706663; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.order-meta { align-items: end; flex: none; }.order-meta > b { font: 11px 'DM Mono', monospace; }.badge { display: inline-block; padding: 3px 7px; border-radius: 4px; font: 600 8px $font-principal; letter-spacing: .08em; text-transform: uppercase; }.badge.ok { color: #3d6e47; background: #e2f0e5; }.badge.warn { color: #a16829; background: #f7edd6; }.badge.err { color: #b23d45; background: #f3ddde; }
.order-detail, .empty-detail { padding: 22px; background: #faf5f1; border-left: 1px solid #ede3dd; }.detail-top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 18px; }.detail-top h3 { margin: 4px 0 0; font: 500 22px $font-secondary; }.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }.detail-grid p:not(.detail-label) { margin: 4px 0 0; color: #706663; font-size: 12px; line-height: 1.45; }.detail-value { color: #211817 !important; font-weight: 600; }.detail-grid a { display: inline-block; margin-top: 5px; color: #9a4f58; font-size: 11px; text-decoration: none; }.message-card { margin-bottom: 16px; padding: 12px; background: #f0e1da; border-radius: 6px; }.message-card p:last-child { margin: 5px 0 0; font: 500 16px/1.3 $font-secondary; }.items > div { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; border-bottom: 1px solid #ede3dd; font-size: 12px; }.items .total { margin-top: 2px; padding-top: 9px; border-bottom: 0; font: 500 17px $font-secondary; }.whatsapp-link { display: inline-block; margin-top: 17px; padding: 10px 14px; color: #fffaf6; background: #427a55; border-radius: 6px; font: 600 10px $font-principal; text-decoration: none; }.empty-detail { display: grid; place-items: center; color: #9c8c86; font-size: 13px; line-height: 1.5; text-align: center; }.status-line { margin: 0; padding: 32px 22px; color: #9c8c86; font-size: 13px; text-align: center; }.status-line.error { color: #b23d45; }
@media (max-width: 760px) { .topbar, .dash-head, .card-header { align-items: flex-start; }.topbar { gap: 14px; }.topbar nav { flex-wrap: wrap; justify-content: flex-end; gap: 9px 13px; }.dash { padding-top: 34px; }.dash-head, .card-header { flex-direction: column; }.head-actions { padding: 0; }.cards-row { grid-template-columns: 1fr 1fr; }.stat { padding: 15px; }.orders-workspace { grid-template-columns: 1fr; }.order-detail, .empty-detail { border-top: 1px solid #ede3dd; border-left: 0; }.detail-grid { grid-template-columns: 1fr; }.card-header input { width: 100%; }.order-views { gap: 14px; }.order-row { padding: 13px 15px; } }
</style>
