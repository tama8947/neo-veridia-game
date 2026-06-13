import { z } from 'zod'

// ── Primitives ──────────────────────────────────────────────────────────────

export const TileIdSchema = z.string().regex(/^-?\d+,-?\d+,-?\d+$/)

export const TileTypeSchema = z.enum([
  'nucleus', 'property', 'stasis', 'portal', 'guild_event', 'dark_district',
])

export const PropertyColorSchema = z.enum([
  'cyan', 'magenta', 'amber', 'violet', 'emerald',
  'rose', 'indigo', 'orange', 'lime', 'sky', 'fuchsia', 'teal',
])

export const UpgradeLevelSchema = z.union([
  z.literal(0), z.literal(1), z.literal(2), z.literal(3),
])

// ── Tile ─────────────────────────────────────────────────────────────────────

export const TileSchema = z.object({
  id:              TileIdSchema,
  type:            TileTypeSchema,
  color:           PropertyColorSchema.optional(),
  ownerId:         z.string().optional(),
  upgradeLevel:    UpgradeLevelSchema,
  isMortgaged:     z.boolean(),
  isUnderSiege:    z.boolean(),
  siegeByPlayerId: z.string().optional(),
  baseRent:        z.number().int().nonnegative(),
  baseCost:        z.number().int().nonnegative(),
  portalGroupId:   z.string().optional(),
}).superRefine((tile, ctx) => {
  if (tile.type !== 'property' && tile.color !== undefined)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'color only valid for property tiles' })
  if (tile.type !== 'property' && tile.ownerId !== undefined)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ownerId only valid for property tiles' })
  if (tile.upgradeLevel > 0 && (tile.ownerId === undefined || tile.isMortgaged))
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'cannot upgrade unowned or mortgaged tile' })
  if (tile.isUnderSiege && tile.siegeByPlayerId === undefined)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'siege requires siegeByPlayerId' })
  if (tile.type !== 'portal' && tile.portalGroupId !== undefined)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'portalGroupId only valid for portal tiles' })
})

// ── PNA ──────────────────────────────────────────────────────────────────────

export const PnaSchema = z.object({
  withPlayerId: z.string(),
  turnsLeft:    z.number().int().min(0).max(5),
  broken:       z.boolean(),
})

// ── Player ───────────────────────────────────────────────────────────────────

export const PlayerSchema = z.object({
  id:              z.string(),
  userId:          z.string(),
  characterSlug:   z.string(),
  credits:         z.number().int().min(0),
  energy:          z.number().int().min(0),
  currentTileId:   TileIdSchema,
  isEliminated:    z.boolean(),
  isInStasis:      z.boolean(),
  stasisTurnsLeft: z.number().int().min(0).max(3),
  activePnas:      z.array(PnaSchema),
  xpEarned:        z.number().int().min(0),
}).superRefine((player, ctx) => {
  if (player.isInStasis && player.stasisTurnsLeft === 0)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'stasisTurnsLeft must be > 0 when inStasis' })
  const pnaTargets = player.activePnas.map(p => p.withPlayerId)
  if (new Set(pnaTargets).size !== pnaTargets.length)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'duplicate PNA withPlayerId' })
})

// ── Guild Event ───────────────────────────────────────────────────────────────

export const GuildEventCardSchema = z.object({
  id:          z.string(),
  name:        z.string(),
  effectKey:   z.string(),
  probability: z.number().min(0).max(1),
})

export const EventDeckSchema = z.array(GuildEventCardSchema).refine(
  deck => Math.abs(deck.reduce((sum, c) => sum + c.probability, 0) - 1.0) < 0.001,
  { message: 'Event deck probabilities must sum to 1.0' }
)

// ── Auction ───────────────────────────────────────────────────────────────────

export const AuctionSchema = z.object({
  tileId:  TileIdSchema,
  bids:    z.record(z.string(), z.number().int().nonnegative()),
  timerMs: z.number().int().min(0).max(15_000),
  active:  z.boolean(),
})

// ── Global Effect ─────────────────────────────────────────────────────────────

export const GlobalEffectSchema = z.object({
  key:       z.string(),
  turnsLeft: z.number().int().positive().optional(),
})

// ── Game Phase ────────────────────────────────────────────────────────────────

export const GamePhaseSchema = z.enum([
  'waiting', 'rolling', 'choosing_path', 'landing',
  'buying', 'paying_rent', 'guild_event', 'auction',
  'stasis_choice', 'end_turn', 'finished',
])

// ── Game Context ──────────────────────────────────────────────────────────────

export const GameContextSchema = z.object({
  tiles:              z.record(TileIdSchema, TileSchema),
  players:            z.record(z.string(), PlayerSchema),
  turnOrder:          z.array(z.string()).min(2).max(3),
  currentPlayerIndex: z.number().int().min(0).max(2),
  currentTurn:        z.number().int().min(1).max(40),
  maxTurns:           z.literal(40),
  phase:              GamePhaseSchema,
  diceValue:          z.union([
    z.literal(1), z.literal(2), z.literal(3),
    z.literal(4), z.literal(5), z.literal(6),
  ]).optional(),
  availablePaths: z.array(z.array(TileIdSchema)).optional(),
  lastEvent:      GuildEventCardSchema.optional(),
  auction:        AuctionSchema.optional(),
  globalEffects:  z.array(GlobalEffectSchema),
  log: z.array(z.object({
    turn:      z.number().int(),
    playerId:  z.string(),
    action:    z.string(),
    timestamp: z.number(),
  })),
})

// ── Intents (WebSocket: client → PartyKit) ────────────────────────────────────

export const IntentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ROLL_DICE') }),
  z.object({ type: z.literal('CHOOSE_PATH'),       path: z.array(TileIdSchema).min(1).max(6) }),
  z.object({ type: z.literal('BUY_PROPERTY'),      tileId: TileIdSchema }),
  z.object({ type: z.literal('SKIP_BUY') }),
  z.object({ type: z.literal('PAY_RENT_CREDITS') }),
  z.object({ type: z.literal('PAY_RENT_ENERGY') }),
  z.object({ type: z.literal('UPGRADE_PROPERTY'),  tileId: TileIdSchema }),
  z.object({ type: z.literal('MORTGAGE_PROPERTY'), tileId: TileIdSchema }),
  z.object({ type: z.literal('PAY_STASIS'),        method: z.enum(['credits', 'energy']) }),
  z.object({ type: z.literal('SKIP_STASIS') }),
  z.object({ type: z.literal('PROPOSE_PNA'),       targetPlayerId: z.string() }),
  z.object({ type: z.literal('ACCEPT_PNA'),        fromPlayerId: z.string() }),
  z.object({ type: z.literal('REJECT_PNA'),        fromPlayerId: z.string() }),
  z.object({ type: z.literal('PLACE_AUCTION_BID'), tileId: TileIdSchema, amount: z.number().int().positive() }),
  z.object({ type: z.literal('GUILD_RESCUE') }),
])

// ── API Bodies ────────────────────────────────────────────────────────────────

export const FinishGameBodySchema = z.object({
  roomId:       z.string(),
  winnerUserId: z.string().optional(),
  players: z.array(z.object({
    userId:       z.string(),
    xpEarned:     z.number().int().min(0),
    finalCredits: z.number().int().min(0),
    finalEnergy:  z.number().int().min(0),
  })),
  replayFrames: z.array(GameContextSchema),
  totalTurns:   z.number().int().min(1).max(40),
})

export const CheckoutBodySchema = z.object({
  itemType: z.enum(['character', 'board_skin', 'season_pass', 'starter_pack']),
  itemId:   z.string(),
})

export const PushSubscribeBodySchema = z.object({
  endpoint: z.string().url(),
  p256dh:   z.string(),
  auth:     z.string(),
})

export const AchievementCheckBodySchema = z.object({
  userId:  z.string(),
  gameId:  z.string(),
  stats: z.object({
    won:                     z.boolean(),
    consecutiveWins:         z.number().int().min(0),
    nucleusLandings:         z.number().int().min(0),
    clustersCompleted:       z.number().int().min(0),
    propertiesOwned:         z.number().int().min(0),
    totalGamesPlayed:        z.number().int().min(0),
    eliminations:            z.number().int().min(0),
    survivedTurn35:          z.boolean(),
    wonWithoutBuying:        z.boolean(),
    eliminatedBothSameTurn:  z.boolean(),
    completedAllColors:      z.boolean(),
  }),
})

// ── Inferred types ────────────────────────────────────────────────────────────

export type TileId           = z.infer<typeof TileIdSchema>
export type TileType         = z.infer<typeof TileTypeSchema>
export type PropertyColor    = z.infer<typeof PropertyColorSchema>
export type UpgradeLevel     = z.infer<typeof UpgradeLevelSchema>
export type Tile             = z.infer<typeof TileSchema>
export type Pna              = z.infer<typeof PnaSchema>
export type Player           = z.infer<typeof PlayerSchema>
export type GuildEventCard   = z.infer<typeof GuildEventCardSchema>
export type Auction          = z.infer<typeof AuctionSchema>
export type GlobalEffect     = z.infer<typeof GlobalEffectSchema>
export type GamePhase        = z.infer<typeof GamePhaseSchema>
export type GameContext      = z.infer<typeof GameContextSchema>
export type GameIntent       = z.infer<typeof IntentSchema>
