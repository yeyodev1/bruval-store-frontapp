import APIBase from './httpBase'

export interface Product {
  _id: string
  name: string
  slug: string
  sku: string
  collection: string
  categories: string[]
  dimensions: string
  description: string
  price: number
  regularPrice?: number
  discountPercentage?: number
  webExclusive: boolean
  image: string
  palette: string
  featured: boolean
}

export interface CartItem extends Product {
  quantity: number
}

export interface CheckoutPayload {
  offerId: string
  items: Array<{ productId: string; quantity: number }>
  customer: { name: string; email: string; phone: string; phoneConfirmed: boolean }
  delivery: { recipient: string; address: string; mapUrl: string; date: string; timeSlot: string; messageCard: string }
}

class StoreApi extends APIBase {
  products(offerId: string, page = 1, limit = 5, category?: string) {
    let url = `products?offerId=${encodeURIComponent(offerId)}&page=${page}&limit=${limit}`
    if (category) url += `&category=${encodeURIComponent(category)}`
    return this.get<{ products: Product[]; offer: { active: boolean; expiresAt: string }; pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean } }>(url)
  }

  createOrder(payload: CheckoutPayload) {
    return this.post<{ orderNumber: string; total: number; payphone: { token?: string; storeId?: string } }>('orders', payload)
  }

  lookupOrders(value: string) {
    return this.post<Array<{ orderNumber: string; items: Array<{ name: string; price: number; quantity: number }>; total: number; status: string; createdAt: string; delivery: { recipient: string; address: string; mapUrl: string; date: string; timeSlot: string; messageCard: string } }>>('orders/lookup', { value })
  }

  confirmPayphonePayment(id: string, clientTransactionId: string) {
    return this.post<{ approved: boolean; orderNumber: string; message: string; order: { items: Array<{ name: string; price: number; quantity: number }>; total: number; customer: { name: string; email: string; phone: string }; delivery: { recipient: string; address: string; mapUrl: string; date: string; timeSlot: string; messageCard: string }; status: string } }>('payments/payphone/confirm', { id, clientTransactionId })
  }
}

export const storeApi = new StoreApi()
