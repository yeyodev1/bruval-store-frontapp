import APIBase from './httpBase'

export interface Product {
  _id: string
  name: string
  slug: string
  sku: string
  collection: string
  dimensions: string
  description: string
  price: number
  regularPrice?: number
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
  products(offerId: string) {
    return this.get<{ products: Product[]; offer: { active: boolean; expiresAt: string } }>(`products?offerId=${encodeURIComponent(offerId)}`)
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
