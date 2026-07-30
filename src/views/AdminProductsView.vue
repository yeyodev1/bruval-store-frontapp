<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi, type AdminProduct } from '@/services/adminApi'

const router = useRouter()
const products = ref<AdminProduct[]>([])
const selected = ref<AdminProduct | null>(null)
const search = ref('')
const isLoading = ref(true)
const isSaving = ref(false)
const message = ref('')

const filteredProducts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? products.value.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(term)) : products.value
})

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

function selectProduct(product: AdminProduct) {
  selected.value = { ...product }
  message.value = ''
}

async function loadProducts() {
  try {
    isLoading.value = true
    const { data } = await adminApi.products()
    products.value = data
  } catch (reason: any) {
    message.value = reason.message || 'No pudimos cargar el catálogo.'
  } finally {
    isLoading.value = false
  }
}

async function saveProduct() {
  if (!selected.value) return
  try {
    isSaving.value = true
    message.value = ''
    const { _id, ...payload } = selected.value
    const { data } = await adminApi.updateProduct(_id, payload)
    products.value = products.value.map((product) => product._id === data._id ? data : product)
    selected.value = { ...data }
    message.value = 'Producto guardado. El valor registrado es el precio final de venta.'
  } catch (reason: any) {
    message.value = reason.message || 'No pudimos guardar el producto.'
  } finally {
    isSaving.value = false
  }
}

function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('admin_name')
  router.replace('/admin/login')
}

onMounted(loadProducts)
</script>

<template>
  <main class="catalog-admin">
    <header>
      <a href="/" class="brand">bruval<span>.</span></a>
      <nav><RouterLink to="/admin">Ventas</RouterLink><button type="button" @click="logout">Salir</button></nav>
    </header>

    <section class="intro">
      <p class="eyebrow">Administración · Catálogo</p>
      <h1>Productos y<br><i>detalles.</i></h1>
      <p>Actualiza la foto, código, medidas y precio final de cada creación.</p>
    </section>

    <section class="workspace">
      <aside class="product-list">
        <div class="list-head"><h2>Catálogo</h2><span>{{ products.length }} productos</span></div>
        <input v-model.trim="search" type="search" placeholder="Buscar por nombre o código">
        <p v-if="isLoading" class="status">Cargando catálogo...</p>
        <button v-for="product in filteredProducts" v-else :key="product._id" class="product-row" :class="{ active: selected?._id === product._id }" type="button" @click="selectProduct(product)">
          <img :src="product.image" :alt="product.name">
          <span><b>{{ product.name }}</b><small>{{ product.sku }} · {{ formatPrice(product.price) }}</small></span>
        </button>
      </aside>

      <section class="editor">
        <template v-if="selected">
          <div class="editor-head"><div><p class="eyebrow">Editar producto</p><h2>{{ selected.name }}</h2></div><label class="availability"><input v-model="selected.available" type="checkbox"> Disponible</label></div>
          <div class="image-preview"><img :src="selected.image" :alt="selected.name"></div>
          <form @submit.prevent="saveProduct">
            <label>Nombre<input v-model.trim="selected.name" required></label>
            <label>Código<input v-model.trim="selected.sku" required></label>
            <label class="full">URL de imagen Cloudinary<input v-model.trim="selected.image" required type="url" placeholder="https://res.cloudinary.com/..."> </label>
            <label>Medidas<input v-model.trim="selected.dimensions" required placeholder="18 x 27 cm"></label>
            <label>Precio final (USD)<input v-model.number="selected.price" required min="0" step="0.01" type="number"></label>
            <p class="price-note">El precio ingresado es el valor final que paga el cliente. No se aplicará otro descuento.</p>
            <label class="full">Descripción<textarea v-model.trim="selected.description" required rows="4"></textarea></label>
            <button :disabled="isSaving" type="submit">{{ isSaving ? 'Guardando...' : 'Guardar cambios →' }}</button>
          </form>
        </template>
        <div v-else class="empty"><p>Selecciona un producto del catálogo para editarlo.</p></div>
        <p v-if="message" class="status message">{{ message }}</p>
      </section>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.catalog-admin { min-height:100vh; padding:26px 5vw 80px; color:#211817; background:#fffaf6; } header,.list-head,.editor-head,nav { display:flex; align-items:center; } header { justify-content:space-between; } .brand { color:inherit; text-decoration:none; font:600 31px/1 $font-secondary; letter-spacing:-2px; } .brand span,.eyebrow { color:#9a4f58; } nav { gap:18px; } nav a,nav button { border:0; padding:0; color:#211817; background:transparent; font:600 11px $font-principal; text-decoration:none; cursor:pointer; } .intro { margin:84px 0 46px; } .eyebrow { margin:0; font:500 10px $font-principal; letter-spacing:1.4px; text-transform:uppercase; } .intro h1 { margin:14px 0 22px; font:500 clamp(58px,9vw,118px)/.78 $font-secondary; letter-spacing:-.07em; } .intro h1 i { padding-left:9vw; } .intro > p:last-child { max-width:390px; color:#706663; line-height:1.6; } .workspace { display:grid; grid-template-columns:minmax(280px,.8fr) minmax(0,1.5fr); gap:42px; align-items:start; } .product-list,.editor { border-top:1px solid #d9c8c0; } .list-head,.editor-head { justify-content:space-between; padding:20px 0; } h2 { margin:0; font:500 36px $font-secondary; letter-spacing:-.05em; } .list-head span { color:#706663; font-size:10px; text-transform:uppercase; letter-spacing:1px; } input,textarea { width:100%; box-sizing:border-box; border:1px solid #d9c8c0; padding:12px; color:#211817; background:#fffdfb; font:14px $font-principal; } .product-list > input { margin-bottom:12px; } .product-row { width:100%; display:flex; align-items:center; gap:12px; padding:10px 0; border:0; border-bottom:1px solid #eadfd9; background:transparent; text-align:left; cursor:pointer; } .product-row.active { background:#f0e1da; } .product-row img { width:48px; height:48px; object-fit:cover; } .product-row span { display:flex; flex-direction:column; gap:4px; } .product-row b { font:600 13px $font-principal; } .product-row small { color:#706663; font:10px 'DM Mono',monospace; } .editor { position:sticky; top:20px; padding-top:1px; } .availability { display:flex; align-items:center; gap:7px; font-size:12px; } .availability input { width:auto; } .image-preview { height:235px; margin-bottom:24px; overflow:hidden; background:#efe2db; } .image-preview img { width:100%; height:100%; object-fit:contain; } form { display:grid; grid-template-columns:1fr 1fr; gap:16px; } form label { display:flex; flex-direction:column; gap:7px; font:600 10px $font-principal; letter-spacing:.08em; text-transform:uppercase; } .full,.price-note,form button { grid-column:1 / -1; } .price-note { margin:0; padding:12px; color:#7c4e47; background:#f3e5de; font-size:12px; line-height:1.45; } form button { justify-self:start; border:0; padding:14px 18px; color:#fffaf6; background:#211817; font:600 11px $font-principal; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; } form button:disabled { opacity:.6; cursor:wait; } .status { color:#706663; font-size:13px; } .message { margin:18px 0; color:#4c7455; } .empty { min-height:420px; display:grid; place-items:center; color:#706663; text-align:center; } @media (max-width:800px) { .workspace { grid-template-columns:1fr; } .editor { position:static; } .intro { margin-top:62px; } } @media (max-width:480px) { form { grid-template-columns:1fr; } .catalog-admin { padding-inline:24px; } }
</style>
