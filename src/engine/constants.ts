import type { PropertyColor, UpgradeLevel } from './schemas'

// ── Economy ───────────────────────────────────────────────────────────────────

export const NUCLEUS_CREDITS_BONUS = 200
export const NUCLEUS_ENERGY_BONUS  = 2
export const ENERGY_REGEN_PER_TURN = 2

export const STASIS_COST_CREDITS = 50
export const STASIS_COST_ENERGY  = 5

export const MORTGAGE_RATIO      = 0.5   // 50% del baseCost
export const RENT_ENERGY_RATIO   = 20    // 1⚡ = 20💰 al pagar renta con energía

export const CLUSTER_RENT_MULTIPLIER = 2.0

export const UPGRADE_COSTS: Record<UpgradeLevel, number> = {
  0: 0,   // sin mejora (no se usa)
  1: 3,   // ⚡ para subir a nivel 1
  2: 5,   // ⚡ para subir a nivel 2
  3: 8,   // ⚡ para subir a nivel 3
}

export const UPGRADE_RENT_MULTIPLIERS: Record<UpgradeLevel, number> = {
  0: 1.0,
  1: 1.5,
  2: 2.0,
  3: 3.0,
}

// ── Board ────────────────────────────────────────────────────────────────────

export const TOTAL_TILES     = 37
export const MAX_TURNS       = 40
export const AUCTION_TIMER_MS = 15_000

// Propiedades por color (3 por color, 12 colores = 36 + 1 núcleo)
export const PROPERTIES_PER_COLOR = 3

export const TILE_BASE_COSTS: Record<PropertyColor, number> = {
  cyan:    100,
  sky:     100,
  lime:    120,
  emerald: 120,
  amber:   140,
  orange:  140,
  rose:    160,
  fuchsia: 160,
  magenta: 180,
  indigo:  180,
  violet:  200,
  teal:    200,
}

export const TILE_BASE_RENTS: Record<PropertyColor, number> = {
  cyan:    30,
  sky:     30,
  lime:    36,
  emerald: 36,
  amber:   42,
  orange:  42,
  rose:    48,
  fuchsia: 48,
  magenta: 54,
  indigo:  54,
  violet:  60,
  teal:    60,
}

// ── Countdown Events (turnos globales) ───────────────────────────────────────

export const COUNTDOWN_TURNS = [20, 30, 35, 38] as const
export type  CountdownTurn   = typeof COUNTDOWN_TURNS[number]

export const COUNTDOWN_EVENTS: Record<CountdownTurn, string> = {
  20: 'RENT_INCREASE_25',
  30: 'PORTALS_HALF_DISABLED',
  35: 'ENERGY_CRISIS',
  38: 'FINAL_AUCTION',
}

// ── XP Rewards ───────────────────────────────────────────────────────────────

export const XP_REWARDS = {
  WIN:               500,
  LOSE:              100,
  CLUSTER_COMPLETE:  75,
  CAUSE_BANKRUPTCY:  200,
  SURVIVE_TURN_35:   150,
  DRAW_GUILD_EVENT:  25,
  PNA_ACCEPTED:      50,
} as const

// ── ELO ──────────────────────────────────────────────────────────────────────

export const ELO_K_FACTOR = 32
export const ELO_INITIAL  = 1000

// ── Starting Resources ────────────────────────────────────────────────────────

export const STARTING_CREDITS = 1500
export const STARTING_ENERGY  = 10

// ── Guild Rescue ──────────────────────────────────────────────────────────────

export const GUILD_RESCUE_CREDITS = 100

// ── PNA ──────────────────────────────────────────────────────────────────────

export const PNA_DURATION_TURNS   = 5
export const PNA_BREACH_PENALTY   = 3   // ⚡ perdidos al romper PNA
