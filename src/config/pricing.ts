/**
 * Ajuste global de precio de venta, espejo de `PRICE_ADJUSTMENT` en el backend
 * (`src/services/pricing.service.ts`). El admin edita el precio base; la tienda
 * cobra el precio base más este ajuste.
 *
 * Si cambias el valor aquí, cámbialo también en el backend.
 */
export const PRICE_ADJUSTMENT = 10

export function publicPrice(basePrice: number) {
  return Math.round((basePrice + PRICE_ADJUSTMENT) * 100) / 100
}
