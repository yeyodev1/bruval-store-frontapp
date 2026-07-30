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
const isNew = ref(false)

const emptyProduct: Omit<AdminProduct, '_id'> = {
  name: '', sku: '', collection: '', categories: [], palette: '',
  description: '', dimensions: '', image: '', price: 0, available: true, featured: false,
}

const filteredProducts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? products.value.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(term)) : products.value
})

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

function selectProduct(product: AdminProduct) {
  selected.value = { ...product, categories: [...(product.categories || [])] }
  isNew.value = false
  message.value = ''
}

function newProduct() {
  selected.value = { _id: '', ...emptyProduct, categories: [] }
  isNew.value = true
  message.value = ''
}

function categoriesText(product: AdminProduct): string {
  return Array.isArray(product.categories) ? product.categories.join(', ') : ''
}

function setCategoriesText(value: string) {
  if (!selected.value) return
  selected.value.categories = value.split(',').map((c) => c.trim()).filter(Boolean)
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
    if (isNew.value) {
      const { data } = await adminApi.createProduct(payload)
      products.value.unshift(data)
      selected.value = { ...data }
      isNew.value = false
      message.value = 'Producto creado correctamente.'
    } else {
      const { data } = await adminApi.updateProduct(_id, payload)
      products.value = products.value.map((product) => product._id === data._id ? data : product)
      selected.value = { ...data }
      message.value = 'Producto guardado. El precio ingresado es el precio final de venta.'
    }
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
      <p>Busca, edita o crea productos. Todos los campos son editables.</p>
    </section>

    <section class="workspace">
      <aside class="product-list">
        <div class="list-head">
          <h2>Catálogo</h2>
          <span>{{ products.length }} productos</span>
        </div>
        <div class="list-actions">
          <input v-model.trim="search" type="search" placeholder="Buscar por nombre o código">
          <button class="create-btn" type="button" @click="newProduct">+ Nuevo producto</button>
        </div>
        <p v-if="isLoading" class="status">Cargando catálogo...</p>
        <button v-for="product in filteredProducts" v-else :key="product._id" class="product-row" :class="{ active: selected?._id === product._id }" type="button" @click="selectProduct(product)">
          <img :src="product.image" :alt="product.name">
          <span><b>{{ product.name }}</b><small>{{ product.sku }} · {{ formatPrice(product.price) }}</small></span>
        </button>
      </aside>

      <section class="editor">
        <template v-if="selected">
          <div class="editor-head">
            <div>
              <p class="eyebrow">{{ isNew ? 'Nuevo producto' : 'Editar producto' }}</p>
              <h2>{{ selected.name || 'Sin nombre' }}</h2>
            </div>
            <div class="editor-toggles">
              <label class="toggle-label"><input v-model="selected.available" type="checkbox"> Disponible</label>
              <label class="toggle-label"><input v-model="selected.featured" type="checkbox"> Destacado</label>
            </div>
          </div>
          <div v-if="selected.image" class="image-preview"><img :src="selected.image" :alt="selected.name"></div>
          <form @submit.prevent="saveProduct">
            <label>Nombre<input v-model.trim="selected.name" required placeholder="Girasol Preservado"></label>
            <label>Código SKU<input v-model.trim="selected.sku" required placeholder="GP001"></label>
            <label>Colección<input v-model.trim="selected.collection" required placeholder="Girasoles preservados"></label>
            <label>Paleta de color<input v-model.trim="selected.palette" required placeholder="Amarillo mostaza"></label>
            <label>Medidas<input v-model.trim="selected.dimensions" required placeholder="18 x 27 cm"></label>
            <label>Precio final (USD)<input v-model.number="selected.price" required min="0" step="0.01" type="number"></label>
            <p class="price-note">El precio ingresado es el valor final que paga el cliente. No se aplicará otro descuento.</p>
            <label class="full">Categorías<small class="field-hint">Separadas por coma: Rosas, Ramos, Rojas</small><input v-model="selected.categories" @input="setCategoriesText(($event.target as HTMLInputElement).value)" :value="categoriesText(selected)" placeholder="Rosas, Ramos, Rojas"></label>
            <label class="full">URL de imagen Cloudinary<input v-model.trim="selected.image" required type="url" placeholder="https://res.cloudinary.com/..."></label>
            <label class="full">Descripción<textarea v-model.trim="selected.description" required rows="4" placeholder="Describe el arreglo..."></textarea></label>
            <button :disabled="isSaving" type="submit">{{ isSaving ? 'Guardando...' : (isNew ? 'Crear producto →' : 'Guardar cambios →') }}</button>
            <button v-if="isNew" class="cancel-btn" type="button" @click="selected = null; isNew = false">Cancelar</button>
          </form>
        </template>
        <div v-else class="empty"><p>Selecciona un producto del catálogo o crea uno nuevo.</p></div>
        <p v-if="message" class="status message">{{ message }}</p>
      </section>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.catalog-admin { min-height:100vh; padding:26px 5vw 80px; color:#211817; background:#fffaf6; } header,.list-head,.editor-head,nav { display:flex; align-items:center; } header { justify-content:space-between; } .brand { color:inherit; text-decoration:none; font:600 31px/1 $font-secondary; letter-spacing:-2px; } .brand span,.eyebrow { color:#9a4f58; } nav { gap:18px; } nav a,nav button { border:0; padding:0; color:#211817; background:transparent; font:600 11px $font-principal; text-decoration:none; cursor:pointer; } .intro { margin:84px 0 46px; } .eyebrow { margin:0; font:500 10px $font-principal; letter-spacing:1.4px; text-transform:uppercase; } .intro h1 { margin:14px 0 22px; font:500 clamp(58px,9vw,118px)/.78 $font-secondary; letter-spacing:-.07em; } .intro h1 i { padding-left:9vw; } .intro > p:last-child { max-width:390px; color:#706663; line-height:1.6; } .workspace { display:grid; grid-template-columns:minmax(280px,.8fr) minmax(0,1.5fr); gap:42px; align-items:start; } .product-list,.editor { border-top:1px solid #d9c8c0; } .list-head,.editor-head { justify-content:space-between; padding:20px 0; } .list-head h2,.editor-head h2 { margin:0; font:500 36px $font-secondary; letter-spacing:-.05em; } .list-head span { color:#706663; font-size:10px; text-transform:uppercase; letter-spacing:1px; } .list-actions { display:flex; gap:8px; margin-bottom:12px; } .list-actions input { flex:1; } .create-btn { flex:0 0 auto; border:1px solid #9a4f58; padding:0 14px; color:#9a4f58; background:transparent; font:600 10px $font-principal; letter-spacing:.06em; text-transform:uppercase; cursor:pointer; white-space:nowrap; } .create-btn:hover { color:#fffaf6; background:#9a4f58; } input,textarea { width:100%; box-sizing:border-box; border:1px solid #d9c8c0; padding:12px; color:#211817; background:#fffdfb; font:14px $font-principal; } textarea { resize:vertical; } .product-list > .list-actions input { margin-bottom:0; } .product-row { width:100%; display:flex; align-items:center; gap:12px; padding:10px 0; border:0; border-bottom:1px solid #eadfd9; background:transparent; text-align:left; cursor:pointer; } .product-row.active { background:#f0e1da; } .product-row img { width:48px; height:48px; object-fit:cover; } .product-row span { display:flex; flex-direction:column; gap:4px; } .product-row b { font:600 13px $font-principal; } .product-row small { color:#706663; font:10px 'DM Mono',monospace; } .editor { position:sticky; top:26px; } .editor-toggles { display:flex; gap:16px; } .toggle-label { display:flex; align-items:center; gap:6px; color:#706663; font:600 10px $font-principal; letter-spacing:.05em; text-transform:uppercase; cursor:pointer; } .toggle-label input { width:auto; accent-color:#9a4f58; } .image-preview { width:100%; max-height:280px; overflow:hidden; margin-bottom:20px; } .image-preview img { width:100%; height:auto; max-height:280px; object-fit:cover; } form { display:flex; flex-wrap:wrap; gap:14px; } form label { width:calc(50% - 7px); display:flex; flex-direction:column; gap:6px; color:#706663; font-size:10px; letter-spacing:.6px; text-transform:uppercase; } form .full { width:100%; } .field-hint { color:#9a4f58; font-size:8px; letter-spacing:.3px; text-transform:none; } .price-note { width:100%; margin:0; color:#9a4f58; font-size:11px; line-height:1.4; } form > button[type=submit] { width:100%; border:0; padding:16px 18px; color:#fffaf6; background:#9a4f58; font:600 12px $font-principal; cursor:pointer; } form > button[type=submit]:disabled { opacity:.65; cursor:wait; } .cancel-btn { width:100%; border:1px solid #706663; padding:14px 18px; color:#706663; background:transparent; font:600 11px $font-principal; cursor:pointer; } .empty { padding:40px 0; text-align:center; color:#706663; } .status { margin:20px 0 0; color:#706663; font-size:12px; } .status.message { padding:12px; color:#706663; background:#f0e1da; } @media (max-width:800px) { .workspace { grid-template-columns:1fr; } .editor { position:static; } }
</style>
