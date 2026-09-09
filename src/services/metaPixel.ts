import { storeApi } from './storeApi'

/**
 * Tracking de Meta: dispara el Pixel en el navegador y reenvía el mismo evento
 * (mismo `eventID`) al backend, que lo manda a la Conversions API. Meta deduplica
 * por event_id, así que cada acción cuenta una sola vez aunque llegue por dos vías.
 */
export type MetaEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Lead'
  | 'Contact'
  | 'Search'

export interface MetaContent {
  id: string
  quantity: number
  item_price?: number
}

export interface MetaEventParams {
  content_name?: string
  content_ids?: string[]
  content_type?: 'product'
  content_category?: string
  contents?: MetaContent[]
  value?: number
  currency?: 'USD'
  num_items?: number
  order_id?: string
  search_string?: string
}

interface TrackOptions {
  /** Identificador compartido entre Pixel y Conversions API. Se genera si no se envía. */
  eventId?: string
  /** Desactiva el reenvío al servidor (cuando el backend ya emite ese evento por su cuenta). */
  server?: boolean
}

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

export function newEventId(prefix = 'ev') {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  return `${prefix}-${random}`
}

export function trackMeta(eventName: MetaEventName, params: MetaEventParams = {}, options: TrackOptions = {}) {
  const eventId = options.eventId || newEventId(eventName.toLowerCase())
  const fbq = (window as any).fbq
  if (typeof fbq === 'function') {
    try {
      fbq('track', eventName, params, { eventID: eventId })
    } catch (error) {
      console.warn('Meta Pixel error', error)
    }
  }

  if (options.server !== false) {
    storeApi
      .trackMetaEvent({
        eventName,
        eventId,
        eventSourceUrl: window.location.href,
        customData: { ...params },
        fbp: readCookie('_fbp'),
        fbc: readCookie('_fbc'),
      })
      .catch(() => undefined)
  }
  return eventId
}

/** Datos que viajan con el pedido para atribuir el Purchase desde el servidor. */
export function metaTrackingSnapshot() {
  return {
    fbp: readCookie('_fbp'),
    fbc: readCookie('_fbc'),
    eventSourceUrl: window.location.href,
  }
}

export function productParams(product: { name: string; sku: string; price: number; categories?: string[] }, quantity = 1): MetaEventParams {
  return {
    content_name: product.name,
    content_ids: [product.sku],
    content_type: 'product',
    content_category: product.categories?.[0],
    contents: [{ id: product.sku, quantity, item_price: product.price }],
    value: Math.round(product.price * quantity * 100) / 100,
    currency: 'USD',
  }
}
