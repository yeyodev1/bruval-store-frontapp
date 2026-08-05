<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import {
  storeApi,
  type CartItem,
  type CheckoutPayload,
  type Product,
} from "@/services/storeApi";

function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

const checkoutDefaults = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  phoneConfirmed: false,
  recipient: "",
  address: "",
  mapUrl: "",
  zone: "",
  date: "",
  timeSlot: "09:00 - 12:00",
  messageCard: "",
};
const currentUrl = new URL(window.location.href);
const generatedOfferId = crypto.randomUUID();
const offerId = currentUrl.searchParams.get("oferta") || generatedOfferId;
if (!currentUrl.searchParams.has("oferta")) {
  currentUrl.searchParams.set("oferta", offerId);
  window.history.replaceState({}, "", currentUrl);
}

const products = ref<Product[]>([]);
const cart = ref<CartItem[]>(readStored<CartItem[]>("bruval-cart", []));
const isLoading = ref(true);
const isCartOpen = ref(false);
const selected = ref<Product | null>(null);
const loadedImages = ref(new Set<string>());
const showFullCatalog = ref(false);
const activeCategory = ref("Todos");
const activeSort = ref("quality");
const searchQuery = ref("");
const catalogPage = ref(1);
const hasMore = ref(false);
const isLoadingMore = ref(false);
const catalogTotal = ref(0);
const sentinel = ref<HTMLElement | null>(null);
const isCheckoutOpen = ref(false);
const isCheckoutWhatsAppOpen = ref(false);
const isCheckoutWhatsAppConfirmationOpen = ref(false);
const isDeliveryZoneWarningOpen = ref(false);
const deliveryDetailsConfirmed = ref(false);
const checkoutStep = ref<"details" | "payment">("details");
const isSubmitting = ref(false);
const errorMessage = ref("");
const orderNumber = ref("");
const payment = ref<{ token?: string; storeId?: string }>({});
const checkout = ref({ ...checkoutDefaults, ...readStored("bruval-checkout", {}) });
const phonePrefix = ref(readStored("bruval-phone-prefix", "+593"));
const offer = ref<{ active: boolean; expiresAt: string } | null>(null);
const now = ref(Date.now());
let countdownTimer: ReturnType<typeof setInterval> | undefined;

const cartCount = computed(() =>
  cart.value.reduce((total, item) => total + item.quantity, 0),
);
const subtotal = computed(() =>
  cart.value.reduce((total, item) => total + item.price * item.quantity, 0),
);
const deliveryZones = [
  { name: "Zona Centro", fee: 8 },
  { name: "Zona Norte", fee: 8 },
  { name: "Zona Sur", fee: 10 },
  { name: "Zona Sur Sector Puerto", fee: 13 },
  { name: "Zona Durán Centro", fee: 10 },
  { name: "Vía Durán Tambo", fee: 12 },
  { name: "Vía Samborondón (hasta el Km 5)", fee: 10 },
  { name: "Vía Samborondón (desde Km 5 hasta Estancia del Río)", fee: 12 },
  { name: "Vía a Daule (hasta el Km 10)", fee: 10 },
  { name: "Vía a Daule (desde Km 10 hasta Km 16)", fee: 13 },
  { name: "Vía Daule (hasta Unilever)", fee: 18 },
  { name: "Vía Salitre", fee: 13 },
  { name: "Vía La Costa Chongón", fee: 18 },
  { name: "La Aurora (La Joya, Villa Club, Villas del Rey)", fee: 12 },
  { name: "Sector Centro Comercial El Dorado", fee: 13 },
];
const selectedDeliveryZone = computed(() =>
  deliveryZones.find((zone) => zone.name === checkout.value.zone),
);
const deliveryFee = computed(() =>
  cart.value.length ? selectedDeliveryZone.value?.fee ?? 0 : 0,
);
const total = computed(() => subtotal.value + deliveryFee.value);
const formatPrice = (value: number) => `$${value.toFixed(2)}`;
function productImage(url: string, width: number, height: number) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const lowerUrl = url.toLowerCase();
  const hasBlackBg = lowerUrl.includes("rp105") || lowerUrl.includes("rp110") || lowerUrl.includes("rp115") || lowerUrl.includes("rp120") || lowerUrl.includes("rp125") ||
                     lowerUrl.includes("rp015") || lowerUrl.includes("rp030") || lowerUrl.includes("rp020") || lowerUrl.includes("rp025") ||
                     lowerUrl.includes("/021") || lowerUrl.includes("/024") || lowerUrl.includes("/101") || lowerUrl.includes("/106") || lowerUrl.includes("/108") ||
                     lowerUrl.includes("/071") || lowerUrl.includes("/105") || lowerUrl.includes("/115") || lowerUrl.includes("/158");
  const effect = hasBlackBg ? ",e_make_transparent" : "";
  return url.replace("/upload/", `/upload/c_pad,b_auto${effect},f_auto,q_auto,w_${width},h_${height}/`);
}
const categories = ["Todos", "Preservados", "Naturales"];
const homeProducts = computed(() => products.value.slice(0, 5));
const displayedProducts = computed(() => showFullCatalog.value ? activeCategory.value === "Todos" ? products.value : products.value.filter((product) => product.categories?.includes(activeCategory.value)) : homeProducts.value);

function markImageLoaded(src: string) {
  loadedImages.value = new Set(loadedImages.value).add(src);
}
const offerRemaining = computed(() => Math.max(0, new Date(offer.value?.expiresAt || 0).getTime() - now.value));
const isOfferActive = computed(() => Boolean(offer.value?.active && offerRemaining.value > 0));
const checkoutWhatsApp = computed(() => {
  const items = cart.value.map((item) => `- ${item.quantity} x ${item.name}`).join("\n");
  const message = [
    "Hola, equipo Bruval. Estoy preparando una compra y me gustaría que me acompañen.",
    "",
    "Quisiera confirmar que todo está bien antes de pagar y recibir apoyo para coordinar una entrega especial.",
    "",
    `Mi selección:\n${items || "Aún estoy eligiendo mis flores."}`,
    cart.value.length ? `Total estimado: ${formatPrice(total.value)}` : "",
    checkout.value.firstName ? `Mi nombre: ${checkout.value.firstName} ${checkout.value.lastName}`.trim() : "",
    checkout.value.date ? `Entrega deseada: ${checkout.value.date}, ${checkout.value.timeSlot}` : "",
    "",
    "Gracias por ayudarme a que este gesto llegue de la mejor manera.",
  ].filter(Boolean).join("\n");
  return `https://wa.me/593999480437?text=${encodeURIComponent(message)}`;
});
const countdown = computed(() => {
  const totalSeconds = Math.floor(offerRemaining.value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, "0")).join(":");
});
const deliverySlots = ["09:00 - 12:00", "12:00 - 15:00", "15:00 - 18:00"];

function guayaquilDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

const minimumDeliveryDate = computed(() => guayaquilDate(new Date(now.value + 2 * 60 * 60 * 1000)));
const availableDeliverySlots = computed(() => {
  if (!checkout.value.date) return [];
  const earliest = new Date(now.value + 2 * 60 * 60 * 1000);
  return deliverySlots.filter((slot) => {
    const start = slot.slice(0, 5);
    return new Date(`${checkout.value.date}T${start}:00-05:00`) >= earliest;
  });
});

async function refreshCatalog() {
  const { data } = await storeApi.products(offerId, 1, 5);
  products.value = data.products;
  offer.value = data.offer;
  catalogPage.value = 1;
  hasMore.value = data.pagination?.hasMore ?? false;
  catalogTotal.value = data.pagination?.total ?? 0;
  cart.value = cart.value.map((item) => {
    const product = data.products.find((entry) => entry._id === item._id);
    return product ? { ...product, quantity: item.quantity } : item;
  });
}

async function loadMore() {
  if (isLoadingMore.value || !hasMore.value || !showFullCatalog.value) return;
  isLoadingMore.value = true;
  try {
    const nextPage = catalogPage.value + 1;
    const category = activeCategory.value !== "Todos" ? activeCategory.value : undefined;
    const sort = activeSort.value;
    const search = searchQuery.value.trim() || undefined;
    const { data } = await storeApi.products(offerId, nextPage, 5, category, sort, search);
    const currentIds = new Set(products.value.map((product) => product._id));
    products.value = [...products.value, ...data.products.filter((product) => !currentIds.has(product._id))];
    catalogPage.value = nextPage;
    hasMore.value = data.pagination?.hasMore ?? false;
  } finally {
    isLoadingMore.value = false;
  }
}

function addToCart(product: Product) {
  const current = cart.value.find((item) => item._id === product._id);
  if (current) current.quantity += 1;
  else cart.value.push({ ...product, quantity: 1 });
  selected.value = null;
  isCartOpen.value = true;

  // Track AddToCart in Meta Pixel
  if (typeof (window as any).fbq === "function") {
    (window as any).fbq("track", "AddToCart", {
      content_name: product.name,
      content_ids: [product.sku],
      content_type: "product",
      value: product.price,
      currency: "USD",
    });
  }
}

function changeQuantity(id: string, amount: number) {
  const item = cart.value.find((entry) => entry._id === id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity < 1)
    cart.value = cart.value.filter((entry) => entry._id !== id);
}

function openCheckout() {
  isCartOpen.value = false;
  isCheckoutOpen.value = true;
  checkoutStep.value = "details";
  errorMessage.value = "";

  // Track InitiateCheckout in Meta Pixel
  if (typeof (window as any).fbq === "function") {
    const contents = cart.value.map((item) => ({
      id: item.sku,
      quantity: item.quantity,
      item_price: item.price,
    }));
    (window as any).fbq("track", "InitiateCheckout", {
      contents,
      content_type: "product",
      value: total.value,
      currency: "USD",
    });
  }
}

function openCheckoutWhatsApp() {
  openCheckout();
  isCheckoutWhatsAppOpen.value = true;
}

function trackWhatsAppCheckout() {
  isCheckoutWhatsAppConfirmationOpen.value = false;
  if (typeof (window as any).fbq === "function") {
    (window as any).fbq("track", "Lead", {
      content_name: "WhatsApp Checkout",
      value: total.value,
      currency: "USD",
    });
  }
}

async function beginPayment() {
  if (!selectedDeliveryZone.value) {
    errorMessage.value = "Selecciona una zona de entrega para continuar.";
    return;
  }
  isSubmitting.value = true;
  errorMessage.value = "";
  try {
    const payload: CheckoutPayload = {
      offerId,
      items: cart.value.map((item) => ({
        productId: item._id,
        quantity: item.quantity,
      })),
      customer: {
        name: `${checkout.value.firstName} ${checkout.value.lastName}`.trim(),
        email: checkout.value.email,
        phone: `${phonePrefix.value}${checkout.value.phone}`,
        phoneConfirmed: checkout.value.phoneConfirmed,
      },
      delivery: {
        recipient: checkout.value.recipient,
        address: checkout.value.address,
        mapUrl: checkout.value.mapUrl,
        zone: checkout.value.zone,
        date: checkout.value.date,
        timeSlot: checkout.value.timeSlot,
        messageCard: checkout.value.messageCard,
      },
    };
    const { data } = await storeApi.createOrder(payload);
    orderNumber.value = data.orderNumber;
    payment.value = data.payphone;
    checkoutStep.value = "payment";
    await nextTick();
    await renderPayphone();
  } catch (error: any) {
    errorMessage.value =
      error.message || "No pudimos preparar tu pago. Inténtalo nuevamente.";
  } finally {
    isSubmitting.value = false;
  }
}

function confirmDeliveryDetails() {
  if (!selectedDeliveryZone.value) {
    errorMessage.value = "Selecciona una zona de entrega para continuar.";
    return;
  }
  deliveryDetailsConfirmed.value = false;
  isDeliveryZoneWarningOpen.value = true;
}

function loadPayphoneStyles() {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLLinkElement>("link[data-payphone-styles]");
    if (existing?.sheet) return resolve();
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudieron cargar los estilos de Payphone")), { once: true });
      return;
    }
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.css";
    stylesheet.dataset.payphoneStyles = "true";
    stylesheet.onload = () => resolve();
    stylesheet.onerror = () => reject(new Error("No se pudieron cargar los estilos de Payphone"));
    document.head.appendChild(stylesheet);
  });
}

function loadPayphoneScript() {
  if ((window as any).PPaymentButtonBox) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector("script[data-payphone]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.js";
    script.dataset.payphone = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Payphone"));
    document.head.appendChild(script);
  });
}

async function renderPayphone() {
  try {
    await Promise.all([loadPayphoneStyles(), loadPayphoneScript()]);
    const target = document.getElementById("payphone-button");
    if (!target || !payment.value.token || !payment.value.storeId)
      throw new Error("Payphone no está configurado");
    target.innerHTML = "";
    new (window as any).PPaymentButtonBox({
      token: payment.value.token,
      storeId: payment.value.storeId,
      clientTransactionId: orderNumber.value,
      responseUrl: `${window.location.origin}/pay-response`,
      amount: Math.round(total.value * 100),
      amountWithoutTax: Math.round(total.value * 100),
      currency: "USD",
      reference: `Flores Bruval ${orderNumber.value}`,
      lang: "es",
      defaultMethod: "card",
      timeZone: -5,
      phoneNumber: checkout.value.phone,
      email: checkout.value.email,
    }).render("payphone-button");
  } catch (error: any) {
    errorMessage.value = error.message || "No pudimos cargar el pago seguro.";
  }
}

let observer: IntersectionObserver | null = null;

function setupObserver() {
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) void loadMore();
  }, { rootMargin: "300px" });
}

onMounted(async () => {
  try {
    await refreshCatalog();
  } catch {
    errorMessage.value =
      "No pudimos cargar los arreglos. Revisa que la API esté disponible.";
  } finally {
    isLoading.value = false;
  }
  setupObserver();
  countdownTimer = setInterval(() => (now.value = Date.now()), 1000);
});

watch(sentinel, (el) => {
  if (el) {
    if (!observer) setupObserver();
    observer?.observe(el);
  }
});

onUnmounted(() => {
  clearInterval(countdownTimer);
  observer?.disconnect();
});

watch(cart, (value) => localStorage.setItem("bruval-cart", JSON.stringify(value)), { deep: true });
watch(checkout, (value) => localStorage.setItem("bruval-checkout", JSON.stringify(value)), { deep: true });
watch(phonePrefix, (value) => localStorage.setItem("bruval-phone-prefix", JSON.stringify(value)));
watch(isOfferActive, (active, previous) => {
  if (!active && previous) void refreshCatalog();
});
watch(availableDeliverySlots, (slots) => {
  if (!slots.includes(checkout.value.timeSlot)) checkout.value.timeSlot = slots[0] || "";
});
watch(selected, (product) => {
  if (product) {
    if (typeof (window as any).fbq === "function") {
      (window as any).fbq("track", "ViewContent", {
        content_name: product.name,
        content_ids: [product.sku],
        content_type: "product",
        value: product.price,
        currency: "USD",
      });
    }
  }
});
async function refreshFilteredProducts() {
  isLoadingMore.value = true;
  try {
    const category = activeCategory.value !== "Todos" ? activeCategory.value : undefined;
    const sort = activeSort.value;
    const search = searchQuery.value.trim() || undefined;
    const { data } = await storeApi.products(offerId, 1, 5, category, sort, search);
    products.value = data.products;
    catalogPage.value = 1;
    hasMore.value = data.pagination?.hasMore ?? false;
    catalogTotal.value = data.pagination?.total ?? 0;
  } catch (err: any) {
    console.error("Error refreshing products:", err);
  } finally {
    isLoadingMore.value = false;
  }
}

watch(activeCategory, async () => {
  if (!showFullCatalog.value) return;
  await refreshFilteredProducts();
});

watch(activeSort, async () => {
  if (!showFullCatalog.value) {
    showFullCatalog.value = true;
  } else {
    await refreshFilteredProducts();
  }
});

let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
watch(searchQuery, () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(async () => {
    if (searchQuery.value.trim() && !showFullCatalog.value) {
      showFullCatalog.value = true;
    }
    if (showFullCatalog.value) {
      await refreshFilteredProducts();
    }
  }, 300);
});

watch(showFullCatalog, async (val) => {
  if (val) {
    await refreshFilteredProducts();
  }
});
</script>

<template>
  <main class="storefront">
    <header class="site-header">
      <nav class="nav" aria-label="Navegación principal">
        <a class="brand" href="#inicio" aria-label="Bruval, inicio"><img src="/logo-bruval.png" alt="Bruval" /></a>
        <a class="nav-link" href="#coleccion">Colección</a>
        <a class="nav-link" href="/pedido">¿Ya tienes un pedido?</a>
        <p class="nav-note">Flores para sentir cerca</p>
        <button class="cart-trigger" type="button" @click="isCartOpen = true">
          <span>Carrito</span>
          <strong v-if="cartCount">{{ formatPrice(total) }}</strong>
          <b>{{ cartCount }}</b>
        </button>
      </nav>
    </header>
    <section class="hero">
      <div v-if="isOfferActive" class="offer-banner">
        <span>Enlace privado · precios especiales</span>
        <strong>Termina en {{ countdown }}</strong>
        <a href="#coleccion">Comprar ahora <b>→</b></a>
      </div>
      <div id="inicio" class="hero-copy">
        <p class="eyebrow">Floristería contemporánea · Guayaquil</p>
        <h1>Un gesto<br /><i>vivo.</i></h1>
        <p class="hero-text">
          Diseñamos flores con intención, para los días que merecen quedar en la
          memoria.
        </p>
        <a href="#coleccion" class="text-link">{{ isOfferActive ? "Comprar antes que termine" : "Ver colección" }} <span>↓</span></a>
      </div>
      <div class="hero-image image-loading" :class="{ 'image-ready': loadedImages.has('hero') }">
        <img
          src="https://i0.wp.com/bruval.com.ec/home/wp-content/uploads/2026/01/BOUQUET-140.webp?resize=900%2C1100&ssl=1"
          alt="Bouquet floral Bruval"
          @load="markImageLoaded('hero')"
        />
        <p>Hecho para tu momento</p>
      </div>
    </section>

    <section id="coleccion" class="collection">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Preservadas para siempre</p>
          <h2>Detalles que<br />perduran.</h2>
        </div>
        <p>
          Nuestros arreglos preservados para celebrar, agradecer y acompañar los
          momentos que importan.
        </p>
      </div>
      <p v-if="errorMessage && !isCheckoutOpen" class="error">
        {{ errorMessage }}
      </p>
      <div class="catalog-search">
        <div class="search-wrapper">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Buscar por nombre, código o colección..."
            class="search-input"
            aria-label="Buscar productos"
          />
          <button v-if="searchQuery" type="button" class="clear-search" @click="searchQuery = ''">×</button>
        </div>
      </div>
      <div class="featured-label">
        <button
          v-for="sortOption in [{ id: 'quality', label: 'Ordenados por calidad' }, { id: 'featured', label: 'Primero los destacados' }, { id: 'seasonal', label: 'De la temporada' }]"
          :key="sortOption.id"
          type="button"
          :class="{ active: activeSort === sortOption.id }"
          @click="activeSort = sortOption.id"
        >
          {{ sortOption.label }}
        </button>
      </div>
      <div class="product-list">
        <template v-if="isLoading"
          ><article
            v-for="index in 10"
            :key="index"
            class="product-card skeleton"
          >
            <div class="product-image"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div></article
        ></template>
        <article
          v-for="product in displayedProducts"
          :key="product._id"
          class="product-card"
        >
          <button
            class="product-image image-loading"
            :class="{ 'image-ready': loadedImages.has(product.image) }"
            type="button"
            @click="selected = product"
          >
            <img :src="productImage(product.image, 720, 780)" :alt="product.name" @load="markImageLoaded(product.image)" /><span>{{ product.dimensions }}</span>
            <small class="product-reference">Imagen referencial</small>
            <b v-if="product.webExclusive" class="web-exclusive">Web exclusivo · {{ product.discountPercentage }}% OFF</b>
          </button>
          <div class="product-info">
            <div>
              <h3>{{ product.name }}</h3>
              <p>{{ product.sku }} · {{ product.dimensions }}</p>
              <p>{{ product.description }}</p>
            </div>
            <div class="product-bottom">
              <div class="product-price">
                <del v-if="product.regularPrice">{{ formatPrice(product.regularPrice) }}</del>
                <strong>{{ formatPrice(product.price) }}</strong>
              </div>
              <button class="product-purchase" type="button" @click="addToCart(product)">
                Comprar ahora <span>→</span>
              </button>
            </div>
          </div>
        </article>
        <div ref="sentinel" v-if="showFullCatalog && hasMore" class="catalog-sentinel">
          <span v-if="isLoadingMore">Cargando más arreglos...</span>
        </div>
      </div>
      <div class="catalog-toggle">
        <button v-if="!showFullCatalog" type="button" @click="showFullCatalog = true">Ver todos los productos <span>↓</span></button>
        <template v-else>
          <div class="category-filters" aria-label="Filtrar por categoría">
            <button v-for="category in categories" :key="category" type="button" :class="{ active: activeCategory === category }" @click="activeCategory = category">{{ category }}</button>
          </div>
          <button type="button" @click="showFullCatalog = false; activeCategory = 'Todos'">Ver selección preservada <span>↑</span></button>
        </template>
      </div>
    </section>

    <section class="manifesto">
      <p class="eyebrow">Bruval, con amor</p>
      <p class="manifesto-copy">
        “No enviamos solamente flores. Enviamos el pequeño segundo en el que
        alguien se siente profundamente pensado.”
      </p>
      <div><span>Fresco</span><span>Local</span><span>Intencional</span></div>
    </section>
    <footer>
      <a class="brand" href="#inicio" aria-label="Bruval, inicio"><img src="/logo-bruval.png" alt="Bruval" /></a>
      <p>Guayaquil, Ecuador · Todos los días</p>
      <p>© 2026 Bruval Flores</p>
    </footer>
    <footer class="footer-credits">
      <p>
        Hecho por
        <a href="https://instagram.com/yeyo.dev?igsh=MTlqM2lmNGRoN3RnMw==" target="_blank" rel="noopener noreferrer">yeyo</a>
        y
        <a href="https://www.instagram.com/heyitsandres_dev?igsh=MXhnMGpxd2w4NGxxag%3D%3D" target="_blank" rel="noopener noreferrer">Kankox</a>
      </p>
    </footer>

    <Transition name="fade"
      ><div
        v-if="isCartOpen || selected || isCheckoutOpen || isCheckoutWhatsAppOpen || isCheckoutWhatsAppConfirmationOpen || isDeliveryZoneWarningOpen"
        class="backdrop"
        @click.self="
           isCartOpen = false;
           selected = null;
           isCheckoutOpen = false;
            isCheckoutWhatsAppOpen = false;
            isCheckoutWhatsAppConfirmationOpen = false;
            isDeliveryZoneWarningOpen = false;
        "
      ></div
    ></Transition>
    <Transition name="drawer"
      ><aside v-if="isCartOpen" class="cart-panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Tu selección</p>
            <h2>Carrito</h2>
          </div>
          <button type="button" @click="isCartOpen = false">×</button>
        </div>
        <div v-if="cart.length" class="cart-items">
          <div v-for="item in cart" :key="item._id" class="cart-item">
            <img :src="productImage(item.image, 160, 160)" :alt="item.name" />
            <div>
              <h3>{{ item.name }}</h3>
              <p>{{ formatPrice(item.price) }}</p>
              <div class="quantity">
                <button type="button" @click="changeQuantity(item._id, -1)">
                  −</button
                ><span>{{ item.quantity }}</span
                ><button type="button" @click="changeQuantity(item._id, 1)">
                  +
                </button>
              </div>
            </div>
            <strong>{{ formatPrice(item.price * item.quantity) }}</strong>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>Tu carrito está esperando algo bonito.</p>
          <button type="button" class="text-link" @click="isCartOpen = false">
            Explorar flores
          </button>
        </div>
        <div v-if="cart.length" class="cart-total">
          <div>
            <span>Subtotal</span><strong>{{ formatPrice(subtotal) }}</strong>
          </div>
          <div>
            <span>Entrega</span><strong>{{ selectedDeliveryZone ? formatPrice(deliveryFee) : "Selecciona tu zona" }}</strong>
          </div>
          <div class="grand-total">
            <span>Total</span><strong>{{ selectedDeliveryZone ? formatPrice(total) : "Selecciona tu zona" }}</strong>
          </div>
          <button class="primary-button" type="button" @click="openCheckout">
            Continuar al checkout <span>→</span>
          </button>
          <button class="whatsapp-button" type="button" @click="openCheckoutWhatsApp">
            Terminar compra por WhatsApp ↗
          </button>
        </div>
      </aside></Transition
    >

    <Transition name="modal"
      ><section v-if="selected" class="modal product-modal">
        <button class="close" type="button" @click="selected = null">×</button
        ><div class="product-modal-image image-loading" :class="{ 'image-ready': loadedImages.has(selected.image) }">
          <img :src="productImage(selected.image, 900, 1100)" :alt="selected.name" @load="markImageLoaded(selected.image)" />
        </div>
        <div class="product-modal-content">
          <div class="product-modal-body">
            <p class="eyebrow">{{ selected.palette }}</p>
            <p v-if="selected.webExclusive" class="web-exclusive modal-exclusive">Oferta exclusiva web · {{ selected.discountPercentage }}% OFF</p>
            <h2>{{ selected.name }}</h2>
            <dl class="product-specs">
              <div>
                <dt>Medidas</dt>
                <dd>{{ selected.dimensions }}</dd>
              </div>
              <div>
                <dt>Colección</dt>
                <dd>{{ selected.collection }}</dd>
              </div>
              <div>
                <dt>Código</dt>
                <dd>{{ selected.sku }}</dd>
              </div>
            </dl>
            <p>{{ selected.description }}</p>
            <p class="image-reference-note modal-reference">Imagen referencial. La composición puede variar según la disponibilidad de flores.</p>
          </div>
          <div class="product-modal-footer">
            <div class="product-modal-price-row">
              <span>Precio online</span>
              <strong>{{ formatPrice(selected.price) }}</strong>
            </div>
            <button
              class="primary-button"
              type="button"
              @click="addToCart(selected)"
            >
              Comprar ahora <span>→</span>
            </button>
          </div>
        </div>
      </section></Transition
    >

    <Transition name="modal"
      ><section v-if="isCheckoutOpen" class="modal checkout-modal">
        <button class="close" type="button" @click="isCheckoutOpen = false">
          ×
        </button>
        <div class="checkout-intro">
          <p class="eyebrow">Checkout seguro</p>
          <h2>
            {{
              checkoutStep === "details"
                ? "Casi en sus manos."
                : "Un último paso."
            }}
          </h2>
          <p>
            {{
              checkoutStep === "details"
                ? "Estaremos contigo en cada paso. Cuéntanos dónde y cuándo debe llegar este gesto. Al finalizar tu compra verás un botón de WhatsApp para hablar con nuestro equipo cuando lo necesites."
                : "Completa tu pago seguro con PayPhone. Tu selección está reservada."
            }}
          </p>
          <button v-if="checkoutStep === 'details'" class="checkout-whatsapp" type="button" @click="isCheckoutWhatsAppOpen = true">Terminar compra por WhatsApp ↗</button>
          <div class="checkout-total">
            <span>Total</span><strong>{{ formatPrice(total) }}</strong>
          </div>
        </div>
        <form
          v-if="checkoutStep === 'details'"
          class="checkout-form"
          @submit.prevent="confirmDeliveryDetails"
        >
          <label
            >Nombre<input
              v-model.trim="checkout.firstName"
              required
              autocomplete="given-name"
              placeholder="Diego" /></label
          ><label
            >Apellido<input
              v-model.trim="checkout.lastName"
              required
              autocomplete="family-name"
              placeholder="Reyes" /></label
          ><label class="full"
            >Correo para confirmaciones<input
              v-model.trim="checkout.email"
              required
              type="email"
              autocomplete="email"
              placeholder="tu@correo.com" /></label
          ><label class="full"
            >Teléfono
            <div class="phone-field">
              <select v-model="phonePrefix" aria-label="Código de país">
                <option value="+593">🇪🇨 +593</option>
                <option value="+57">🇨🇴 +57</option>
                <option value="+51">🇵🇪 +51</option>
              </select>
              <input
                v-model.trim="checkout.phone"
                required
                type="tel"
                inputmode="tel"
                autocomplete="tel-national"
                placeholder="999 999 999"
              />
            </div>
            <span class="phone-confirmation">
              <input v-model="checkout.phoneConfirmed" required type="checkbox" />
              Confirmo que este es mi número y autorizo que un asesor de Bruval me contacte para coordinar mi pedido.
            </span></label
          ><label class="full"
            >Nombre de quien recibe<input
              v-model.trim="checkout.recipient"
              required /></label
          ><label class="full"
            >Dirección de entrega<textarea
              v-model.trim="checkout.address"
              required
              rows="2"
            ></textarea></label
          ><label class="full"
            >Link de Google Maps<input
              v-model.trim="checkout.mapUrl"
              required
              type="url"
              placeholder="https://maps.google.com/..." /></label
          ><fieldset class="delivery-zone full">
            <legend>Zona de entrega</legend>
            <p>¿A dónde llevamos tus flores? Selecciona tu sector para calcular el envío.</p>
            <div class="delivery-zone-options" role="radiogroup" aria-label="Zona de entrega">
              <label v-for="zone in deliveryZones" :key="zone.name" :class="{ selected: checkout.zone === zone.name }">
                <input v-model="checkout.zone" required type="radio" name="delivery-zone" :value="zone.name" />
                <span>{{ zone.name }}</span><strong>{{ formatPrice(zone.fee) }}</strong>
              </label>
            </div>
          </fieldset
          ><label class="delivery-date"
            >Fecha de entrega
            <span>Disponible con mínimo 2 horas de anticipación</span><input
              v-model="checkout.date"
              required
              type="date"
              :min="minimumDeliveryDate" /></label
          ><label
            >Franja horaria<select v-model="checkout.timeSlot" required :disabled="!checkout.date || !availableDeliverySlots.length">
              <option v-if="!checkout.date" value="">Selecciona una fecha</option>
              <option v-else-if="!availableDeliverySlots.length" value="">No hay horarios disponibles</option>
              <option v-for="slot in availableDeliverySlots" :key="slot" :value="slot">{{ slot }}</option>
            </select></label
          ><label class="full"
            >Tarjeta de memoria<textarea
              v-model.trim="checkout.messageCard"
              required
              rows="3"
              placeholder="Escribe el mensaje que acompañará las flores..."
            ></textarea>
          </label>
          <p v-if="errorMessage" class="error full">{{ errorMessage }}</p>
          <button
            class="primary-button full"
            :disabled="isSubmitting || !selectedDeliveryZone"
            type="submit"
          >
            {{ isSubmitting ? "Preparando pago..." : "Ir al pago seguro" }}
            <span>→</span>
          </button>
        </form>
        <div v-else class="payment-step">
          <div id="payphone-button" class="payphone-loading">
            <span></span>
            <p>Cargando pago seguro...</p>
          </div>
          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
          <button
            type="button"
            class="text-link"
            @click="checkoutStep = 'details'"
          >
            ← Editar información
          </button>
        </div>
      </section></Transition
    >
    <Transition name="modal">
      <aside v-if="isCheckoutWhatsAppOpen" class="modal checkout-whatsapp-modal" role="dialog" aria-modal="true" aria-labelledby="whatsapp-checkout-title">
        <button class="close" type="button" aria-label="Cerrar" @click="isCheckoutWhatsAppOpen = false">×</button>
        <p class="eyebrow">Compra por WhatsApp</p>
        <h2 id="whatsapp-checkout-title">Estamos contigo<br>en cada paso.</h2>
        <p class="priority-warning">Importante: al continuar por WhatsApp, tu pedido no queda confirmado ni reservado. La compra y el pago por esta web tienen prioridad máxima y confirman tu selección al instante.</p>
        <p>Por WhatsApp, un asesor te ayudará según disponibilidad.</p>
        <p>Enviaremos un resumen de tu selección y entrega para atenderte sin pedirte los datos otra vez. Por favor, no modifiques el primer mensaje.</p>
        <p class="whatsapp-note">No incluye códigos ni descuentos promocionales.</p>
        <button type="button" @click="isCheckoutWhatsAppOpen = false; isCheckoutWhatsAppConfirmationOpen = true">Entiendo: WhatsApp no reserva mi pedido →</button>
      </aside>
    </Transition>
    <Transition name="modal">
      <aside v-if="isCheckoutWhatsAppConfirmationOpen" class="modal checkout-whatsapp-modal checkout-whatsapp-confirmation" role="dialog" aria-modal="true" aria-labelledby="whatsapp-confirmation-title">
        <button class="close" type="button" aria-label="Cerrar" @click="isCheckoutWhatsAppConfirmationOpen = false">×</button>
        <p class="eyebrow">Confirmación final</p>
        <h2 id="whatsapp-confirmation-title">¿Estás seguro?</h2>
        <p>Al continuar por WhatsApp, tu pedido seguirá sujeto a disponibilidad y no tendrá la confirmación ni la reserva inmediata del pago por web.</p>
        <div class="whatsapp-confirmation-actions">
          <button type="button" @click="isCheckoutWhatsAppConfirmationOpen = false">Volver al pago web</button>
          <a :href="checkoutWhatsApp" target="_blank" rel="noopener" @click="trackWhatsAppCheckout">Sí, continuar por WhatsApp →</a>
        </div>
      </aside>
    </Transition>
    <Transition name="modal">
      <aside v-if="isDeliveryZoneWarningOpen" class="modal delivery-warning-modal" role="dialog" aria-modal="true" aria-labelledby="delivery-warning-title">
        <button class="close" type="button" aria-label="Cerrar" @click="isDeliveryZoneWarningOpen = false">×</button>
        <p class="eyebrow">Confirma tu entrega</p>
        <h2 id="delivery-warning-title">Revisa la zona y la dirección.</h2>
        <p>Antes de pagar, confirma la zona, dirección y medidas de los arreglos de tu selección.</p>
        <div class="delivery-confirmation-summary">
          <p><strong>Zona:</strong> {{ checkout.zone }}</p>
          <p><strong>Dirección:</strong> {{ checkout.address }}</p>
          <div>
            <strong>Medidas de tu selección</strong>
            <ul>
              <li v-for="item in cart" :key="item._id"><span>{{ item.name }}</span><b>{{ item.dimensions }}</b></li>
            </ul>
          </div>
        </div>
        <p class="delivery-warning-notice">Si seleccionas una zona incorrecta para acceder a una tarifa menor, Bruval no asegura reembolso ni cobertura de la diferencia de envío.</p>
        <label class="delivery-confirmation-check" :class="{ checked: deliveryDetailsConfirmed }">
          <input v-model="deliveryDetailsConfirmed" type="checkbox" />
          <span><strong>Estoy de acuerdo con la dirección, zona y medidas indicadas.</strong><small>Confirmo estos datos para evitar malentendidos en la preparación y entrega.</small></span>
        </label>
        <div class="delivery-warning-actions">
          <button class="delivery-warning-back" type="button" @click="isDeliveryZoneWarningOpen = false">Revisar mis datos</button>
          <button class="primary-button" :disabled="!deliveryDetailsConfirmed" type="button" @click="isDeliveryZoneWarningOpen = false; beginPayment()">Confirmo y continúo al pago <span>→</span></button>
        </div>
      </aside>
    </Transition>
  </main>
</template>

<style lang="scss" scoped>
.storefront {
  color: $primary-dark;
  background: $white;
}
button {
  font: inherit;
  cursor: pointer;
}
.hero {
  min-height: 100vh;
  padding: 24px 4vw 46px;
  position: relative;
  display: flex;
  flex-direction: column;
  background: $primary-light;
}
.site-header {
  position: sticky;
  top: 0;
  z-index: 7;
  padding: 15px 4vw;
  background: rgba($white, 0.92);
  border-bottom: 1px solid rgba($primary, 0.1);
  backdrop-filter: blur(14px);
}
.nav,
footer,
.section-heading,
.product-bottom,
.panel-head,
.cart-item,
.cart-total > div,
.checkout-total {
  display: flex;
  align-items: center;
}
.nav {
  justify-content: space-between;
  gap: 20px;
}
.nav-link {
  color: $text-secondary;
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}
.offer-banner {
  z-index: 2;
  align-self: center;
  margin-top: 22px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  gap: 18px;
  color: $white;
  background: $primary-dark;
  font: 600 10px $font-principal;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}
.offer-banner strong {
  color: $primary-light;
  font-family: "DM Mono", monospace;
}
.offer-banner a {
  color: inherit;
  text-decoration: none;
}
.offer-banner b {
  margin-left: 4px;
  color: $primary-light;
  font-size: 15px;
}
.brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.brand img {
  width: 142px;
  height: auto;
  display: block;
}
.nav-note,
.eyebrow,
footer,
.hero-image p {
  font: 500 10px/1.4 $font-principal;
  letter-spacing: 1.7px;
  text-transform: uppercase;
}
.nav-note {
  margin-left: auto;
  margin-right: 32px;
}
.cart-trigger {
  border: 0;
  padding: 9px 10px 9px 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: $white;
  background: $primary-dark;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.cart-trigger strong {
  color: $primary-light;
  font: 10px "DM Mono", monospace;
}
.cart-trigger b {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 2px;
  border-radius: 50%;
  background: $primary-light;
  color: $primary-dark;
  font-size: 10px;
}
.hero-copy {
  width: 52%;
  min-width: 520px;
  margin-top: auto;
  padding: 110px 0 32px 5vw;
  position: relative;
  z-index: 1;
}
.eyebrow {
  color: $primary;
  margin: 0 0 18px;
}
h1,
h2,
h3,
p {
  margin: 0;
}
h1,
h2 {
  font-family: $font-secondary;
  font-weight: 500;
  letter-spacing: -0.06em;
}
h1 {
  font-size: clamp(84px, 12.5vw, 182px);
  line-height: 0.75;
}
h1 i {
  padding-left: 13vw;
}
.hero-text {
  max-width: 300px;
  margin: 42px 0 23px;
  color: $text-secondary;
  line-height: 1.55;
}
.text-link {
  border: 0;
  background: none;
  padding: 0;
  color: inherit;
  text-decoration: none;
  font: 600 12px $font-principal;
  letter-spacing: 0.2px;
}
.text-link span {
  margin-left: 13px;
  color: $primary;
  font-size: 16px;
}
.hero-image {
  position: absolute;
  width: 40%;
  max-width: 580px;
  height: 76%;
  right: 5vw;
  top: 14%;
  overflow: hidden;
}
.hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.hero-image:hover img {
  transform: scale(1.04);
}
.image-loading::after {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: linear-gradient(105deg, #e8edf2 25%, #f7f9fb 45%, #e8edf2 65%);
  background-size: 220% 100%;
  animation: image-shimmer 1.4s ease-in-out infinite;
  content: "";
  pointer-events: none;
}
.image-loading img {
  opacity: 0;
  transition: opacity 0.38s ease;
}
.image-loading.image-ready::after {
  opacity: 0;
  transition: opacity 0.3s ease;
}
.image-loading.image-ready img {
  opacity: 1;
}
@keyframes image-shimmer {
  to {
    background-position: -120% 0;
  }
}
.hero-image p {
  position: absolute;
  right: 18px;
  bottom: 18px;
  margin: 0;
  padding: 7px 9px;
  background: $white;
}
.collection {
  padding: 150px 5vw 100px;
}
.section-heading {
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 70px;
}
.section-heading h2 {
  font-size: clamp(48px, 6vw, 80px);
  line-height: 0.88;
}
.section-heading > p {
  width: 290px;
  color: $text-secondary;
  line-height: 1.6;
}
.product-list {
  display: flex;
  flex-wrap: wrap;
  gap: 48px 2%;
}
.catalog-toggle { display:flex; flex-direction:column; align-items:center; gap:24px; margin-top:58px; } .catalog-toggle > button { border:1px solid $primary; padding:14px 18px; color:$primary; background:transparent; font:600 11px $font-principal; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; transition:.2s; } .catalog-toggle > button:hover { color:$white; background:$primary; } .category-filters { display:flex; max-width:100%; gap:8px; overflow-x:auto; padding-bottom:4px; } .category-filters button { flex:0 0 auto; border:1px solid #d5dde6; padding:9px 13px; color:$text-secondary; background:transparent; font:600 10px $font-principal; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; } .category-filters button.active { color:$white; border-color:$primary; background:$primary; } .catalog-search { margin-bottom: 20px; width: 100%; max-width: 480px; } .search-wrapper { position: relative; display: flex; align-items: center; } .search-input { width: 100%; padding: 12px 40px 12px 42px; border: 1px solid #d9c8c0; border-radius: 6px; font: 14px $font-principal; color: #211817; background: #fffdfb; transition: border-color 0.2s, box-shadow 0.2s; outline: none; &:focus { border-color: $primary; box-shadow: 0 0 0 3px rgba($primary, 0.1); } } .search-icon { position: absolute; left: 14px; width: 18px; height: 18px; color: #9c8c86; pointer-events: none; } .clear-search { position: absolute; right: 12px; background: none; border: 0; color: #9c8c86; font-size: 18px; font-weight: 500; cursor: pointer; padding: 4px; line-height: 1; &:hover { color: $primary; } } .featured-label { display:flex; gap:10px; margin-bottom:38px; flex-wrap:wrap; } .featured-label button { border:1px solid rgba($primary,.25); padding:8px 14px; color:$primary; background:rgba($primary,.04); font:600 10px $font-principal; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; border-radius:4px; transition:all 0.2s ease; } .featured-label button:hover { background:rgba($primary, 0.08); border-color:$primary; } .featured-label button.active { color:$white; background:$primary; border-color:$primary; box-shadow:0 2px 8px rgba($primary, 0.2); } .catalog-sentinel { width:100%; height:60px; display:flex; align-items:center; justify-content:center; color:$text-secondary; font-size:11px; letter-spacing:.06em; text-transform:uppercase; }
.product-card {
  width: calc(25% - 1.5%);
  min-width: 210px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.product-image {
  height: 390px;
  padding: 0;
  border: 0;
  background: #f1f4f7;
  position: relative;
  overflow: hidden;
}
.product-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.38s ease;
}
.product-image span {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 7px 9px;
  background: $white;
  font: 500 9px $font-principal;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.product-reference {
  position: absolute;
  left: 14px;
  bottom: 14px;
  padding: 6px 8px;
  color: $white;
  background: rgba($primary-dark, .82);
  font: 600 9px $font-principal;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.web-exclusive {
  position: absolute;
  z-index: 2;
  right: 12px;
  bottom: 12px;
  padding: 7px 9px;
  color: #ffffff !important;
  background: $primary !important;
  font: 600 9px $font-principal;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.modal-exclusive {
  position: static;
  margin: 18px 0 12px;
  display: inline-block;
}
.product-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.product-info h3 {
  font: 500 25px/1 $font-secondary;
}
.product-info p {
  min-height: 42px;
  color: $text-secondary;
  font-size: 12px;
  line-height: 1.45;
}
.product-bottom {
  justify-content: space-between;
}
.product-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.product-price del {
  color: #9c8c86;
  font: 10px "DM Mono", monospace;
}
.product-bottom strong {
  font:
    500 12px "DM Mono",
    monospace;
}
.product-bottom button {
  width: 29px;
  height: 29px;
  border: 1px solid #d0bdb4;
  border-radius: 50%;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  transition: 0.2s;
}
.product-bottom button:hover {
  color: #fffaf6;
  background: $primary-dark;
  border-color: $primary-dark;
}
.product-bottom .product-purchase {
  width: auto;
  height: auto;
  border-radius: 0;
  padding: 9px 12px;
  color: $white;
  border-color: $primary;
  background: $primary;
  font: 600 10px $font-principal;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.product-bottom .product-purchase:hover {
  color: $primary;
  background: transparent;
}
.skeleton .product-image,
.skeleton-line {
  animation: pulse 1.3s infinite alternate;
  background: #e8ddd7;
}
.skeleton-line {
  width: 75%;
  height: 15px;
}
.skeleton-line.short {
  width: 38%;
}
@keyframes pulse {
  to {
    opacity: 0.45;
  }
}
.manifesto {
  min-height: 550px;
  padding: 120px 12vw;
  color: #fffaf6;
  background: #2c3430;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.manifesto .eyebrow {
  color: #dca7a3;
}
.manifesto-copy {
  max-width: 860px;
  font: 500 clamp(38px, 5vw, 70px)/1.03 $font-secondary;
  letter-spacing: -0.05em;
}
.manifesto > div {
  display: flex;
  gap: 12px;
  margin-top: 48px;
}
.manifesto span {
  border: 1px solid rgba(255, 255, 255, 0.35);
  padding: 8px 12px;
  border-radius: 100px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
footer {
  justify-content: space-between;
  padding: 28px 5vw;
  color: #706663;
}
footer .brand {
  color: #211817;
}
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 8;
  background: rgba(33, 24, 23, 0.4);
  backdrop-filter: blur(4px);
}
.cart-panel {
  position: fixed;
  z-index: 9;
  inset: 0 0 0 auto;
  width: min(490px, 100vw);
  padding: 32px;
  background: #fffaf6;
  display: flex;
  flex-direction: column;
}
.panel-head {
  justify-content: space-between;
}
.panel-head h2 {
  font-size: 48px;
}
.panel-head > button,
.close {
  width: 38px;
  height: 38px;
  border: 0;
  background: #eee1da;
  border-radius: 50%;
  font-size: 26px;
  line-height: 1;
}
.cart-items {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 36px 0;
  overflow: auto;
}
.cart-item {
  align-items: flex-start;
  gap: 14px;
}
.cart-item img {
  width: 76px;
  height: 90px;
  object-fit: cover;
}
.cart-item > div {
  flex: 1;
}
.cart-item h3 {
  font: 500 21px $font-secondary;
}
.cart-item p {
  margin: 5px 0 12px;
  color: #706663;
  font:
    12px "DM Mono",
    monospace;
}
.cart-item > strong {
  font:
    12px "DM Mono",
    monospace;
}
.quantity {
  display: flex;
  align-items: center;
  gap: 10px;
}
.quantity button {
  width: 22px;
  height: 22px;
  border: 1px solid #d0bdb4;
  border-radius: 50%;
  background: transparent;
}
.quantity span {
  font-size: 12px;
}
.cart-total {
  margin-top: auto;
  padding-top: 22px;
  border-top: 1px solid #e1d4ce;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cart-total > div {
  justify-content: space-between;
  color: #706663;
  font-size: 13px;
}
.cart-total .grand-total {
  padding: 13px 0;
  color: #211817;
  font: 500 19px $font-secondary;
}
.primary-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: 0;
  padding: 16px 18px;
  color: $white;
  background: $primary;
  font: 600 12px $font-principal;
  transition:
    background 0.2s,
    transform 0.2s;
}
.primary-button:hover {
  background: $primary-dark;
  transform: translateY(-1px);
}
.primary-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.primary-button span {
  font-size: 20px;
  line-height: 0;
}
.whatsapp-button {
  width: 100%;
  border: 1px solid #427a55;
  padding: 14px 18px;
  color: #427a55;
  background: transparent;
  font: 600 12px $font-principal;
  cursor: pointer;
}
.whatsapp-button:hover {
  color: #fffaf6;
  background: #427a55;
}
.empty-state {
  margin: auto;
  text-align: center;
  color: $text-secondary;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.modal {
  position: fixed;
  z-index: 10;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  background: $white;
  box-shadow: 0 25px 80px rgba($primary-dark, 0.22);
}
.close {
  position: absolute;
  z-index: 2;
  top: 18px;
  right: 18px;
}
.product-modal {
  width: min(820px, 92vw);
  max-height: min(680px, calc(100dvh - 104px));
  display: grid;
  grid-template-columns: minmax(280px, 44%) minmax(0, 1fr);
  overflow: hidden;
}
.product-modal-image {
  width: auto;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.product-modal-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #f1f4f7;
}
.product-modal-content {
  min-width: 0;
  padding: 52px 46px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
}
.product-modal h2,
.checkout-modal h2 {
  font-size: 52px;
  line-height: 0.92;
}
.product-specs {
  width: 100%;
  margin: 30px 0 0;
  border-top: 1px solid #e4d9d3;
  border-bottom: 1px solid #e4d9d3;
  display: grid;
  grid-template-columns: 1.3fr 1fr;
}
.product-specs div {
  padding: 14px 0;
}
.product-specs div:first-child {
  grid-row: span 2;
  padding-right: 18px;
  border-right: 1px solid #e4d9d3;
}
.product-specs div:nth-child(2),
.product-specs div:nth-child(3) {
  padding-left: 18px;
}
.product-specs div:nth-child(2) {
  border-bottom: 1px solid #e4d9d3;
}
.product-specs dt {
  margin-bottom: 5px;
  color: #634843;
  font: 600 10px $font-principal;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.product-specs dd {
  margin: 0;
  color: #201817;
  font: 600 14px $font-principal;
  line-height: 1.25;
}
.product-specs div:first-child dd {
  color: #a9473f;
  font: 600 24px "DM Mono", monospace;
  letter-spacing: -0.06em;
}
.product-modal-content > p:not(.eyebrow) {
  margin: 28px 0;
  color: #483f3d;
  line-height: 1.6;
}
.product-modal-content > p.modal-reference {
  margin: -12px 0 24px;
  padding-left: 10px;
  border-left: 2px solid rgba($primary, .45);
  color: $text-secondary;
  font-size: 12px;
}
.product-modal-body {
  flex: 1;
  overflow-y: auto;
  padding-right: 12px;
  margin-bottom: 24px;
}
.product-modal-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid #e4d9d3;
}
.product-modal-price-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.product-modal-price-row span {
  font: 500 10px $font-principal;
  color: #634843;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.product-modal-price-row strong {
  margin-bottom: 0;
  font: 600 24px "DM Mono", monospace;
  color: #a9473f;
}
.checkout-modal {
  width: min(860px, 94vw);
  height: min(720px, calc(100dvh - 104px));
  box-sizing: border-box;
  overflow: hidden;
  padding: 58px;
  display: flex;
  align-items: stretch;
  gap: 56px;
}
.checkout-intro {
  flex: 0 0 33%;
  width: 33%;
  overflow: hidden;
}
.checkout-intro > p:not(.eyebrow) {
  margin: 22px 0;
  color: #706663;
  line-height: 1.6;
  font-size: 14px;
}
.checkout-whatsapp {
  display: inline-block;
  border: 0;
  padding: 0;
  margin-bottom: 22px;
  color: #427a55;
  background: transparent;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.checkout-whatsapp-modal {
  z-index: 12;
  width: min(440px, 90vw);
  box-sizing: border-box;
  padding: 54px 38px 38px;
}
.checkout-whatsapp-modal h2 {
  margin: 16px 0 24px;
  font-size: 42px;
  line-height: 0.92;
}
.checkout-whatsapp-modal > p:not(.eyebrow) {
  color: #706663;
  font-size: 14px;
  line-height: 1.6;
}
.delivery-warning-modal {
  width: min(500px, 92vw);
  max-height: min(570px, calc(100dvh - 96px));
  padding: 48px 38px 36px;
  overflow-y: auto;
}
.delivery-warning-modal h2 {
  margin: 14px 0 20px;
  font-size: clamp(32px, 5vw, 44px);
  line-height: .98;
}
.delivery-warning-modal > p:not(.eyebrow) {
  color: $text-secondary;
  font-size: 14px;
  line-height: 1.6;
}
.delivery-confirmation-summary {
  margin: 18px 0;
  padding: 14px;
  border: 1px solid #d5dde6;
  background: #f8fafc;
  color: $primary-dark;
  font-size: 12px;
  line-height: 1.45;
}
.delivery-confirmation-summary > p {
  margin: 0 0 7px;
}
.delivery-confirmation-summary > div {
  margin-top: 11px;
  padding-top: 11px;
  border-top: 1px solid #d5dde6;
}
.delivery-confirmation-summary ul {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.delivery-confirmation-summary li {
  padding: 5px 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.delivery-confirmation-summary li b {
  color: $primary;
  white-space: nowrap;
}
.delivery-warning-modal .delivery-warning-notice {
  margin-top: 16px;
  padding: 13px 14px;
  border-left: 3px solid $primary;
  color: $primary-dark;
  background: $primary-light;
  font-weight: 600;
}
.delivery-confirmation-check {
  margin-top: 16px;
  padding: 13px;
  border: 1px solid #d5dde6;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  color: $primary-dark;
  background: $white;
  cursor: pointer;
  transition: border-color .2s ease, background .2s ease;
}
.delivery-confirmation-check.checked {
  border-color: $primary;
  background: rgba($primary, .06);
}
.delivery-confirmation-check input {
  appearance: none;
  width: 20px;
  height: 20px;
  flex: none;
  margin: 1px 0 0;
  border: 1px solid $primary;
  display: grid;
  place-content: center;
  background: $white;
}
.delivery-confirmation-check input::before {
  content: "✓";
  color: $white;
  font-size: 14px;
  font-weight: 700;
  transform: scale(0);
  transition: transform .15s ease;
}
.delivery-confirmation-check input:checked {
  background: $primary;
}
.delivery-confirmation-check input:checked::before {
  transform: scale(1);
}
.delivery-confirmation-check span {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  line-height: 1.4;
}
.delivery-confirmation-check small {
  color: $text-secondary;
  font-size: 11px;
}
.delivery-warning-actions {
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 10px;
  margin-top: 26px;
}
.delivery-warning-actions .primary-button {
  padding: 13px 12px;
  font-size: 11px;
}
.delivery-warning-back {
  border: 1px solid $primary;
  padding: 13px 12px;
  color: $primary;
  background: transparent;
  font: 600 11px $font-principal;
}
.checkout-whatsapp-modal .priority-warning {
  color: #9a4f58;
  font-weight: 600;
}
.checkout-whatsapp-modal .whatsapp-note {
  color: #9a4f58;
  font-size: 12px;
}
.checkout-whatsapp-modal a,
.checkout-whatsapp-modal > button:not(.close) {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 0;
  margin-top: 24px;
  padding: 15px 16px;
  color: #fffaf6;
  background: #427a55;
  text-align: center;
  text-decoration: none;
  font: 600 12px $font-principal;
  cursor: pointer;
}
.whatsapp-confirmation-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
}
.whatsapp-confirmation-actions a,
.whatsapp-confirmation-actions button {
  width: 100%;
  box-sizing: border-box;
  margin: 0;
}
.whatsapp-confirmation-actions button {
  border: 1px solid #9a4f58;
  padding: 14px 16px;
  color: #9a4f58;
  background: transparent;
  font: 600 12px $font-principal;
  cursor: pointer;
}
.checkout-total {
  justify-content: space-between;
  padding-top: 20px;
  border-top: 1px solid #dbe2ea;
  font: 500 18px $font-secondary;
}
.checkout-form,
.payment-step {
  flex: 1;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 16px;
}
.checkout-form {
  padding: 0 10px 40px 0;
}
.checkout-form > label {
  width: calc(50% - 8px);
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #706663;
  font-size: 10px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}
.checkout-form .full {
  width: 100%;
}
.checkout-form .primary-button.full {
  margin-top: 14px;
}
.delivery-zone {
  min-width: 0;
  margin: 4px 0;
  padding: 18px;
  border: 1px solid #d5dde6;
  background: #f8fafc;
}
.delivery-zone legend {
  padding: 0 5px;
  color: $primary;
  font: 700 10px $font-principal;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.delivery-zone > p {
  margin: 0 0 14px;
  color: $text-secondary;
  font-size: 12px;
  line-height: 1.45;
  letter-spacing: 0;
  text-transform: none;
}
.delivery-zone-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.delivery-zone-options label {
  min-width: 0;
  min-height: 54px;
  padding: 10px 11px;
  border: 1px solid #d5dde6;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: $primary-dark;
  background: $white;
  cursor: pointer;
  font-size: 11px;
  letter-spacing: 0;
  line-height: 1.25;
  text-transform: none;
  transition: border-color .2s ease, background .2s ease, box-shadow .2s ease, transform .2s ease;
}
.delivery-zone-options label:hover {
  border-color: rgba($primary, .55);
  box-shadow: 0 5px 14px rgba($primary, .08);
  transform: translateY(-1px);
}
.delivery-zone-options label.selected {
  border-color: $primary;
  background: rgba($primary, .06);
  box-shadow: inset 0 0 0 1px $primary;
}
.delivery-zone-options input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: $primary;
}
.delivery-zone-options span {
  font-weight: 600;
}
.delivery-zone-options strong {
  color: $primary;
  font: 700 11px "DM Mono", monospace;
  white-space: nowrap;
}
.checkout-form .delivery-date span {
  color: #9a4f58;
  font-size: 8px;
  letter-spacing: 0.35px;
  text-transform: none;
}
.phone-field {
  display: flex;
  gap: 8px;
}
.phone-field select {
  width: 120px;
  flex: none;
}
.phone-field input {
  flex: 1;
}
.phone-confirmation {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #706663;
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.45;
  text-transform: none;
}
.phone-confirmation input {
  width: auto;
  margin: 1px 0 0;
  accent-color: #9a4f58;
}
input,
textarea,
select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d5dde6;
  border-radius: 0;
  padding: 11px;
  color: $primary-dark;
  background: $white;
  font: 14px $font-principal;
  outline-color: $primary;
}
select:disabled {
  cursor: not-allowed;
  color: #9c8c86;
  background: #f1e8e3;
}
textarea {
  resize: vertical;
}
.error {
  color: #b23d45;
  font-size: 13px;
  line-height: 1.4;
}
.payment-step {
  flex-direction: column;
  gap: 20px;
  padding: 0 10px 40px 0;
}
#payphone-button {
  width: 100%;
  min-width: 0;
  min-height: 280px;
  box-sizing: border-box;
  flex: none;
  overflow: visible;
}
#payphone-button :deep(iframe) {
  display: block;
  width: 100% !important;
  max-width: 100% !important;
}
.payphone-loading {
  width: 100%;
  box-sizing: border-box;
  min-height: 110px;
  padding: 20px;
  border: 1px solid #e1d4ce;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #706663;
  font-size: 12px;
}
.payphone-loading span {
  width: 23px;
  height: 23px;
  border: 2px solid #dbc3b8;
  border-top-color: #9a4f58;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
.modal-enter-active,
.modal-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: translate(-50%, -46%) scale(0.98);
}
@media (max-width: 800px) {
  .site-header {
    padding: 11px 16px;
  }
  .nav-note,
  .nav-link {
    display: none;
  }
  .brand {
    max-width: 120px;
  }
  .brand img {
    width: 100%;
  }
  .cart-trigger {
    min-height: 42px;
    padding: 8px 10px 8px 12px;
  }
  .hero {
    min-height: 760px;
  }
  .hero-copy {
    width: 100%;
    min-width: 0;
    padding: 290px 5vw 30px;
  }
  h1 {
    font-size: 25vw;
  }
  .hero-image {
    width: 62%;
    height: 290px;
    top: 104px;
    right: 5vw;
  }
  .section-heading,
  .checkout-modal {
    align-items: flex-start;
    flex-direction: column;
  }
  .section-heading {
    gap: 28px;
  }
  .section-heading > p,
  .checkout-intro {
    width: 100%;
  }
  .product-list {
    gap: 38px 4%;
  }
  .product-card {
    width: 48%;
    min-width: 0;
  }
  .product-image {
    height: 270px;
  }
  .collection {
    padding: 100px 5vw 70px;
  }
  .manifesto {
    min-height: 420px;
    padding: 80px 8vw;
  }
  footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .product-modal {
    width: min(480px, 92vw);
    max-height: min(620px, calc(100dvh - 86px));
    grid-template-columns: 1fr;
    grid-template-rows: minmax(180px, 32vh) minmax(0, 1fr);
  }
  .product-modal-image {
    width: 100%;
    min-height: 0;
    max-height: none;
  }
  .product-modal-content {
    min-height: 0;
    padding: 32px 28px;
  }
  .product-specs {
    margin-top: 24px;
  }
  .checkout-modal {
    height: auto;
    max-height: calc(100dvh - 72px);
    overflow-y: auto;
    padding: 36px 24px;
    gap: 30px;
  }
  .checkout-intro {
    flex-basis: auto;
    overflow: visible;
  }
  .checkout-form,
  .payment-step {
    overflow: visible;
    padding-right: 0;
  }
  .delivery-warning-modal {
    padding: 42px 24px 26px;
  }
  .delivery-warning-actions {
    grid-template-columns: 1fr;
  }
  .checkout-form {
    width: 100%;
  }
  .delivery-zone-options {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 420px) {
  .product-card {
    width: 100%;
  }
  .product-image {
    height: 340px;
  }
  .checkout-form > label {
    width: 100%;
  }
}
.footer-credits {
  text-align: center;
  padding: 16px 5vw 28px;
  font: 500 10px/1.4 $font-principal;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #9c8c86;
  border-top: 1px solid rgba($primary, 0.08);
  margin-top: -12px;
}
.footer-credits a {
  color: $primary;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s;
}
.footer-credits a:hover {
  opacity: 0.8;
}
</style>
