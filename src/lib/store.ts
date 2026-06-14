// Store catalog — pure data, no DB/Stripe imports
// Stripe Price IDs are placeholders — replace with real ones from Stripe dashboard

export type ProductType = 'character' | 'board_skin' | 'season_pass' | 'starter_pack'

export interface StoreProduct {
  id:            string
  name:          string
  description:   string
  type:          ProductType
  priceUsd:      number
  stripePriceId: string
  characterSlug?: string
}

export const STORE_PRODUCTS: StoreProduct[] = [
  // ── Premium characters ($1.99–$4.99) ─────────────────────────────────────
  {
    id:            'char-amo-del-caos',
    name:          'El Amo del Caos',
    description:   'Fuerza a cualquier jugador a re-tirar el dado (1×/partida)',
    type:          'character',
    priceUsd:      2.99,
    stripePriceId: 'price_amo_del_caos',
    characterSlug: 'el-amo-del-caos',
  },
  {
    id:            'char-reina-circuitos',
    name:          'La Reina de Circuitos',
    description:   'Una propiedad elegida genera renta doble permanente',
    type:          'character',
    priceUsd:      3.99,
    stripePriceId: 'price_reina_circuitos',
    characterSlug: 'la-reina-de-circuitos',
  },
  {
    id:            'char-senor-del-tiempo',
    name:          'El Señor del Tiempo',
    description:   'Salta un evento countdown una vez por partida',
    type:          'character',
    priceUsd:      2.99,
    stripePriceId: 'price_senor_tiempo',
    characterSlug: 'el-señor-del-tiempo',
  },
  {
    id:            'char-mente-colmena',
    name:          'La Mente Colmena',
    description:   'Obtiene bono de clúster de cualquier color (1/turno)',
    type:          'character',
    priceUsd:      4.99,
    stripePriceId: 'price_mente_colmena',
    characterSlug: 'la-mente-colmena',
  },
  {
    id:            'char-nodo-espectral',
    name:          'El Nodo Espectral',
    description:   'Inmune a estasis y asedios durante 3 turnos',
    type:          'character',
    priceUsd:      3.99,
    stripePriceId: 'price_nodo_espectral',
    characterSlug: 'el-nodo-espectral',
  },
  {
    id:            'char-arquitecta-vacio',
    name:          'La Arquitecta del Vacío',
    description:   'Construye en tiles sin dueño sin pagar renta',
    type:          'character',
    priceUsd:      4.99,
    stripePriceId: 'price_arquitecta_vacio',
    characterSlug: 'la-arquitecta-del-vacio',
  },
  {
    id:            'char-ultimo-protocolo',
    name:          'El Último Protocolo',
    description:   'A partir del turno 35, todas sus acciones cuestan 1⚡ menos',
    type:          'character',
    priceUsd:      3.99,
    stripePriceId: 'price_ultimo_protocolo',
    characterSlug: 'el-ultimo-protocolo',
  },

  // ── Skins de tablero ($2.99) ──────────────────────────────────────────────
  {
    id:            'skin-neon-chrome',
    name:          'Tablero Neon Chrome',
    description:   'Paleta cromada con bordes neón eléctrico',
    type:          'board_skin',
    priceUsd:      2.99,
    stripePriceId: 'price_skin_neon_chrome',
  },
  {
    id:            'skin-solarpunk',
    name:          'Tablero Solarpunk',
    description:   'Tonos verdes y dorados, naturaleza integrada',
    type:          'board_skin',
    priceUsd:      2.99,
    stripePriceId: 'price_skin_solarpunk',
  },

  // ── Packs ────────────────────────────────────────────────────────────────
  {
    id:            'pack-starter',
    name:          'Pack Iniciador',
    description:   '3 personajes base premium + skin Neon Chrome',
    type:          'starter_pack',
    priceUsd:      7.99,
    stripePriceId: 'price_starter_pack',
  },
]

export function getProduct(id: string): StoreProduct | undefined {
  return STORE_PRODUCTS.find(p => p.id === id)
}

export function validatePurchaseItem(type: string, itemId: string): boolean {
  return STORE_PRODUCTS.some(p => p.type === type && p.id === itemId)
}
