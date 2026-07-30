import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: 'Flores a domicilio en Guayaquil | Bruval', description: 'Flores, rosas preservadas y detalles para entregar momentos especiales en Guayaquil, Ecuador.' },
  },
  {
    path: '/pay-response',
    name: 'PaymentResult',
    alias: '/pago/resultado',
    component: () => import('../views/PaymentResultView.vue'),
    meta: { title: 'Confirmando pago | Bruval', noindex: true },
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/AdminLoginView.vue'),
    meta: { title: 'Administración | Bruval', noindex: true },
  },
  {
    path: '/pedido',
    name: 'OrderLookup',
    component: () => import('../views/OrderLookupView.vue'),
    meta: { title: 'Consulta tu pedido | Bruval', noindex: true },
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('../views/AdminDashboardView.vue'),
    meta: { title: 'Ventas Bruval', requiresAuth: true, noindex: true },
  },
  {
    path: '/admin/productos',
    name: 'AdminProducts',
    component: () => import('../views/AdminProductsView.vue'),
    meta: { title: 'Catálogo Bruval', requiresAuth: true, noindex: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: 'Página no encontrada | Bruval', noindex: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { left: 0, top: 0, behavior: 'smooth' }
  },
})

router.beforeEach((to, _from, next) => {
  const hasToken = !!localStorage.getItem('access_token')
  const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth)

  if (requiresAuth && !hasToken) {
    return next({ path: '/admin/login', replace: true })
  }

  if (to.path === '/admin/login' && hasToken) {
    return next({ path: '/admin', replace: true })
  }

  next()
})

router.afterEach((to) => {
  document.title = String(to.meta.title || 'Bruval')

  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (description && typeof to.meta.description === 'string') description.content = to.meta.description

  const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
  if (robots) robots.content = to.meta.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
})

export default router
