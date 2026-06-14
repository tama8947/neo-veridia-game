// Achievement definitions + unlock checker
// Prisma boundary: this file is pure logic — no DB calls

export interface AchievementStats {
  won:                    boolean
  consecutiveWins:        number
  nucleusLandings:        number
  clustersCompleted:      number
  propertiesOwned:        number
  totalGamesPlayed:       number
  eliminations:           number
  survivedTurn35:         boolean
  wonWithoutBuying:       boolean
  eliminatedBothSameTurn: boolean
  completedAllColors:     boolean
}

export interface AchievementDef {
  slug:            string
  name:            string
  description:     string
  xpReward:        number
  unlocksCharSlug?: string
  check:           (stats: AchievementStats) => boolean
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    slug: 'first-win',
    name: 'Primera Victoria',
    description: 'Gana tu primera partida.',
    xpReward: 200,
    unlocksCharSlug: 'el-conquistador',
    check: s => s.won && s.totalGamesPlayed >= 1,
  },
  {
    slug: 'survivor',
    name: 'Superviviente',
    description: 'Sobrevive hasta el turno 35.',
    xpReward: 150,
    unlocksCharSlug: 'el-fantasma-del-vapor',
    check: s => s.survivedTurn35,
  },
  {
    slug: 'cluster-master',
    name: 'Maestro del Clúster',
    description: 'Completa 3 clústers en una sola partida.',
    xpReward: 300,
    unlocksCharSlug: 'el-ingeniero-viral',
    check: s => s.clustersCompleted >= 3,
  },
  {
    slug: 'property-mogul',
    name: 'Magnate Urbano',
    description: 'Posee 6 o más propiedades simultáneamente.',
    xpReward: 250,
    unlocksCharSlug: 'la-tejedora',
    check: s => s.propertiesOwned >= 6,
  },
  {
    slug: 'cause-bankruptcy',
    name: 'Implacable',
    description: 'Provoca la quiebra de otro jugador.',
    xpReward: 200,
    unlocksCharSlug: 'la-arbitradora',
    check: s => s.eliminations >= 1,
  },
  {
    slug: 'no-buy-win',
    name: 'Estrategia del Vacío',
    description: 'Gana una partida sin comprar ninguna propiedad.',
    xpReward: 400,
    unlocksCharSlug: 'la-sombra-del-nexo',
    check: s => s.won && s.wonWithoutBuying,
  },
  {
    slug: 'nucleus-farmer',
    name: 'Agricultor del Núcleo',
    description: 'Aterriza en el núcleo 5 o más veces en una partida.',
    xpReward: 125,
    check: s => s.nucleusLandings >= 5,
  },
  {
    slug: 'double-eliminator',
    name: 'Exterminador',
    description: 'Elimina a dos jugadores en la misma partida.',
    xpReward: 350,
    check: s => s.eliminations >= 2,
  },
  {
    slug: 'same-turn-sweep',
    name: 'Golpe Sincronizado',
    description: 'Elimina a dos jugadores en el mismo turno.',
    xpReward: 500,
    check: s => s.eliminatedBothSameTurn,
  },
  {
    slug: 'color-collector',
    name: 'Coleccionista Total',
    description: 'Posee los 3 tiles de 2 colores distintos en una partida.',
    xpReward: 200,
    check: s => s.clustersCompleted >= 2,
  },
  {
    slug: 'chromatic-domination',
    name: 'Dominación Cromática',
    description: 'Completa todos los colores disponibles del tablero.',
    xpReward: 1000,
    check: s => s.completedAllColors,
  },
  {
    slug: 'consecutive-wins-3',
    name: 'Racha Imparable',
    description: 'Gana 3 partidas consecutivas.',
    xpReward: 400,
    unlocksCharSlug: 'el-oraculo',
    check: s => s.consecutiveWins >= 3,
  },
  {
    slug: 'veteran-10',
    name: 'Veterano',
    description: 'Juega 10 partidas.',
    xpReward: 300,
    check: s => s.totalGamesPlayed >= 10,
  },
  {
    slug: 'centurion',
    name: 'Centurión',
    description: 'Juega 100 partidas.',
    xpReward: 1500,
    check: s => s.totalGamesPlayed >= 100,
  },
  {
    slug: 'first-cluster',
    name: 'Primer Clúster',
    description: 'Completa tu primer clúster de color.',
    xpReward: 75,
    check: s => s.clustersCompleted >= 1,
  },
  {
    slug: 'energy-rich',
    name: 'Reserva Energética',
    description: 'Termina una partida con 20 o más de energía.',
    xpReward: 100,
    check: () => false, // checked server-side with final energy value
  },
  {
    slug: 'speedrun',
    name: 'Velocista',
    description: 'Gana una partida antes del turno 25.',
    xpReward: 450,
    check: () => false, // checked server-side with totalTurns
  },
  {
    slug: 'diplomatic',
    name: 'Diplomático',
    description: 'Mantén un PNA activo por 10 o más turnos en total.',
    xpReward: 150,
    check: () => false, // tracked separately
  },
  {
    slug: 'auctioneer',
    name: 'Rematador',
    description: 'Gana 3 subastas en una misma partida.',
    xpReward: 200,
    check: () => false, // tracked separately
  },
  {
    slug: 'peaceful',
    name: 'Pacifista',
    description: 'Completa una partida sin romper ningún PNA.',
    xpReward: 175,
    check: () => false, // tracked separately
  },
]

// Returns newly unlocked achievements (not already in earnedSlugs)
export function checkAchievements(
  stats: AchievementStats,
  earnedSlugs: string[],
): AchievementDef[] {
  const earnedSet = new Set(earnedSlugs)
  return ACHIEVEMENT_DEFS.filter(
    def => !earnedSet.has(def.slug) && def.check(stats)
  )
}
