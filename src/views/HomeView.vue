<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { storeApi, type CartItem, type CheckoutPayload, type Product } from '@/services/storeApi'

const products = ref<Product[]>([])
const cart = ref<CartItem[]>([])
const isLoading = ref(true)
const isCartOpen = ref(false)
const selected = ref<Product | null>(null)
const isCheckoutOpen = ref(false)
const checkoutStep = ref<'details' | 'payment'>('details')
const isSubmitting = ref(false)
const errorMessage = ref('')
const orderNumber = ref('')
const payment = ref<{ token?: string; storeId?: string }>({})
const checkout = ref({ name: '', email: '', phone: '', recipient: '', address: '', mapUrl: '', date: '', timeSlot: '09:00 - 12:00', messageCard: '' })

const cartCount = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0))
const subtotal = computed(() => cart.value.reduce((total, item) => total + item.price * item.quantity, 0))
const deliveryFee = computed(() => cart.value.length ? 4.5 : 0)
const total = computed(() => subtotal.value + deliveryFee.value)
const formatPrice = (value: number) => `$${value.toFixed(2)}`

function addToCart(product: Product) {
  const current = cart.value.find((item) => item._id === product._id)
  if (current) current.quantity += 1
  else cart.value.push({ ...product, quantity: 1 })
  selected.value = null
  isCartOpen.value = true
}

function changeQuantity(id: string, amount: number) {
  const item = cart.value.find((entry) => entry._id === id)
  if (!item) return
  item.quantity += amount
  if (item.quantity < 1) cart.value = cart.value.filter((entry) => entry._id !== id)
}

function openCheckout() {
  isCartOpen.value = false
  isCheckoutOpen.value = true
  checkoutStep.value = 'details'
  errorMessage.value = ''
}

async function beginPayment() {
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const payload: CheckoutPayload = {
      items: cart.value.map((item) => ({ productId: item._id, quantity: item.quantity })),
      customer: { name: checkout.value.name, email: checkout.value.email, phone: checkout.value.phone },
      delivery: { recipient: checkout.value.recipient, address: checkout.value.address, mapUrl: checkout.value.mapUrl, date: checkout.value.date, timeSlot: checkout.value.timeSlot, messageCard: checkout.value.messageCard },
    }
    const { data } = await storeApi.createOrder(payload)
    orderNumber.value = data.orderNumber
    payment.value = data.payphone
    checkoutStep.value = 'payment'
    await nextTick()
    await renderPayphone()
  } catch (error: any) {
    errorMessage.value = error.message || 'No pudimos preparar tu pago. Inténtalo nuevamente.'
  } finally {
    isSubmitting.value = false
  }
}

function loadPayphone() {
  if ((window as any).PPaymentButtonBox) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-payphone]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      return
    }
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.js'
    script.dataset.payphone = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar Payphone'))
    document.head.appendChild(script)
  })
}

async function renderPayphone() {
  try {
    await loadPayphone()
    const target = document.getElementById('payphone-button')
    if (!target || !payment.value.token || !payment.value.storeId) throw new Error('Payphone no está configurado')
    target.innerHTML = ''
    new (window as any).PPaymentButtonBox({
      token: payment.value.token,
      storeId: payment.value.storeId,
      clientTransactionId: orderNumber.value,
      amount: Math.round(total.value * 100),
      amountWithoutTax: Math.round(total.value * 100),
      currency: 'USD',
      reference: `Flores Bruval ${orderNumber.value}`,
      lang: 'es',
      defaultMethod: 'card',
      timeZone: -5,
      phoneNumber: checkout.value.phone,
      email: checkout.value.email,
    }).render('payphone-button')
  } catch (error: any) {
    errorMessage.value = error.message || 'No pudimos cargar el pago seguro.'
  }
}

onMounted(async () => {
  try {
    const { data } = await storeApi.products()
    products.value = data
  } catch {
    errorMessage.value = 'No pudimos cargar los arreglos. Revisa que la API esté disponible.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <main class="storefront">
    <section class="hero">
      <nav class="nav"><a class="brand" href="#inicio">bruval<span>.</span></a><p class="nav-note">Flores para sentir cerca</p><button class="cart-trigger" type="button" @click="isCartOpen = true">Bolsa <b>{{ cartCount }}</b></button></nav>
      <div id="inicio" class="hero-copy"><p class="eyebrow">Floristería contemporánea · Quito</p><h1>Un gesto<br><i>vivo.</i></h1><p class="hero-text">Diseñamos flores con intención, para los días que merecen quedar en la memoria.</p><a href="#coleccion" class="text-link">Ver colección <span>↓</span></a></div>
      <div class="hero-image"><img src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1500&q=90" alt="Arreglo floral Bruval"><p>Hecho para tu momento</p></div>
    </section>

    <section id="coleccion" class="collection"><div class="section-heading"><div><p class="eyebrow">La colección</p><h2>Flores que<br>hablan por ti.</h2></div><p>Una selección de arreglos de temporada preparados con flores frescas, textura y mucho cuidado.</p></div>
      <p v-if="errorMessage && !isCheckoutOpen" class="error">{{ errorMessage }}</p>
      <div class="product-list">
        <template v-if="isLoading"><article v-for="index in 10" :key="index" class="product-card skeleton"><div class="product-image"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></article></template>
        <article v-for="product in products" :key="product._id" class="product-card"><button class="product-image" type="button" @click="selected = product"><img :src="product.image" :alt="product.name"><span>{{ product.palette }}</span></button><div class="product-info"><div><h3>{{ product.name }}</h3><p>{{ product.description }}</p></div><div class="product-bottom"><strong>{{ formatPrice(product.price) }}</strong><button type="button" aria-label="Agregar al carrito" @click="addToCart(product)">+</button></div></div></article>
      </div>
    </section>

    <section class="manifesto"><p class="eyebrow">Bruval, con amor</p><p class="manifesto-copy">“No enviamos solamente flores. Enviamos el pequeño segundo en el que alguien se siente profundamente pensado.”</p><div><span>Fresco</span><span>Local</span><span>Intencional</span></div></section>
    <footer><a class="brand" href="#inicio">bruval<span>.</span></a><p>Quito, Ecuador · Todos los días</p><p>© 2026 Bruval Flores</p></footer>

    <Transition name="fade"><div v-if="isCartOpen || selected || isCheckoutOpen" class="backdrop" @click.self="isCartOpen = false; selected = null; isCheckoutOpen = false"></div></Transition>
    <Transition name="drawer"><aside v-if="isCartOpen" class="cart-panel"><div class="panel-head"><div><p class="eyebrow">Tu selección</p><h2>La bolsa</h2></div><button type="button" @click="isCartOpen = false">×</button></div><div v-if="cart.length" class="cart-items"><div v-for="item in cart" :key="item._id" class="cart-item"><img :src="item.image" :alt="item.name"><div><h3>{{ item.name }}</h3><p>{{ formatPrice(item.price) }}</p><div class="quantity"><button type="button" @click="changeQuantity(item._id, -1)">−</button><span>{{ item.quantity }}</span><button type="button" @click="changeQuantity(item._id, 1)">+</button></div></div><strong>{{ formatPrice(item.price * item.quantity) }}</strong></div></div><div v-else class="empty-state"><p>Tu bolsa está esperando algo bonito.</p><button type="button" class="text-link" @click="isCartOpen = false">Explorar flores</button></div><div v-if="cart.length" class="cart-total"><div><span>Subtotal</span><strong>{{ formatPrice(subtotal) }}</strong></div><div><span>Entrega</span><strong>{{ formatPrice(deliveryFee) }}</strong></div><div class="grand-total"><span>Total</span><strong>{{ formatPrice(total) }}</strong></div><button class="primary-button" type="button" @click="openCheckout">Continuar al checkout <span>→</span></button></div></aside></Transition>

    <Transition name="modal"><section v-if="selected" class="modal product-modal"><button class="close" type="button" @click="selected = null">×</button><img :src="selected.image" :alt="selected.name"><div><p class="eyebrow">{{ selected.palette }}</p><h2>{{ selected.name }}</h2><p>{{ selected.description }}</p><strong>{{ formatPrice(selected.price) }}</strong><button class="primary-button" type="button" @click="addToCart(selected)">Agregar a la bolsa <span>→</span></button></div></section></Transition>

    <Transition name="modal"><section v-if="isCheckoutOpen" class="modal checkout-modal"><button class="close" type="button" @click="isCheckoutOpen = false">×</button><div class="checkout-intro"><p class="eyebrow">Checkout seguro</p><h2>{{ checkoutStep === 'details' ? 'Casi en sus manos.' : 'Un último paso.' }}</h2><p>{{ checkoutStep === 'details' ? 'Cuéntanos dónde y cuándo debe llegar este gesto.' : 'Completa tu pago seguro con PayPhone. Tu selección está reservada.' }}</p><div class="checkout-total"><span>Total</span><strong>{{ formatPrice(total) }}</strong></div></div><form v-if="checkoutStep === 'details'" class="checkout-form" @submit.prevent="beginPayment"><label>Tu nombre<input v-model.trim="checkout.name" required autocomplete="name"></label><label>Correo para confirmaciones<input v-model.trim="checkout.email" required type="email" autocomplete="email"></label><label>Teléfono<input v-model.trim="checkout.phone" required type="tel" placeholder="+593..."></label><label>Nombre de quien recibe<input v-model.trim="checkout.recipient" required></label><label class="full">Dirección de entrega<textarea v-model.trim="checkout.address" required rows="2"></textarea></label><label class="full">Link de Google Maps<input v-model.trim="checkout.mapUrl" required type="url" placeholder="https://maps.google.com/..."></label><label>Fecha de entrega<input v-model="checkout.date" required type="date"></label><label>Franja horaria<select v-model="checkout.timeSlot"><option>09:00 - 12:00</option><option>12:00 - 15:00</option><option>15:00 - 18:00</option></select></label><label class="full">Tarjeta de memoria<textarea v-model.trim="checkout.messageCard" required rows="3" placeholder="Escribe el mensaje que acompañará las flores..."></textarea></label><p v-if="errorMessage" class="error full">{{ errorMessage }}</p><button class="primary-button full" :disabled="isSubmitting" type="submit">{{ isSubmitting ? 'Preparando pago...' : 'Ir al pago seguro' }} <span>→</span></button></form><div v-else class="payment-step"><div id="payphone-button" class="payphone-loading"><span></span><p>Cargando pago seguro...</p></div><p v-if="errorMessage" class="error">{{ errorMessage }}</p><button type="button" class="text-link" @click="checkoutStep = 'details'">← Editar información</button></div></section></Transition>
  </main>
</template>

<style lang="scss" scoped>
.storefront { color:#211817; background:#fffaf6; overflow:hidden; } button { font:inherit; cursor:pointer; } .hero { min-height:100vh; padding:24px 4vw 46px; position:relative; display:flex; flex-direction:column; background:#dfc8bc; } .nav, footer, .section-heading, .product-bottom, .panel-head, .cart-item, .cart-total > div, .checkout-total { display:flex; align-items:center; } .nav { justify-content:space-between; position:relative; z-index:2; } .brand { color:inherit; text-decoration:none; font:600 31px/1 $font-secondary; letter-spacing:-2px; } .brand span { color:#a6535b; } .nav-note, .eyebrow, footer, .hero-image p { font:500 10px/1.4 $font-principal; letter-spacing:1.7px; text-transform:uppercase; } .nav-note { margin-left:auto; margin-right:32px; } .cart-trigger { border:0; background:transparent; padding:8px 0; } .cart-trigger b { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; margin-left:7px; border-radius:50%; background:#211817; color:#fffaf6; font-size:10px; } .hero-copy { width:52%; min-width:520px; margin-top:auto; padding:110px 0 32px 5vw; position:relative; z-index:1; } .eyebrow { color:#9a4f58; margin:0 0 18px; } h1,h2,h3,p { margin:0; } h1,h2 { font-family:$font-secondary; font-weight:500; letter-spacing:-.06em; } h1 { font-size:clamp(84px,12.5vw,182px); line-height:.75; } h1 i { padding-left:13vw; } .hero-text { max-width:300px; margin:42px 0 23px; color:#4f403d; line-height:1.55; } .text-link { border:0; background:none; padding:0; color:inherit; text-decoration:none; font:600 12px $font-principal; letter-spacing:.2px; } .text-link span { margin-left:13px; color:#9a4f58; font-size:16px; } .hero-image { position:absolute; width:40%; max-width:580px; height:76%; right:5vw; top:14%; overflow:hidden; } .hero-image img, .product-image img { width:100%; height:100%; object-fit:cover; transition:transform .7s cubic-bezier(.2,.8,.2,1); } .hero-image:hover img, .product-image:hover img { transform:scale(1.04); } .hero-image p { position:absolute; right:18px; bottom:18px; margin:0; padding:7px 9px; background:#fffaf6; }
.collection { padding:150px 5vw 100px; } .section-heading { justify-content:space-between; align-items:flex-end; margin-bottom:70px; } .section-heading h2 { font-size:clamp(48px,6vw,80px); line-height:.88; } .section-heading > p { width:290px; color:#706663; line-height:1.6; } .product-list { display:flex; flex-wrap:wrap; gap:48px 2%; } .product-card { width:calc(25% - 1.5%); min-width:210px; display:flex; flex-direction:column; gap:16px; } .product-image { height:390px; padding:0; border:0; background:#e8dbd3; position:relative; overflow:hidden; } .product-image span { position:absolute; top:14px; left:14px; padding:7px 9px; background:#fffaf6; font:500 9px $font-principal; letter-spacing:1px; text-transform:uppercase; } .product-info { display:flex; flex-direction:column; gap:20px; } .product-info h3 { font:500 25px/1 $font-secondary; } .product-info p { min-height:42px; color:#706663; font-size:12px; line-height:1.45; } .product-bottom { justify-content:space-between; } .product-bottom strong { font:500 12px 'DM Mono', monospace; } .product-bottom button { width:29px; height:29px; border:1px solid #d0bdb4; border-radius:50%; background:transparent; font-size:20px; line-height:1; transition:.2s; } .product-bottom button:hover { color:#fffaf6; background:#211817; border-color:#211817; } .skeleton .product-image,.skeleton-line { animation:pulse 1.3s infinite alternate; background:#e8ddd7; } .skeleton-line { width:75%; height:15px; } .skeleton-line.short { width:38%; } @keyframes pulse { to { opacity:.45; } }
.manifesto { min-height:550px; padding:120px 12vw; color:#fffaf6; background:#2c3430; display:flex; flex-direction:column; justify-content:center; } .manifesto .eyebrow { color:#dca7a3; } .manifesto-copy { max-width:860px; font:500 clamp(38px,5vw,70px)/1.03 $font-secondary; letter-spacing:-.05em; } .manifesto > div { display:flex; gap:12px; margin-top:48px; } .manifesto span { border:1px solid rgba(255,255,255,.35); padding:8px 12px; border-radius:100px; font-size:10px; text-transform:uppercase; letter-spacing:1px; } footer { justify-content:space-between; padding:28px 5vw; color:#706663; } footer .brand { color:#211817; }
.backdrop { position:fixed; inset:0; z-index:8; background:rgba(33,24,23,.4); backdrop-filter:blur(4px); } .cart-panel { position:fixed; z-index:9; inset:0 0 0 auto; width:min(490px,100vw); padding:32px; background:#fffaf6; display:flex; flex-direction:column; } .panel-head { justify-content:space-between; } .panel-head h2 { font-size:48px; } .panel-head > button,.close { width:38px; height:38px; border:0; background:#eee1da; border-radius:50%; font-size:26px; line-height:1; } .cart-items { display:flex; flex-direction:column; gap:22px; padding:36px 0; overflow:auto; } .cart-item { align-items:flex-start; gap:14px; } .cart-item img { width:76px; height:90px; object-fit:cover; } .cart-item > div { flex:1; } .cart-item h3 { font:500 21px $font-secondary; } .cart-item p { margin:5px 0 12px; color:#706663; font:12px 'DM Mono',monospace; } .cart-item > strong { font:12px 'DM Mono',monospace; } .quantity { display:flex; align-items:center; gap:10px; } .quantity button { width:22px; height:22px; border:1px solid #d0bdb4; border-radius:50%; background:transparent; } .quantity span { font-size:12px; } .cart-total { margin-top:auto; padding-top:22px; border-top:1px solid #e1d4ce; display:flex; flex-direction:column; gap:12px; } .cart-total > div { justify-content:space-between; color:#706663; font-size:13px; } .cart-total .grand-total { padding:13px 0; color:#211817; font:500 19px $font-secondary; } .primary-button { display:flex; align-items:center; justify-content:space-between; width:100%; border:0; padding:16px 18px; color:#fffaf6; background:#9a4f58; font:600 12px $font-principal; transition:background .2s,transform .2s; } .primary-button:hover { background:#7f3e46; transform:translateY(-1px); } .primary-button:disabled { opacity:.65; cursor:wait; } .primary-button span { font-size:20px; line-height:0; } .empty-state { margin:auto; text-align:center; color:#706663; display:flex; flex-direction:column; align-items:center; gap:20px; }
.modal { position:fixed; z-index:10; inset:50% auto auto 50%; transform:translate(-50%,-50%); background:#fffaf6; box-shadow:0 25px 80px rgba(33,24,23,.28); } .close { position:absolute; z-index:2; top:18px; right:18px; } .product-modal { width:min(850px,92vw); display:flex; } .product-modal > img { width:48%; min-height:510px; object-fit:cover; } .product-modal > div { flex:1; padding:70px 52px; display:flex; flex-direction:column; align-items:flex-start; } .product-modal h2,.checkout-modal h2 { font-size:52px; line-height:.92; } .product-modal > div > p:not(.eyebrow) { margin:28px 0; color:#706663; line-height:1.6; } .product-modal strong { margin-bottom:34px; font:16px 'DM Mono',monospace; } .checkout-modal { width:min(860px,94vw); max-height:92vh; overflow:auto; padding:58px; display:flex; gap:56px; } .checkout-intro { width:33%; } .checkout-intro > p:not(.eyebrow) { margin:22px 0; color:#706663; line-height:1.6; font-size:14px; } .checkout-total { justify-content:space-between; padding-top:20px; border-top:1px solid #e1d4ce; font:500 18px $font-secondary; } .checkout-form,.payment-step { flex:1; display:flex; flex-wrap:wrap; align-content:flex-start; gap:16px; } .checkout-form label { width:calc(50% - 8px); display:flex; flex-direction:column; gap:7px; color:#706663; font-size:10px; letter-spacing:.8px; text-transform:uppercase; } .checkout-form .full { width:100%; } input,textarea,select { width:100%; box-sizing:border-box; border:1px solid #d9cbc4; border-radius:0; padding:11px; color:#211817; background:#fffdfb; font:14px $font-principal; outline-color:#9a4f58; } textarea { resize:vertical; } .error { color:#b23d45; font-size:13px; line-height:1.4; } .payment-step { flex-direction:column; gap:20px; } .payphone-loading { min-height:110px; padding:20px; border:1px solid #e1d4ce; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:#706663; font-size:12px; } .payphone-loading span { width:23px; height:23px; border:2px solid #dbc3b8; border-top-color:#9a4f58; border-radius:50%; animation:spin .8s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } }
.fade-enter-active,.fade-leave-active { transition:opacity .3s ease; } .fade-enter-from,.fade-leave-to { opacity:0; } .drawer-enter-active,.drawer-leave-active { transition:transform .45s cubic-bezier(.2,.8,.2,1); } .drawer-enter-from,.drawer-leave-to { transform:translateX(100%); } .modal-enter-active,.modal-leave-active { transition:opacity .28s ease,transform .35s cubic-bezier(.2,.8,.2,1); } .modal-enter-from,.modal-leave-to { opacity:0; transform:translate(-50%,-46%) scale(.98); }
@media (max-width:800px) { .nav-note { display:none; } .hero { min-height:760px; } .hero-copy { width:100%; min-width:0; padding:290px 5vw 30px; } h1 { font-size:25vw; } .hero-image { width:62%; height:290px; top:104px; right:5vw; } .section-heading,.checkout-modal { align-items:flex-start; flex-direction:column; } .section-heading { gap:28px; } .section-heading > p,.checkout-intro { width:100%; } .product-list { gap:38px 4%; } .product-card { width:48%; min-width:0; } .product-image { height:270px; } .collection { padding:100px 5vw 70px; } .manifesto { min-height:420px; padding:80px 8vw; } footer { align-items:flex-start; flex-direction:column; gap:12px; } .product-modal { max-height:92vh; overflow:auto; flex-direction:column; } .product-modal > img { width:100%; min-height:250px; max-height:300px; } .product-modal > div { padding:38px 28px; } .checkout-modal { padding:42px 24px; gap:30px; } .checkout-form { width:100%; } } @media (max-width:420px) { .product-card { width:100%; } .product-image { height:340px; } .checkout-form label { width:100%; } }
</style>
