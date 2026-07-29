import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: 'Home' },
  },
  {
    path: '/pay-response',
    name: 'PaymentResult',
    alias: '/pago/resultado',
    component: () => import('../views/PaymentResultView.vue'),
    meta: { title: 'Confirmando pago' },
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/AdminLoginView.vue'),
    meta: { title: 'Administración' },
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('../views/AdminDashboardView.vue'),
    meta: { title: 'Ventas Bruval', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: 'Página no encontrada' },
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
    return next({ path: '/login', replace: true })
  }

  if (to.path === '/login' && hasToken) {
    return next({ path: '/', replace: true })
  }

  next()
})

export default router
