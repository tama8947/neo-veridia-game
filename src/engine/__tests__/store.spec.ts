import { describe, it, expect } from 'vitest'
import { STORE_PRODUCTS, getProduct, validatePurchaseItem } from '../../lib/store'

describe('STORE_PRODUCTS', () => {
  it('contiene al menos 7 productos premium', () => {
    const premium = STORE_PRODUCTS.filter(p => p.type === 'character')
    expect(premium.length).toBeGreaterThanOrEqual(7)
  })

  it('cada producto tiene id, name, priceUsd y stripePriceId', () => {
    for (const p of STORE_PRODUCTS) {
      expect(typeof p.id).toBe('string')
      expect(typeof p.name).toBe('string')
      expect(p.priceUsd).toBeGreaterThan(0)
      expect(typeof p.stripePriceId).toBe('string')
    }
  })

  it('los IDs son únicos', () => {
    const ids = STORE_PRODUCTS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('los precios están en el rango $1.99–$9.99', () => {
    for (const p of STORE_PRODUCTS) {
      expect(p.priceUsd).toBeGreaterThanOrEqual(1.99)
      expect(p.priceUsd).toBeLessThanOrEqual(9.99)
    }
  })
})

describe('getProduct', () => {
  it('retorna producto por id', () => {
    const first = STORE_PRODUCTS[0]
    expect(getProduct(first.id)).toEqual(first)
  })

  it('retorna undefined para id desconocido', () => {
    expect(getProduct('producto-inexistente')).toBeUndefined()
  })
})

describe('validatePurchaseItem', () => {
  it('acepta itemType y itemId válidos', () => {
    const first = STORE_PRODUCTS[0]
    expect(validatePurchaseItem(first.type, first.id)).toBe(true)
  })

  it('rechaza itemId que no existe en el catálogo', () => {
    expect(validatePurchaseItem('character', 'char-fantasma-inexistente')).toBe(false)
  })
})
