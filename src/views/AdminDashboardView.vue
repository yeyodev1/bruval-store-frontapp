<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi, type AdminOrder, type AdminProduct } from '@/services/adminApi'

const router = useRouter()
const error = ref('')
const formatPrice = (value: number) => `$${value.toFixed(2)}`
const formatDate = (value: string) => new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const statusLabel = (status: string) => ({ awaiting_payment: 'Pendiente', paid: 'Pagado', payment_failed: 'Fallido' }[status] || '—')
const statusClass = (status: string) => ({ awaiting_payment: 'tag-warn', paid: 'tag-ok', payment_failed: 'tag-err' }[status] || '')

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

async function loadOrders() {
  isLoadingOrders.value = true; error.value = ''
  try { const { data } = await adminApi.orders(); orders.value = data }
  catch (reason: any) { error.value = reason.message || 'No pudimos cargar las ventas.' }
  finally { isLoadingOrders.value = false }
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

const emptyProduct: Omit<AdminProduct, '_id'> = {
  name: '', sku: '', collection: '', categories: [], palette: '',
  description: '', dimensions: '', image: '', price: 0, available: true, featured: false,
}

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
  selectedProduct.value = { _id: '', ...emptyProduct, categories: [] }
  isNewProduct.value = true; productMessage.value = ''
}

async function loadProducts() {
  isLoadingProducts.value = true
  try { const { data } = await adminApi.products(); products.value = data }
  catch (reason: any) { productMessage.value = reason.message || 'No pudimos cargar el catálogo.' }
  finally { isLoadingProducts.value = false }
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
      productMessage.value = 'Producto creado correctamente.'
    } else {
      const { data } = await adminApi.updateProduct(_id, payload)
      products.value = products.value.map((p) => p._id === data._id ? data : p)
      selectedProduct.value = { ...data, categories: [...(data.categories || [])] }
      productMessage.value = 'Producto guardado.'
    }
  } catch (reason: any) {
    productMessage.value = reason.message || 'No pudimos guardar el producto.'
  } finally {
    isSavingProduct.value = false
  }
}

onMounted(async () => { await Promise.all([loadOrders(), loadProducts()]) })
</script>

<template>
  <main class="admin">
    <header>
      <a href="/" class="brand">bruval<span>.</span></a>
      <nav><button type="button" @click="logout">Salir</button></nav>
    </header>

    <section class="intro">
      <p class="eyebrow">Administración · Guayaquil</p>
      <h1>Todo lo que<br><i>está floreciendo.</i></h1>
      <button type="button" @click="loadOrders">Actualizar ventas ↻</button>
    </section>

    <section class="metrics">
      <div><span>Ventas confirmadas</span><strong>{{ paidOrders.length }}</strong></div>
      <div><span>Total cobrado</span><strong>{{ formatPrice(salesTotal) }}</strong></div>
      <div><span>Por coordinar</span><strong>{{ orders.filter((o) => o.status === 'awaiting_payment').length }}</strong></div>
      <div><span>Productos</span><strong>{{ products.length }}</strong></div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="workspace">
      <!-- ═══════ ORDERS PANEL ═══════ -->
      <aside class="panel orders-panel">
        <div class="panel-head">
          <h2>Órdenes</h2>
          <span>{{ orders.length }}</span>
        </div>
        <div class="search-box">
          <input v-model.trim="orderSearch" type="search" placeholder="Buscar por número, nombre, correo o teléfono">
        </div>
        <div v-if="isLoadingOrders" class="loading">Cargando órdenes...</div>
        <template v-else>
          <button v-for="order in filteredOrders" :key="order._id" class="order-row" :class="{ active: selectedOrder?._id === order._id }" type="button" @click="selectedOrder = order; selectedProduct = null">
            <span class="order-main">
              <b>{{ order.orderNumber }}</b>
              <small>{{ order.customer.name }} · {{ formatDate(order.createdAt) }}</small>
            </span>
            <span class="order-side">
              <em :class="statusClass(order.status)">{{ statusLabel(order.status) }}</em>
              <strong>{{ formatPrice(order.total) }}</strong>
            </span>
          </button>
          <p v-if="!filteredOrders.length" class="empty-note">Sin resultados</p>
        </template>

        <!-- Order detail -->
        <section v-if="selectedOrder" class="order-detail">
          <div class="detail-head">
            <p class="eyebrow">Detalle de pedido</p>
            <h3>{{ selectedOrder.orderNumber }}</h3>
            <em :class="statusClass(selectedOrder.status)">{{ statusLabel(selectedOrder.status) }}</em>
          </div>
          <div class="detail-block"><strong>Cliente</strong><p>{{ selectedOrder.customer.name }} · {{ selectedOrder.customer.email }} · {{ selectedOrder.customer.phone }}</p></div>
          <div class="detail-block"><strong>Entrega</strong><p>Para {{ selectedOrder.delivery.recipient }} · {{ selectedOrder.delivery.date }}, {{ selectedOrder.delivery.timeSlot }}</p><p>{{ selectedOrder.delivery.address }}</p><a :href="selectedOrder.delivery.mapUrl" target="_blank" rel="noopener">Ver ubicación ↗</a></div>
          <div v-if="selectedOrder.delivery.messageCard" class="detail-block"><strong>Tarjeta</strong><p class="message-card">"{{ selectedOrder.delivery.messageCard }}"</p></div>
          <div class="detail-block"><strong>Items</strong><div v-for="item in selectedOrder.items" :key="item.name" class="item"><span>{{ item.quantity }} x {{ item.name }}</span><span>{{ formatPrice(item.price * item.quantity) }}</span></div></div>
          <div class="detail-total"><span>Total</span><strong>{{ formatPrice(selectedOrder.total) }}</strong></div>
          <a class="whatsapp-link" :href="whatsappLink(selectedOrder.customer.phone, selectedOrder.orderNumber)" target="_blank" rel="noopener">Contactar por WhatsApp ↗</a>
        </section>
      </aside>

      <!-- ═══════ PRODUCTS PANEL ═══════ -->
      <aside class="panel products-panel">
        <div class="panel-head">
          <h2>Productos</h2>
          <span>{{ products.length }}</span>
        </div>
        <div class="search-box">
          <input v-model.trim="productSearch" type="search" placeholder="Buscar por nombre o SKU">
          <button class="create-btn" type="button" @click="newProduct">+ Nuevo</button>
        </div>
        <div v-if="isLoadingProducts" class="loading">Cargando productos...</div>
        <div v-else class="product-list">
          <button v-for="product in filteredProducts" :key="product._id" class="product-row" :class="{ active: selectedProduct?._id === product._id }" type="button" @click="selectProduct(product)">
            <img :src="product.image" :alt="product.name">
            <span><b>{{ product.name }}</b><small>{{ product.sku }} · {{ formatPrice(product.price) }}</small></span>
          </button>
          <p v-if="!filteredProducts.length" class="empty-note">Sin resultados</p>
        </div>

        <!-- Product editor -->
        <section v-if="selectedProduct" class="editor">
          <div class="detail-head">
            <p class="eyebrow">{{ isNewProduct ? 'Nuevo producto' : 'Editar producto' }}</p>
            <h3>{{ selectedProduct.name || 'Sin nombre' }}</h3>
            <div class="editor-toggles">
              <label><input v-model="selectedProduct.available" type="checkbox"> Disponible</label>
              <label><input v-model="selectedProduct.featured" type="checkbox"> Destacado</label>
            </div>
          </div>
          <div v-if="selectedProduct.image" class="image-preview"><img :src="selectedProduct.image" :alt="selectedProduct.name"></div>
          <form @submit.prevent="saveProduct">
            <div class="form-row">
              <label>Nombre<input v-model.trim="selectedProduct.name" required placeholder="Girasol Preservado"></label>
              <label>SKU<input v-model.trim="selectedProduct.sku" required placeholder="GP001"></label>
            </div>
            <div class="form-row">
              <label>Colección<input v-model.trim="selectedProduct.collection" required placeholder="Girasoles preservados"></label>
              <label>Paleta<input v-model.trim="selectedProduct.palette" required placeholder="Amarillo mostaza"></label>
            </div>
            <div class="form-row">
              <label>Medidas<input v-model.trim="selectedProduct.dimensions" required placeholder="18 x 27 cm"></label>
              <label>Precio (USD)<input v-model.number="selectedProduct.price" required min="0" step="0.01" type="number"></label>
            </div>
            <label class="full">Categorías<small>Separadas por coma</small><input :value="categoriesText(selectedProduct)" @input="setCategoriesText(($event.target as HTMLInputElement).value)" placeholder="Rosas, Ramos, Rojas"></label>
            <label class="full">Imagen URL<input v-model.trim="selectedProduct.image" required type="url" placeholder="https://res.cloudinary.com/..."></label>
            <label class="full">Descripción<textarea v-model.trim="selectedProduct.description" required rows="3" placeholder="Describe el arreglo..."></textarea></label>
            <p v-if="productMessage" class="form-message">{{ productMessage }}</p>
            <button :disabled="isSavingProduct" type="submit">{{ isSavingProduct ? 'Guardando...' : (isNewProduct ? 'Crear producto →' : 'Guardar cambios →') }}</button>
            <button v-if="isNewProduct" class="cancel-btn" type="button" @click="selectedProduct = null; isNewProduct = false">Cancelar</button>
          </form>
        </section>
      </aside>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.admin { min-height:100vh; padding:26px 5vw 80px; color:#211817; background:#fffaf6; }
header { display:flex; align-items:center; justify-content:space-between; }
.brand { color:inherit; text-decoration:none; font:600 31px/1 $font-secondary; letter-spacing:-2px; }
.brand span,.eyebrow { color:#9a4f58; }
nav { display:flex; gap:18px; }
nav button { border:0; padding:0; color:#211817; background:transparent; font:600 11px $font-principal; cursor:pointer; }
.intro { margin:80px 0 35px; }
.eyebrow { margin:0; font:500 10px $font-principal; letter-spacing:1.4px; text-transform:uppercase; }
.intro h1 { margin:12px 0 18px; font:500 clamp(50px,7vw,100px)/.78 $font-secondary; letter-spacing:-.07em; }
.intro h1 i { padding-left:9vw; }
.intro button { border:0; padding-bottom:6px; border-bottom:1px solid #211817; background:transparent; font:600 11px $font-principal; cursor:pointer; }
.metrics { display:flex; gap:1px; background:#ddcec6; margin-bottom:40px; }
.metrics div { flex:1; min-height:100px; padding:18px 20px; display:flex; flex-direction:column; justify-content:space-between; background:#efe2db; }
.metrics span { color:#706663; font-size:9px; text-transform:uppercase; letter-spacing:1px; }
.metrics strong { font:500 32px $font-secondary; }
.error { color:#b23d45; font-size:13px; margin-bottom:20px; }
.workspace { display:grid; grid-template-columns:1fr 1fr; gap:32px; align-items:start; }
.panel { border-top:1px solid #d9c8c0; padding-top:14px; }
.panel-head { display:flex; align-items:baseline; gap:10px; margin-bottom:14px; }
.panel-head h2 { margin:0; font:500 30px $font-secondary; letter-spacing:-.05em; }
.panel-head span { color:#706663; font-size:10px; text-transform:uppercase; letter-spacing:1px; }
.search-box { display:flex; gap:8px; margin-bottom:10px; }
.search-box input { flex:1; box-sizing:border-box; border:1px solid #d9c8c0; padding:10px; color:#211817; background:#fffdfb; font:14px $font-principal; }
.create-btn { flex:0 0 auto; border:1px solid #9a4f58; padding:0 12px; color:#9a4f58; background:transparent; font:600 9px $font-principal; letter-spacing:.06em; text-transform:uppercase; cursor:pointer; white-space:nowrap; }
.create-btn:hover { color:#fffaf6; background:#9a4f58; }
.loading { color:#706663; font-size:12px; padding:20px 0; }
.empty-note { color:#706663; font-size:12px; padding:14px 0; }
.order-row,.product-row { width:100%; display:flex; align-items:center; gap:10px; padding:10px 0; border:0; border-bottom:1px solid #eadfd9; background:transparent; text-align:left; cursor:pointer; }
.order-row.active,.product-row.active { background:#f0e1da; }
.order-row .order-main,.order-row .order-side { display:flex; flex-direction:column; gap:3px; }
.order-row .order-side { align-items:flex-end; margin-left:auto; }
.order-row b { font:600 11px 'DM Mono',monospace; }
.order-row small,.order-row strong { font-size:11px; }
.order-row strong { font-family:'DM Mono',monospace; }
.order-row em { font-size:9px; font-style:normal; text-transform:uppercase; letter-spacing:.08em; padding:2px 6px; }
.tag-ok { color:#3d6e47; background:#e2f0e5; }
.tag-warn { color:#a16829; background:#f7edd6; }
.tag-err { color:#b23d45; background:#f3ddde; }
.product-row img { width:42px; height:42px; object-fit:cover; flex:none; }
.product-row span { display:flex; flex-direction:column; gap:3px; }
.product-row b { font:600 12px $font-principal; }
.product-row small { color:#706663; font-size:10px; }
.product-list { max-height:420px; overflow-y:auto; }
.product-list::-webkit-scrollbar { width:4px; }
.product-list::-webkit-scrollbar-thumb { background:#d9c8c0; }
.order-detail,.editor { margin-top:16px; padding:16px; background:#f7f0eb; }
.detail-head { margin-bottom:12px; }
.detail-head h3 { margin:4px 0 8px; font:500 24px $font-secondary; }
.editor-toggles { display:flex; gap:14px; margin-bottom:8px; }
.editor-toggles label { display:flex; align-items:center; gap:5px; color:#706663; font:600 9px $font-principal; letter-spacing:.05em; text-transform:uppercase; cursor:pointer; }
.editor-toggles input { width:auto; accent-color:#9a4f58; }
.image-preview { max-height:200px; overflow:hidden; margin-bottom:12px; }
.image-preview img { width:100%; height:auto; max-height:200px; object-fit:cover; }
.detail-block { margin-bottom:10px; }
.detail-block strong { display:block; font:600 9px $font-principal; letter-spacing:.1em; text-transform:uppercase; color:#9a4f58; margin-bottom:4px; }
.detail-block p { margin:3px 0; color:#625551; font-size:12px; line-height:1.4; }
.detail-block a { color:#9a4f58; font-size:11px; font-weight:600; }
.message-card { font-size:14px !important; font-family:$font-secondary; }
.item { display:flex; justify-content:space-between; font-size:12px; padding:4px 0; }
.detail-total { display:flex; justify-content:space-between; padding:10px 0; border-top:1px solid #d9c8c0; margin-top:10px; font:500 18px $font-secondary; }
.whatsapp-link { display:inline-block; margin-top:10px; border:0; padding:10px 14px; color:#fffaf6; background:#427a55; text-decoration:none; font:600 11px $font-principal; }
form { display:flex; flex-direction:column; gap:10px; }
.form-row { display:flex; gap:10px; }
.form-row label { flex:1; }
label { display:flex; flex-direction:column; gap:4px; color:#706663; font-size:9px; letter-spacing:.5px; text-transform:uppercase; }
label small { color:#9a4f58; font-size:8px; letter-spacing:.2px; text-transform:none; }
.full { width:100%; }
input,textarea,select { box-sizing:border-box; border:1px solid #d9c8c0; padding:9px; color:#211817; background:#fffdfb; font:13px $font-principal; }
textarea { resize:vertical; }
.form-message { margin:0; padding:10px; color:#706663; background:#f0e1da; font-size:11px; }
form > button[type=submit] { border:0; padding:14px; color:#fffaf6; background:#9a4f58; font:600 11px $font-principal; cursor:pointer; }
form > button[type=submit]:disabled { opacity:.65; cursor:wait; }
.cancel-btn { border:1px solid #706663; padding:12px; color:#706663; background:transparent; font:600 10px $font-principal; cursor:pointer; }
@media (max-width:900px) { .workspace { grid-template-columns:1fr; } .metrics { flex-wrap:wrap; } .metrics div { min-width:45%; } }
</style>
