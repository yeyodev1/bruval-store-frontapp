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
  collection: string
  categories: string[]
  palette: string
  description: string
  dimensions: string
  image: string
  price: number
  regularPrice?: number
  available: boolean
  featured: boolean
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

  uploadProductImage(image: string) {
    return this.post<{ url: string }>('admin/products/image', { image })
  }

  createProduct(payload: Omit<AdminProduct, '_id'>) {
    return this.post<AdminProduct>('admin/products', payload)
  }

  updateProduct(id: string, payload: Omit<AdminProduct, '_id'>) {
    return this.patch<AdminProduct>(`admin/products/${id}`, payload)
  }

  deleteProduct(id: string) {
    return this.delete(`admin/products/${id}`)
  }
}

export const adminApi = new AdminApi()
