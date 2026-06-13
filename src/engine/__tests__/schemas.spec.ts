import { describe, it, expect } from 'vitest'
import {
  TileIdSchema,
  TileSchema,
  PlayerSchema,
  EventDeckSchema,
  AuctionSchema,
  GameContextSchema,
  IntentSchema,
  PushSubscribeBodySchema,
  CheckoutBodySchema,
} from '../schemas'

// ── TileId ────────────────────────────────────────────────────────────────────

describe('TileIdSchema', () => {
  it('acepta coordenadas axiales válidas', () => {
    expect(TileIdSchema.safeParse('0,0,0').success).toBe(true)
    expect(TileIdSchema.safeParse('-2,1,1').success).toBe(true)
    expect(TileIdSchema.safeParse('3,-2,-1').success).toBe(true)
  })

  it('rechaza formatos inválidos', () => {
    expect(TileIdSchema.safeParse('0,0').success).toBe(false)
    expect(TileIdSchema.safeParse('a,b,c').success).toBe(false)
    expect(TileIdSchema.safeParse('').success).toBe(false)
  })
})

// ── Tile ──────────────────────────────────────────────────────────────────────

const baseTile = {
  id: '0,0,0', type: 'nucleus' as const,
  upgradeLevel: 0 as const, isMortgaged: false,
  isUnderSiege: false, baseRent: 0, baseCost: 0,
}

describe('TileSchema', () => {
  it('acepta tile de tipo nucleus válido', () => {
    expect(TileSchema.safeParse(baseTile).success).toBe(true)
  })

  it('acepta property con color y ownerId', () => {
    const tile = { ...baseTile, id: '1,0,-1', type: 'property' as const, color: 'cyan' as const, ownerId: 'p1', baseRent: 30, baseCost: 100 }
    expect(TileSchema.safeParse(tile).success).toBe(true)
  })

  it('rechaza color en tile no-property', () => {
    const tile = { ...baseTile, type: 'stasis' as const, color: 'cyan' as const }
    expect(TileSchema.safeParse(tile).success).toBe(false)
  })

  it('rechaza upgradeLevel > 0 sin ownerId', () => {
    const tile = { ...baseTile, type: 'property' as const, upgradeLevel: 1 as const }
    expect(TileSchema.safeParse(tile).success).toBe(false)
  })

  it('rechaza isUnderSiege sin siegeByPlayerId', () => {
    const tile = { ...baseTile, isUnderSiege: true }
    expect(TileSchema.safeParse(tile).success).toBe(false)
  })

  it('rechaza portalGroupId en tile no-portal', () => {
    const tile = { ...baseTile, portalGroupId: 'alpha' }
    expect(TileSchema.safeParse(tile).success).toBe(false)
  })
})

// ── Player ────────────────────────────────────────────────────────────────────

const basePlayer = {
  id: 'p1', userId: 'user-1', characterSlug: 'el-arquitecto',
  credits: 1500, energy: 10, currentTileId: '0,0,0',
  isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
  activePnas: [], xpEarned: 0,
}

describe('PlayerSchema', () => {
  it('acepta jugador válido con recursos iniciales', () => {
    expect(PlayerSchema.safeParse(basePlayer).success).toBe(true)
  })

  it('rechaza credits negativos', () => {
    expect(PlayerSchema.safeParse({ ...basePlayer, credits: -1 }).success).toBe(false)
  })

  it('rechaza energy negativa', () => {
    expect(PlayerSchema.safeParse({ ...basePlayer, energy: -5 }).success).toBe(false)
  })

  it('rechaza isInStasis=true con stasisTurnsLeft=0', () => {
    expect(PlayerSchema.safeParse({ ...basePlayer, isInStasis: true, stasisTurnsLeft: 0 }).success).toBe(false)
  })

  it('acepta isInStasis=true con stasisTurnsLeft=1', () => {
    expect(PlayerSchema.safeParse({ ...basePlayer, isInStasis: true, stasisTurnsLeft: 1 }).success).toBe(true)
  })

  it('rechaza PNAs duplicados con el mismo withPlayerId', () => {
    const player = {
      ...basePlayer,
      activePnas: [
        { withPlayerId: 'p2', turnsLeft: 3, broken: false },
        { withPlayerId: 'p2', turnsLeft: 2, broken: false },
      ],
    }
    expect(PlayerSchema.safeParse(player).success).toBe(false)
  })
})

// ── EventDeck ─────────────────────────────────────────────────────────────────

describe('EventDeckSchema', () => {
  it('acepta deck cuyas probabilidades suman 1.0', () => {
    const deck = [
      { id: 'e1', name: 'Carta A', effectKey: 'KEY_A', probability: 0.6 },
      { id: 'e2', name: 'Carta B', effectKey: 'KEY_B', probability: 0.4 },
    ]
    expect(EventDeckSchema.safeParse(deck).success).toBe(true)
  })

  it('rechaza deck cuyas probabilidades no suman 1.0', () => {
    const deck = [
      { id: 'e1', name: 'Carta A', effectKey: 'KEY_A', probability: 0.5 },
      { id: 'e2', name: 'Carta B', effectKey: 'KEY_B', probability: 0.3 },
    ]
    expect(EventDeckSchema.safeParse(deck).success).toBe(false)
  })
})

// ── Auction ───────────────────────────────────────────────────────────────────

describe('AuctionSchema', () => {
  it('acepta subasta válida', () => {
    const auction = { tileId: '1,0,-1', bids: { p1: 150, p2: 200 }, timerMs: 10000, active: true }
    expect(AuctionSchema.safeParse(auction).success).toBe(true)
  })

  it('rechaza timerMs mayor a 15000', () => {
    const auction = { tileId: '1,0,-1', bids: {}, timerMs: 20000, active: true }
    expect(AuctionSchema.safeParse(auction).success).toBe(false)
  })

  it('rechaza bid negativo', () => {
    const auction = { tileId: '1,0,-1', bids: { p1: -100 }, timerMs: 10000, active: true }
    expect(AuctionSchema.safeParse(auction).success).toBe(false)
  })
})

// ── Intent ────────────────────────────────────────────────────────────────────

describe('IntentSchema', () => {
  it('acepta ROLL_DICE', () => {
    expect(IntentSchema.safeParse({ type: 'ROLL_DICE' }).success).toBe(true)
  })

  it('acepta CHOOSE_PATH con path válido', () => {
    const intent = { type: 'CHOOSE_PATH', path: ['0,0,0', '1,0,-1'] }
    expect(IntentSchema.safeParse(intent).success).toBe(true)
  })

  it('rechaza CHOOSE_PATH con path vacío', () => {
    expect(IntentSchema.safeParse({ type: 'CHOOSE_PATH', path: [] }).success).toBe(false)
  })

  it('acepta PLACE_AUCTION_BID con amount positivo', () => {
    const intent = { type: 'PLACE_AUCTION_BID', tileId: '1,0,-1', amount: 100 }
    expect(IntentSchema.safeParse(intent).success).toBe(true)
  })

  it('rechaza PLACE_AUCTION_BID con amount 0', () => {
    const intent = { type: 'PLACE_AUCTION_BID', tileId: '1,0,-1', amount: 0 }
    expect(IntentSchema.safeParse(intent).success).toBe(false)
  })

  it('rechaza intent desconocido', () => {
    expect(IntentSchema.safeParse({ type: 'HACK_SERVER' }).success).toBe(false)
  })
})

// ── API Bodies ────────────────────────────────────────────────────────────────

describe('PushSubscribeBodySchema', () => {
  it('acepta suscripción válida', () => {
    const body = { endpoint: 'https://fcm.googleapis.com/push/abc', p256dh: 'abc123', auth: 'xyz' }
    expect(PushSubscribeBodySchema.safeParse(body).success).toBe(true)
  })

  it('rechaza endpoint que no es URL', () => {
    const body = { endpoint: 'not-a-url', p256dh: 'abc', auth: 'xyz' }
    expect(PushSubscribeBodySchema.safeParse(body).success).toBe(false)
  })
})

describe('CheckoutBodySchema', () => {
  it('acepta itemType character', () => {
    expect(CheckoutBodySchema.safeParse({ itemType: 'character', itemId: 'nexus-7' }).success).toBe(true)
  })

  it('rechaza itemType inválido', () => {
    expect(CheckoutBodySchema.safeParse({ itemType: 'gem_pack', itemId: 'x' }).success).toBe(false)
  })
})
