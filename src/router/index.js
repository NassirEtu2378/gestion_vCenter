import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/Dashboard.vue'),
    },
  ],
})

export default router
