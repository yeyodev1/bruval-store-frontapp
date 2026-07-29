import { defineStore } from 'pinia'

export interface UserState {
  id: string | null
  name: string | null
  email: string | null
  isAuthenticated: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    id: null,
    name: null,
    email: null,
    isAuthenticated: false,
  }),

  actions: {
    hydrate() {
      const token = localStorage.getItem('access_token')
      const id = localStorage.getItem('user_id')

      this.isAuthenticated = !!token
      this.id = id || null
    },

    setUser(payload: { id?: string; name?: string; email?: string }) {
      if (payload.id !== undefined) {
        this.id = payload.id
        try {
          localStorage.setItem('user_id', payload.id)
        } catch {}
      }
      if (payload.name) this.name = payload.name
      if (payload.email) this.email = payload.email
      this.isAuthenticated = true
    },

    clear() {
      this.id = null
      this.name = null
      this.email = null
      this.isAuthenticated = false
      try {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_id')
      } catch {}
    },
  },
})
