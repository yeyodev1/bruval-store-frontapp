<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi, type AdminOrder, type AdminProduct } from '@/services/adminApi'

const router = useRouter()
const formatPrice = (value: number) => `$${value.toFixed(2)}`
const statusLabel = (status: string) => ({ awaiting_payment: 'Pendiente', paid: 'Pagado', payment_failed: 'Fallido' }[status] || '—')
const statusClass = (status: string) => ({ awaiting_payment: 'warn', paid: 'ok', payment_failed: 'err' }[status] || '')

function logout() {
  localStorage.removeItem('access_token'); localStorage.removeItem('admin_name')
  router.replace('/admin/login')
}

// ── Orders ──
const orders = ref<AdminOrder[]>([])
const orderSearch = ref('')
const selectedOrder = ref<AdminOrder | null>(null)
const isLoadingOrders = ref(true)

const filteredOrders = computed(() => {
  const term = orderSearch.value.trim().toLowerCase()
  if (!term) return orders.value
  return orders.value.filter((o) =>
    `${o.orderNumber} ${o.customer.name} ${o.customer.email} ${o.customer.phone}`.toLowerCase().includes(term)
  )
})

const paidOrders = computed(() => orders.value.filter((o) => o.status === 'paid'))
const salesTotal = computed(() => paidOrders.value.reduce((t, o) => t + o.total, 0))
const awaitingOrders = computed(() => orders.value.filter((o) => o.status === 'awaiting_payment'))

async function loadOrders() {
  isLoadingOrders.value = true
  try { const { data } = await adminApi.orders(); orders.value = data }
  catch {} finally { isLoadingOrders.value = false }
}

function whatsappLink(phone: string, orderNumber: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, te escribimos de Bruval sobre tu pedido ${orderNumber}.`)}`
}

// ── Products ──
const products = ref<AdminProduct[]>([])
const productSearch = ref('')
const selectedProduct = ref<AdminProduct | null>(null)
const isSavingProduct = ref(false)
const productMessage = ref('')
const isNewProduct = ref(false)
const isLoadingProducts = ref(true)

const filteredProducts = computed(() => {
  const term = productSearch.value.trim().toLowerCase()
  if (!term) return products.value
  return products.value.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(term))
})

function categoriesText(product: AdminProduct): string {
  return Array.isArray(product.categories) ? product.categories.join(', ') : ''
}
function setCategoriesText(value: string) {
  if (!selectedProduct.value) return
  selectedProduct.value.categories = value.split(',').map((c) => c.trim()).filter(Boolean)
}

function selectProduct(product: AdminProduct) {
  selectedProduct.value = { ...product, categories: [...(product.categories || [])] }
  isNewProduct.value = false; productMessage.value = ''
  selectedOrder.value = null
}

function newProduct() {
  selectedProduct.value = { _id: '', name: '', sku: '', collection: '', categories: [], palette: '', description: '', dimensions: '', image: '', price: 0, available: true, featured: false }
  isNewProduct.value = true; productMessage.value = ''
}

async function loadProducts() {
  isLoadingProducts.value = true
  try { const { data } = await adminApi.products(); products.value = data }
  catch {} finally { isLoadingProducts.value = false }
}

async function saveProduct() {
  if (!selectedProduct.value) return
  isSavingProduct.value = true; productMessage.value = ''
  try {
    const { _id, ...payload } = selectedProduct.value
    if (isNewProduct.value) {
      const { data } = await adminApi.createProduct(payload)
      products.value.unshift(data)
      selectedProduct.value = { ...data, categories: [...(data.categories || [])] }
      isNewProduct.value = false
      productMessage.value = 'Producto creado ✓'
    } else {
      const { data } = await adminApi.updateProduct(_id, payload)
      products.value = products.value.map((p) => p._id === data._id ? data : p)
      selectedProduct.value = { ...data, categories: [...(data.categories || [])] }
      productMessage.value = 'Guardado ✓'
    }
  } catch (reason: any) {
    productMessage.value = reason.message || 'Error al guardar'
  } finally { isSavingProduct.value = false }
}

onMounted(async () => { await Promise.all([loadOrders(), loadProducts()]) })
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <a href="/" class="brand">bruval<span>.</span></a>
      <nav>
        <span class="admin-label">Admin</span>
        <button type="button" @click="logout">Cerrar sesión</button>
      </nav>
    </header>

    <main class="dash">
      <div class="dash-head">
        <div>
          <p class="overline">Panel de administración · Guayaquil</p>
          <h1>Catálogo y<br><i>ventas.</i></h1>
        </div>
        <button class="refresh-btn" type="button" @click="loadOrders">Actualizar ↻</button>
      </div>

      <div class="cards-row">
        <div class="stat"><span>Ventas</span><strong>{{ paidOrders.length }}</strong></div>
        <div class="stat"><span>Total cobrado</span><strong>{{ formatPrice(salesTotal) }}</strong></div>
        <div class="stat"><span>Pendientes</span><strong>{{ awaitingOrders.length }}</strong></div>
        <div class="stat"><span>Productos</span><strong>{{ products.length }}</strong></div>
      </div>

      <div class="panels">
        <!-- ═══ ORDERS ═══ -->
        <section class="card">
          <div class="card-header">
            <h2>Órdenes</h2>
            <div class="card-tools">
              <input v-model.trim="orderSearch" type="search" placeholder="Buscar orden...">
            </div>
          </div>

          <div v-if="isLoadingOrders" class="status-line">Cargando...</div>
          <template v-else>
            <div class="list">
              <button v-for="order in filteredOrders" :key="order._id" class="row" :class="{ on: selectedOrder?._id === order._id }" type="button" @click="selectedOrder = order; selectedProduct = null">
                <div class="row-col">
                  <span class="code">{{ order.orderNumber }}</span>
                  <span class="meta">{{ order.customer.name }}</span>
                </div>
                <div class="row-col right">
                  <span :class="['badge', statusClass(order.status)]">{{ statusLabel(order.status) }}</span>
                  <span class="amount">{{ formatPrice(order.total) }}</span>
                </div>
              </button>
              <p v-if="!filteredOrders.length" class="empty-state">Sin resultados</p>
            </div>
          </template>

          <div v-if="selectedOrder" class="detail">
            <div class="detail-top">
              <div>
                <p class="detail-label">Pedido</p>
                <h3>{{ selectedOrder.orderNumber }}</h3>
              </div>
              <span :class="['badge', statusClass(selectedOrder.status)]">{{ statusLabel(selectedOrder.status) }}</span>
            </div>

            <div class="detail-grid">
              <div>
                <p class="detail-label">Cliente</p>
                <p class="detail-val">{{ selectedOrder.customer.name }}</p>
                <p class="detail-sub">{{ selectedOrder.customer.email }} · {{ selectedOrder.customer.phone }}</p>
              </div>
              <div>
                <p class="detail-label">Entrega</p>
                <p class="detail-val">Para {{ selectedOrder.delivery.recipient }}</p>
                <p class="detail-sub">{{ selectedOrder.delivery.date }} · {{ selectedOrder.delivery.timeSlot }}</p>
                <p class="detail-sub">{{ selectedOrder.delivery.address }}</p>
                <a class="map-link" :href="selectedOrder.delivery.mapUrl" target="_blank">Mapa ↗</a>
              </div>
            </div>

            <div v-if="selectedOrder.delivery.messageCard" class="detail-card">
              <p class="detail-label">Tarjeta</p>
              <p class="card-msg">“{{ selectedOrder.delivery.messageCard }}”</p>
            </div>

            <div class="detail-items">
              <p class="detail-label">Items</p>
              <div v-for="item in selectedOrder.items" :key="item.name" class="item-line">
                <span>{{ item.quantity }} × {{ item.name }}</span>
                <span>{{ formatPrice(item.price * item.quantity) }}</span>
              </div>
              <div class="item-line total-line">
                <span>Total</span><strong>{{ formatPrice(selectedOrder.total) }}</strong>
              </div>
            </div>

            <a class="wa-btn" :href="whatsappLink(selectedOrder.customer.phone, selectedOrder.orderNumber)" target="_blank">WhatsApp ↗</a>
          </div>
        </section>

        <!-- ═══ PRODUCTS ═══ -->
        <section class="card">
          <div class="card-header">
            <h2>Productos</h2>
            <div class="card-tools">
              <input v-model.trim="productSearch" type="search" placeholder="Buscar producto...">
              <button class="add-btn" type="button" @click="newProduct">+ Nuevo</button>
            </div>
          </div>

          <div v-if="isLoadingProducts" class="status-line">Cargando...</div>
          <div v-else class="list">
            <button v-for="product in filteredProducts" :key="product._id" class="row" :class="{ on: selectedProduct?._id === product._id }" type="button" @click="selectProduct(product)">
              <img v-if="product.image" :src="product.image" :alt="product.name">
              <div class="row-col full-w">
                <span class="name">{{ product.name }}</span>
                <span class="meta">{{ product.sku }} · {{ formatPrice(product.price) }}</span>
              </div>
            </button>
            <p v-if="!filteredProducts.length" class="empty-state">Sin resultados</p>
          </div>

          <div v-if="selectedProduct" class="detail">
            <div class="detail-top">
              <div>
                <p class="detail-label">{{ isNewProduct ? 'Nuevo' : 'Editar' }}</p>
                <h3>{{ selectedProduct.name || 'Sin nombre' }}</h3>
              </div>
              <div class="toggles">
                <label class="toggle"><input v-model="selectedProduct.available" type="checkbox"> Activo</label>
                <label class="toggle"><input v-model="selectedProduct.featured" type="checkbox"> Destacado</label>
              </div>
            </div>
            <div v-if="selectedProduct.image" class="prod-img"><img :src="selectedProduct.image" :alt="selectedProduct.name"></div>

            <form @submit.prevent="saveProduct" class="editor-form">
              <div class="f-row">
                <label>Nombre<input v-model.trim="selectedProduct.name" required></label>
                <label>SKU<input v-model.trim="selectedProduct.sku" required></label>
              </div>
              <div class="f-row">
                <label>Colección<input v-model.trim="selectedProduct.collection" placeholder="Girasoles preservados"></label>
                <label>Paleta<input v-model.trim="selectedProduct.palette" placeholder="Amarillo mostaza"></label>
              </div>
              <div class="f-row">
                <label>Medidas<input v-model.trim="selectedProduct.dimensions" placeholder="18 × 27 cm"></label>
                <label>Precio USD<input v-model.number="selectedProduct.price" min="0" step="0.01" type="number"></label>
              </div>
              <label>Categorías <small>(coma separada)</small><input :value="categoriesText(selectedProduct)" @input="setCategoriesText(($event.target as HTMLInputElement).value)"></label>
              <label>Imagen URL<input v-model.trim="selectedProduct.image" type="url" placeholder="https://res.cloudinary.com/..."></label>
              <label>Descripción<textarea v-model.trim="selectedProduct.description" rows="3"></textarea></label>
              <p v-if="productMessage" class="form-feedback">{{ productMessage }}</p>
              <div class="f-actions">
                <button class="save-btn" :disabled="isSavingProduct" type="submit">{{ isSavingProduct ? 'Guardando…' : (isNewProduct ? 'Crear producto' : 'Guardar cambios') }}</button>
                <button v-if="isNewProduct" class="ghost-btn" type="button" @click="selectedProduct = null; isNewProduct = false">Cancelar</button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.shell {
  min-height: 100vh;
  background: #f5f0ec;
  color: #211817;
  font-family: $font-principal;
}

/* ── Top bar ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 5vw;
  background: #fffaf6;
  border-bottom: 1px solid #e4d7d0;
}
.brand {
  color: inherit;
  text-decoration: none;
  font: 600 28px/1 $font-secondary;
  letter-spacing: -2px;
}
.brand span { color: #9a4f58; }
nav { display: flex; align-items: center; gap: 16px; }
.admin-label {
  font: 500 9px $font-principal;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: #9a4f58;
  padding: 3px 8px;
  border: 1px solid #ddc8c0;
  border-radius: 4px;
}
nav button {
  border: 0;
  padding: 0;
  background: transparent;
  color: #706663;
  font: 600 11px $font-principal;
  cursor: pointer;
}
nav button:hover { color: #211817; }

/* ── Dashboard head ── */
.dash {
  max-width: 1360px;
  margin: 0 auto;
  padding: 44px 5vw 80px;
}
.dash-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}
.overline {
  margin: 0;
  font: 500 9px $font-principal;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: #9a4f58;
}
.dash-head h1 {
  margin: 8px 0 0;
  font: 500 clamp(36px, 5vw, 64px)/0.82 $font-secondary;
  letter-spacing: -0.06em;
}
.dash-head h1 i { padding-left: 7vw; }
.refresh-btn {
  border: 0;
  padding: 0 0 4px;
  background: transparent;
  color: #211817;
  font: 600 10px $font-principal;
  letter-spacing: 0.4px;
  border-bottom: 1px solid #211817;
  cursor: pointer;
}

/* ── Stats row ── */
.cards-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: #ddcec6;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 36px;
}
.stat {
  background: #fffaf6;
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat span {
  font: 500 9px $font-principal;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #9c8c86;
}
.stat strong {
  font: 500 32px $font-secondary;
  letter-spacing: -0.04em;
}

/* ── Two-panel grid ── */
.panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  align-items: start;
}
.card {
  background: #fffaf6;
  border: 1px solid #e4d7d0;
  border-radius: 10px;
  overflow: hidden;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #ede3dd;
}
.card-header h2 {
  margin: 0;
  font: 500 22px $font-secondary;
  letter-spacing: -0.04em;
}
.card-tools {
  display: flex;
  gap: 8px;
  align-items: center;
}
.card-tools input {
  width: 180px;
  box-sizing: border-box;
  border: 1px solid #d9cbc4;
  border-radius: 6px;
  padding: 7px 10px;
  font: 13px $font-principal;
  background: #fffdfb;
  color: #211817;
}
.add-btn {
  border: 1px solid #9a4f58;
  border-radius: 6px;
  padding: 7px 12px;
  color: #9a4f58;
  background: transparent;
  font: 600 9px $font-principal;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
}
.add-btn:hover {
  color: #fffaf6;
  background: #9a4f58;
}

/* ── Scrollable list ── */
.list {
  max-height: 380px;
  overflow-y: auto;
}
.list::-webkit-scrollbar { width: 4px; }
.list::-webkit-scrollbar-thumb { background: #d9c8c0; border-radius: 4px; }

.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border: 0;
  border-bottom: 1px solid #f0e7e2;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.row:hover { background: #f9f3ef; }
.row.on { background: #f0e1da; }

.row img {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  flex: none;
}
.row-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.row-col.full-w { flex: 1; }
.row-col.right {
  margin-left: auto;
  align-items: flex-end;
}
.code, .name {
  font: 600 12px $font-principal;
}
.meta {
  font-size: 10px;
  color: #9c8c86;
}
.amount {
  font: 11px 'DM Mono', monospace;
}
.badge {
  display: inline-block;
  font: 600 8px $font-principal;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 4px;
}
.badge.ok { color: #3d6e47; background: #e2f0e5; }
.badge.warn { color: #a16829; background: #f7edd6; }
.badge.err { color: #b23d45; background: #f3ddde; }
.status-line, .empty-state {
  padding: 28px 20px;
  text-align: center;
  color: #9c8c86;
  font-size: 12px;
}

/* ── Detail section ── */
.detail {
  border-top: 1px solid #ede3dd;
  padding: 20px;
  background: #faf5f1;
}
.detail-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.detail-label {
  margin: 0 0 3px;
  font: 600 8px $font-principal;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9c8c86;
}
.detail-top h3 {
  margin: 0;
  font: 500 20px $font-secondary;
}
.toggles {
  display: flex;
  gap: 12px;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #706663;
  font: 600 8px $font-principal;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
}
.toggle input { accent-color: #9a4f58; }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 12px;
}
.detail-val {
  margin: 0;
  font: 600 13px $font-principal;
}
.detail-sub {
  margin: 3px 0 0;
  font-size: 11px;
  color: #706663;
  line-height: 1.4;
}
.map-link {
  display: inline-block;
  margin-top: 4px;
  color: #9a4f58;
  font: 600 10px $font-principal;
  text-decoration: none;
}
.detail-card {
  margin-bottom: 12px;
  padding: 12px;
  background: #f0e1da;
  border-radius: 6px;
}
.card-msg {
  margin: 4px 0 0;
  font: 500 15px $font-secondary;
  line-height: 1.3;
}
.detail-items { margin-bottom: 10px; }
.item-line {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 12px;
  border-bottom: 1px solid #ede3dd;
}
.total-line {
  padding-top: 8px;
  font: 500 16px $font-secondary;
  border-top: 1px solid #d9c8c0;
  border-bottom: 0;
}
.wa-btn {
  display: inline-block;
  border: 0;
  border-radius: 6px;
  padding: 9px 16px;
  color: #fffaf6;
  background: #427a55;
  text-decoration: none;
  font: 600 10px $font-principal;
  letter-spacing: 0.04em;
}

/* ── Product image ── */
.prod-img {
  width: 100%;
  max-height: 200px;
  overflow: hidden;
  border-radius: 6px;
  margin-bottom: 14px;
}
.prod-img img {
  width: 100%;
  height: auto;
  display: block;
}

/* ── Editor form ── */
.editor-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.f-row {
  display: flex;
  gap: 10px;
}
.f-row label { flex: 1; }
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font: 600 9px $font-principal;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #706663;
}
label small {
  color: #9a4f58;
  font-size: 8px;
  letter-spacing: 0.02em;
  text-transform: none;
}
.editor-form input, .editor-form textarea {
  box-sizing: border-box;
  border: 1px solid #d9c8c0;
  border-radius: 6px;
  padding: 8px 10px;
  font: 13px $font-principal;
  color: #211817;
  background: #fffdfb;
}
.editor-form textarea { resize: vertical; }
.form-feedback {
  margin: 0;
  padding: 8px 12px;
  border-radius: 6px;
  background: #f0e1da;
  color: #625551;
  font-size: 11px;
}
.f-actions {
  display: flex;
  gap: 10px;
}
.save-btn {
  flex: 1;
  border: 0;
  border-radius: 6px;
  padding: 11px;
  color: #fffaf6;
  background: #9a4f58;
  font: 600 11px $font-principal;
  cursor: pointer;
}
.save-btn:disabled { opacity: 0.6; cursor: wait; }
.ghost-btn {
  border: 1px solid #706663;
  border-radius: 6px;
  padding: 11px 16px;
  color: #706663;
  background: transparent;
  font: 600 10px $font-principal;
  cursor: pointer;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .panels { grid-template-columns: 1fr; }
  .cards-row { grid-template-columns: 1fr 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
  .f-row { flex-direction: column; }
}
</style>
