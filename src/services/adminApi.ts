import APIBase from './httpBase'

export interface AdminOrder {
  _id: string
  orderNumber: string
  total: number
  status: 'awaiting_payment' | 'paid' | 'payment_failed'
  createdAt: string
  customer: { name: string; email: string; phone: string }
  delivery: { recipient: string; address: string; mapUrl: string; date: string; timeSlot: string; messageCard: string }
  items: Array<{ name: string; price: number; quantity: number }>
}

export interface AdminProduct {
  _id: string
  name: string
  sku: string
  description: string
  dimensions: string
  image: string
  price: number
  available: boolean
}

class AdminApi extends APIBase {
  login(email: string, password: string) {
    return this.post<{ token: string; user: { name: string; email: string; role: string } }>('admin/login', { email, password })
  }

  orders() {
    return this.get<AdminOrder[]>('admin/orders')
  }

  createUser(payload: { name: string; email: string; password: string; role: string }) {
    return this.post('admin/users', payload)
  }

  products() {
    return this.get<AdminProduct[]>('admin/products')
  }

  updateProduct(id: string, payload: Omit<AdminProduct, '_id'>) {
    return this.patch<AdminProduct>(`admin/products/${id}`, payload)
  }
}

export const adminApi = new AdminApi()
