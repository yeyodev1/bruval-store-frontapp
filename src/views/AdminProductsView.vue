<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi, type AdminProduct } from '@/services/adminApi'

const router = useRouter()
const products = ref<AdminProduct[]>([])
const search = ref('')
const isLoading = ref(true)
const error = ref('')
const filteredProducts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? products.value.filter((product) => `${product.name} ${product.sku} ${product.collection}`.toLowerCase().includes(term)) : products.value
})
const formatPrice = (value: number) => `$${value.toFixed(2)}`

async function loadProducts() {
  try { products.value = (await adminApi.products()).data }
  catch (reason: any) { error.value = reason.message || 'No pudimos cargar el catálogo.' }
  finally { isLoading.value = false }
}
function logout() { localStorage.removeItem('access_token'); localStorage.removeItem('admin_name'); router.replace('/admin/login') }
onMounted(loadProducts)
</script>

<template>
  <main class="catalog-admin">
    <header><a href="/" class="brand">bruval<span>.</span></a><nav><RouterLink to="/admin">Órdenes</RouterLink><button type="button" @click="logout">Salir</button></nav></header>
    <section class="intro"><p class="eyebrow">Administración · Catálogo</p><h1>Productos y<br><i>detalles.</i></h1><p>Busca un producto y ábrelo para editar sus datos, disponibilidad y fotografía.</p></section>
    <section class="catalog-tools"><label class="search-field"><span>Buscar producto</span><input v-model.trim="search" type="search" placeholder="Nombre, código o colección"></label><RouterLink class="create-btn" to="/admin/productos/nuevo">+ Nuevo producto</RouterLink></section>
    <p v-if="isLoading" class="status">Cargando catálogo...</p><p v-else-if="error" class="status error">{{ error }}</p>
    <section v-else class="product-grid" aria-label="Productos"><RouterLink v-for="product in filteredProducts" :key="product._id" class="product-card" :to="`/admin/productos/${product._id}`"><img :src="product.image" :alt="product.name"><span><b>{{ product.name }}</b><small>{{ product.sku }} · {{ product.collection }}</small><strong>{{ formatPrice(product.price) }}</strong></span><em>Editar</em></RouterLink><p v-if="!filteredProducts.length" class="status">No encontramos productos con esa búsqueda.</p></section>
  </main>
</template>

<style lang="scss" scoped>
.catalog-admin { min-height:100vh; padding:26px 5vw 80px; color:#211817; background:#fffaf6; } header,nav,.catalog-tools { display:flex; align-items:center; }header,.catalog-tools { justify-content:space-between; gap:20px; }.brand { color:inherit; text-decoration:none; font:600 31px/1 $font-secondary; letter-spacing:-2px; }.brand span,.eyebrow { color:#9a4f58; }nav { gap:18px; }nav a,nav button { border:0; padding:0; color:#211817; background:transparent; font:600 11px $font-principal; text-decoration:none; cursor:pointer; }.intro { margin:72px 0 36px; }.eyebrow { margin:0; font:500 10px $font-principal; letter-spacing:1.4px; text-transform:uppercase; }.intro h1 { margin:14px 0 22px; font:500 clamp(52px,9vw,108px)/.78 $font-secondary; letter-spacing:-.07em; }.intro h1 i { padding-left:9vw; }.intro > p:last-child { max-width:440px; color:#706663; line-height:1.6; }.catalog-tools { padding:16px 0; border-top:1px solid #d9c8c0; border-bottom:1px solid #d9c8c0; }.search-field { display:flex; align-items:center; gap:12px; flex:1; max-width:510px; }.search-field span { color:#706663; font:600 10px $font-principal; letter-spacing:.06em; text-transform:uppercase; white-space:nowrap; }input { width:100%; box-sizing:border-box; border:1px solid #d9c8c0; border-radius:4px; padding:12px; color:#211817; background:#fffdfb; font:14px $font-principal; }.create-btn { border-radius:4px; padding:13px 17px; color:#fffaf6; background:#9a4f58; font:600 10px $font-principal; letter-spacing:.05em; text-decoration:none; text-transform:uppercase; }.product-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; padding:24px 0; }.product-card { display:grid; grid-template-columns:62px 1fr auto; align-items:center; gap:11px; min-width:0; padding:10px; border:1px solid #e4d7d0; border-radius:7px; color:inherit; background:#fffdfb; text-decoration:none; }.product-card:hover { border-color:#9a4f58; background:#f9f0eb; }.product-card img { width:62px; height:62px; object-fit:cover; border-radius:4px; }.product-card span { display:flex; flex-direction:column; min-width:0; gap:4px; }.product-card b,.product-card small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.product-card b { font-size:12px; }.product-card small { color:#706663; font-size:10px; }.product-card strong { font:11px 'DM Mono',monospace; }.product-card em { color:#9a4f58; font:600 9px $font-principal; font-style:normal; text-transform:uppercase; }.status { margin:22px 0; color:#706663; font-size:13px; }.error { color:#b23d45; }@media(max-width:720px) { .catalog-admin { padding:20px 5vw 60px; }.intro { margin:50px 0 28px; }.catalog-tools,.search-field { align-items:flex-start; flex-direction:column; }.search-field { width:100%; gap:6px; }.create-btn { width:100%; box-sizing:border-box; text-align:center; }.product-grid { grid-template-columns:1fr; } }
</style>
