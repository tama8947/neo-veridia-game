import type { GameContext, TileId } from './schemas'

// ── Character roster ──────────────────────────────────────────────────────────

export type CharacterTier = 'base' | 'achievement' | 'premium'

export interface CharacterDef {
  slug:        string
  name:        string
  tier:        CharacterTier
  abilityKey:  string
  description: string
}

export const CHARACTER_ROSTER: CharacterDef[] = [
  // ── 10 Base ────────────────────────────────────────────────────────────────
  { slug: 'el-arquitecto',         name: 'El Arquitecto',         tier: 'base',        abilityKey: 'ARCHITECT_DISCOUNT',      description: 'Descuento 10% al comprar propiedades' },
  { slug: 'la-mercader',           name: 'La Mercader',           tier: 'base',        abilityKey: 'MERCADER_CREDIT_BOOST',   description: '+20💰 extra cada vez que cobra renta' },
  { slug: 'el-energista',          name: 'El Energista',          tier: 'base',        abilityKey: 'ENERGIST_REGEN',          description: 'Regenera +1⚡ adicional por turno' },
  { slug: 'la-diplomata',          name: 'La Diplomata',          tier: 'base',        abilityKey: 'DIPLOMAT_PNA_FREE',       description: 'Primer PNA de cada partida sin coste' },
  { slug: 'el-saboteador',         name: 'El Saboteador',         tier: 'base',        abilityKey: 'SABOTEUR_SIEGE_CHEAP',    description: 'Coste de asedio reducido en 1⚡' },
  { slug: 'la-especuladora',       name: 'La Especuladora',       tier: 'base',        abilityKey: 'SPECULATOR_FLIP',         description: 'Puede vender propiedades al 70% (en vez de 50%)' },
  { slug: 'el-hacker',             name: 'El Hacker',             tier: 'base',        abilityKey: 'HACKER_PORTAL_SKIP',      description: 'Una vez por partida, teletransporte libre a cualquier portal' },
  { slug: 'la-contrabandista',     name: 'La Contrabandista',     tier: 'base',        abilityKey: 'SMUGGLER_TAX_EVADE',      description: 'Ignora el efecto CREDITS_TAX una vez por partida' },
  { slug: 'el-cronista',           name: 'El Cronista',           tier: 'base',        abilityKey: 'CHRONICLER_XP_DOUBLE',    description: 'XP ganado por eventos del gremio se duplica' },
  { slug: 'la-sintetizadora',      name: 'La Sintetizadora',      tier: 'base',        abilityKey: 'SYNTH_CLUSTER_FAST',      description: 'Bonificación de clúster activa con solo 2 tiles del mismo color' },

  // ── 8 Achievement ──────────────────────────────────────────────────────────
  { slug: 'el-conquistador',       name: 'El Conquistador',       tier: 'achievement', abilityKey: 'CONQUEROR_RENT_PLUS',     description: 'Renta +15% si posee más de 6 propiedades' },
  { slug: 'la-phoenix',            name: 'La Fénix',              tier: 'achievement', abilityKey: 'PHOENIX_REVIVE',          description: 'Se recupera de la quiebra una vez con 200💰' },
  { slug: 'el-oraculo',            name: 'El Oráculo',            tier: 'achievement', abilityKey: 'ORACLE_DICE_REROLL',      description: 'Una vez por turno puede re-tirar el dado' },
  { slug: 'la-tejedora',           name: 'La Tejedora',           tier: 'achievement', abilityKey: 'WEAVER_PNA_EXTEND',       description: 'Sus PNAs duran 7 turnos en vez de 5' },
  { slug: 'el-fantasma-del-vapor', name: 'El Fantasma del Vapor', tier: 'achievement', abilityKey: 'GHOST_TRAVERSE',          description: 'Puede atravesar tiles ocupados por otros jugadores' },
  { slug: 'la-arbitradora',        name: 'La Arbitradora',        tier: 'achievement', abilityKey: 'ARBITER_AUCTION_BONUS',   description: 'Pujas en subasta cuestan 10% menos' },
  { slug: 'el-ingeniero-viral',    name: 'El Ingeniero Viral',    tier: 'achievement', abilityKey: 'VIRAL_UPGRADE_SPREAD',    description: 'Al mejorar un tile, los adyacentes del mismo color suben gratis al nivel anterior' },
  { slug: 'la-sombra-del-nexo',   name: 'La Sombra del Nexo',    tier: 'achievement', abilityKey: 'NEXUS_SHADOW_STEAL',      description: 'Puede copiar el efecto del último evento gremial' },

  // ── 7 Premium ─────────────────────────────────────────────────────────────
  { slug: 'el-amo-del-caos',       name: 'El Amo del Caos',       tier: 'premium',     abilityKey: 'CHAOS_LORD_REROLL_ANY',   description: 'Puede forzar a cualquier jugador a re-tirar el dado (1×/partida)' },
  { slug: 'la-reina-de-circuitos', name: 'La Reina de Circuitos', tier: 'premium',     abilityKey: 'CIRCUIT_QUEEN_DOUBLE_UP', description: 'Una propiedad elegida genera renta doble permanente' },
  { slug: 'el-señor-del-tiempo',   name: 'El Señor del Tiempo',   tier: 'premium',     abilityKey: 'TIME_LORD_SKIP_COUNTDOWN','description': 'Puede saltar un evento countdown una vez por partida' },
  { slug: 'la-mente-colmena',      name: 'La Mente Colmena',      tier: 'premium',     abilityKey: 'HIVEMIND_COPY_CLUSTER',   description: 'Obtiene el bono de clúster de cualquier color aunque no sea suyo (1 color/turno)' },
  { slug: 'el-nodo-espectral',     name: 'El Nodo Espectral',     tier: 'premium',     abilityKey: 'SPECTRAL_NODE_IMMUNITY',  description: 'Inmune a estasis y asedios durante 3 turnos tras activarlo' },
  { slug: 'la-arquitecta-del-vacio', name: 'La Arquitecta del Vacío', tier: 'premium', abilityKey: 'VOID_ARCHITECT_BUILD',    description: 'Construye en tiles sin dueño como si fueran propios (sin pagar renta al pasar)' },
  { slug: 'el-ultimo-protocolo',   name: 'El Último Protocolo',   tier: 'premium',     abilityKey: 'LAST_PROTOCOL_SURGE',     description: 'A partir del turno 35, todas sus acciones cuestan 1⚡ menos' },
]

// ── Ability definitions ───────────────────────────────────────────────────────

export interface AbilityDef {
  key:     string
  passive: boolean
  apply:   (ctx: GameContext, playerId: string, params: Record<string, unknown>) => GameContext
}

const ABILITIES: Record<string, AbilityDef> = {
  ARCHITECT_DISCOUNT: {
    key: 'ARCHITECT_DISCOUNT', passive: false,
    apply: (ctx) => ({
      ...ctx,
      globalEffects: [...ctx.globalEffects, { key: 'ARCHITECT_DISCOUNT', turnsLeft: 1 }],
    }),
  },

  MERCADER_CREDIT_BOOST: {
    key: 'MERCADER_CREDIT_BOOST', passive: false,
    apply: (ctx) => ({
      ...ctx,
      globalEffects: [...ctx.globalEffects, { key: 'MERCADER_CREDIT_BOOST', turnsLeft: 1 }],
    }),
  },

  ENERGIST_REGEN: {
    key: 'ENERGIST_REGEN', passive: true,
    apply: (ctx, playerId) => ({
      ...ctx,
      players: {
        ...ctx.players,
        [playerId]: { ...ctx.players[playerId], energy: ctx.players[playerId].energy + 1 },
      },
    }),
  },

  DIPLOMAT_PNA_FREE: {
    key: 'DIPLOMAT_PNA_FREE', passive: false,
    apply: (ctx) => ({
      ...ctx,
      globalEffects: [...ctx.globalEffects, { key: 'DIPLOMAT_PNA_FREE', turnsLeft: 1 }],
    }),
  },

  SABOTEUR_SIEGE_CHEAP: {
    key: 'SABOTEUR_SIEGE_CHEAP', passive: true,
    apply: (ctx) => ctx,
  },

  SPECULATOR_FLIP: {
    key: 'SPECULATOR_FLIP', passive: false,
    apply: (ctx) => ({
      ...ctx,
      globalEffects: [...ctx.globalEffects, { key: 'SPECULATOR_FLIP', turnsLeft: 1 }],
    }),
  },

  HACKER_PORTAL_SKIP: {
    key: 'HACKER_PORTAL_SKIP', passive: false,
    apply: (ctx, playerId, params) => {
      const targetTileId = params.targetTileId as TileId | undefined
      if (!targetTileId) return ctx
      return {
        ...ctx,
        players: {
          ...ctx.players,
          [playerId]: { ...ctx.players[playerId], currentTileId: targetTileId },
        },
      }
    },
  },

  SMUGGLER_TAX_EVADE: {
    key: 'SMUGGLER_TAX_EVADE', passive: false,
    apply: (ctx) => ({
      ...ctx,
      globalEffects: [...ctx.globalEffects, { key: 'SMUGGLER_TAX_EVADE', turnsLeft: 1 }],
    }),
  },

  CHRONICLER_XP_DOUBLE: {
    key: 'CHRONICLER_XP_DOUBLE', passive: true,
    apply: (ctx, playerId) => ({
      ...ctx,
      players: {
        ...ctx.players,
        [playerId]: { ...ctx.players[playerId], xpEarned: ctx.players[playerId].xpEarned },
      },
    }),
  },

  SYNTH_CLUSTER_FAST: {
    key: 'SYNTH_CLUSTER_FAST', passive: true,
    apply: (ctx) => ctx,
  },

  CONQUEROR_RENT_PLUS: {
    key: 'CONQUEROR_RENT_PLUS', passive: true,
    apply: (ctx) => ctx,
  },

  PHOENIX_REVIVE: {
    key: 'PHOENIX_REVIVE', passive: false,
    apply: (ctx, playerId) => ({
      ...ctx,
      players: {
        ...ctx.players,
        [playerId]: { ...ctx.players[playerId], credits: ctx.players[playerId].credits + 200 },
      },
    }),
  },

  ORACLE_DICE_REROLL: {
    key: 'ORACLE_DICE_REROLL', passive: false,
    apply: (ctx) => ({
      ...ctx,
      globalEffects: [...ctx.globalEffects, { key: 'ORACLE_DICE_REROLL', turnsLeft: 1 }],
    }),
  },

  WEAVER_PNA_EXTEND: {
    key: 'WEAVER_PNA_EXTEND', passive: true,
    apply: (ctx) => ctx,
  },

  GHOST_TRAVERSE: {
    key: 'GHOST_TRAVERSE', passive: true,
    apply: (ctx) => ctx,
  },

  ARBITER_AUCTION_BONUS: {
    key: 'ARBITER_AUCTION_BONUS', passive: true,
    apply: (ctx) => ctx,
  },

  VIRAL_UPGRADE_SPREAD: {
    key: 'VIRAL_UPGRADE_SPREAD', passive: false,
    apply: (ctx) => ({
      ...ctx,
      globalEffects: [...ctx.globalEffects, { key: 'VIRAL_UPGRADE_SPREAD', turnsLeft: 1 }],
    }),
  },

  NEXUS_SHADOW_STEAL: {
    key: 'NEXUS_SHADOW_STEAL', passive: false,
    apply: (ctx, playerId, params) => {
      const card = params.card as { id: string; name: string; effectKey: string; probability: number } | undefined
      if (!card) return ctx
      return { ...ctx, lastEvent: card }
    },
  },

  CHAOS_LORD_REROLL_ANY: {
    key: 'CHAOS_LORD_REROLL_ANY', passive: false,
    apply: (ctx) => ({
      ...ctx,
      globalEffects: [...ctx.globalEffects, { key: 'CHAOS_LORD_REROLL_ANY', turnsLeft: 1 }],
    }),
  },

  CIRCUIT_QUEEN_DOUBLE_UP: {
    key: 'CIRCUIT_QUEEN_DOUBLE_UP', passive: false,
    apply: (ctx, _playerId, params) => {
      const tileId = params.tileId as TileId | undefined
      if (!tileId) return ctx
      return {
        ...ctx,
        globalEffects: [...ctx.globalEffects, { key: `DOUBLE_RENT:${tileId}` }],
      }
    },
  },

  TIME_LORD_SKIP_COUNTDOWN: {
    key: 'TIME_LORD_SKIP_COUNTDOWN', passive: false,
    apply: (ctx) => ({
      ...ctx,
      globalEffects: [...ctx.globalEffects, { key: 'TIME_LORD_SKIP_COUNTDOWN', turnsLeft: 1 }],
    }),
  },

  HIVEMIND_COPY_CLUSTER: {
    key: 'HIVEMIND_COPY_CLUSTER', passive: false,
    apply: (ctx, _playerId, params) => {
      const color = params.color as string | undefined
      if (!color) return ctx
      return {
        ...ctx,
        globalEffects: [...ctx.globalEffects, { key: `HIVEMIND_CLUSTER:${color}`, turnsLeft: 1 }],
      }
    },
  },

  SPECTRAL_NODE_IMMUNITY: {
    key: 'SPECTRAL_NODE_IMMUNITY', passive: false,
    apply: (ctx, playerId) => ({
      ...ctx,
      globalEffects: [...ctx.globalEffects, { key: `SPECTRAL_IMMUNITY:${playerId}`, turnsLeft: 3 }],
    }),
  },

  VOID_ARCHITECT_BUILD: {
    key: 'VOID_ARCHITECT_BUILD', passive: false,
    apply: (ctx) => ({
      ...ctx,
      globalEffects: [...ctx.globalEffects, { key: 'VOID_ARCHITECT_BUILD', turnsLeft: 1 }],
    }),
  },

  LAST_PROTOCOL_SURGE: {
    key: 'LAST_PROTOCOL_SURGE', passive: true,
    apply: (ctx) => ctx,
  },
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAbility(characterSlug: string): AbilityDef | undefined {
  const char = CHARACTER_ROSTER.find(c => c.slug === characterSlug)
  if (!char) return undefined
  return ABILITIES[char.abilityKey]
}

export function applyAbility(
  ctx: GameContext,
  playerId: string,
  abilityKey: string,
  params: Record<string, unknown>,
): GameContext {
  const ability = ABILITIES[abilityKey]
  if (!ability) throw new Error(`Unknown ability: ${abilityKey}`)
  return ability.apply(ctx, playerId, params)
}
