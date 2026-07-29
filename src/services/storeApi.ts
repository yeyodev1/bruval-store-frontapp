import APIBase from './httpBase'

export interface Product {
  _id: string
  name: string
  slug: string
  description: string
  price: number
  image: string
  palette: string
  featured: boolean
}

export interface CartItem extends Product {
  quantity: number
}

export interface CheckoutPayload {
  items: Array<{ productId: string; quantity: number }>
  customer: { name: string; email: string; phone: string }
  delivery: { recipient: string; address: string; mapUrl: string; date: string; timeSlot: string; messageCard: string }
}

class StoreApi extends APIBase {
  products() {
    return this.get<Product[]>('products')
  }

  createOrder(payload: CheckoutPayload) {
    return this.post<{ orderNumber: string; total: number; payphone: { token?: string; storeId?: string } }>('orders', payload)
  }

  confirmPayphonePayment(id: string, clientTransactionId: string) {
    return this.post<{ approved: boolean; orderNumber: string; message: string }>('payments/payphone/confirm', { id, clientTransactionId })
  }
}

export const storeApi = new StoreApi()
