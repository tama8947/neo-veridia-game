import { describe, it, expect } from 'vitest'
import { xpForLevel, levelFromXp, xpToNextLevel, calcGameXp } from '../progression'
import { ACHIEVEMENT_DEFS, checkAchievements } from '../../lib/achievements'
import type { AchievementStats } from '../../lib/achievements'

// ── XP / Level ────────────────────────────────────────────────────────────────

describe('xpForLevel', () => {
  it('nivel 1 requiere 0 XP acumulado', () => expect(xpForLevel(1)).toBe(0))
  it('nivel 2 requiere más XP que nivel 1',  () => expect(xpForLevel(2)).toBeGreaterThan(0))
  it('nivel 10 requiere más XP que nivel 5', () => expect(xpForLevel(10)).toBeGreaterThan(xpForLevel(5)))
  it('niveles más altos requieren progresivamente más XP', () => {
    const gaps = [2, 3, 4, 5].map(l => xpForLevel(l) - xpForLevel(l - 1))
    expect(gaps[1]).toBeGreaterThan(gaps[0])
    expect(gaps[2]).toBeGreaterThan(gaps[1])
  })
})

describe('levelFromXp', () => {
  it('0 XP → nivel 1', () => expect(levelFromXp(0)).toBe(1))
  it('XP justo para nivel 2 → nivel 2', () => expect(levelFromXp(xpForLevel(2))).toBe(2))
  it('XP justo para nivel 5 → nivel 5', () => expect(levelFromXp(xpForLevel(5))).toBe(5))
  it('XP entre niveles → nivel inferior', () => {
    const midXp = Math.floor((xpForLevel(3) + xpForLevel(4)) / 2)
    expect(levelFromXp(midXp)).toBe(3)
  })
})

describe('xpToNextLevel', () => {
  it('retorna diferencia entre nivel actual y siguiente', () => {
    const currentXp = xpForLevel(3)
    const needed = xpToNextLevel(currentXp)
    expect(needed).toBe(xpForLevel(4) - xpForLevel(3))
  })
})

describe('calcGameXp', () => {
  const baseStats: AchievementStats = {
    won: false, consecutiveWins: 0, nucleusLandings: 0,
    clustersCompleted: 0, propertiesOwned: 0, totalGamesPlayed: 1,
    eliminations: 0, survivedTurn35: false, wonWithoutBuying: false,
    eliminatedBothSameTurn: false, completedAllColors: false,
  }

  it('ganar otorga más XP que perder', () => {
    const xpWin  = calcGameXp({ ...baseStats, won: true })
    const xpLose = calcGameXp({ ...baseStats, won: false })
    expect(xpWin).toBeGreaterThan(xpLose)
  })

  it('eliminar oponentes suma XP extra', () => {
    const xpNoElim = calcGameXp({ ...baseStats, won: true, eliminations: 0 })
    const xpElim   = calcGameXp({ ...baseStats, won: true, eliminations: 1 })
    expect(xpElim).toBeGreaterThan(xpNoElim)
  })

  it('clusters completados suman XP', () => {
    const xpNoCluster = calcGameXp({ ...baseStats, won: true, clustersCompleted: 0 })
    const xpCluster   = calcGameXp({ ...baseStats, won: true, clustersCompleted: 2 })
    expect(xpCluster).toBeGreaterThan(xpNoCluster)
  })

  it('retorna entero positivo siempre', () => {
    const xp = calcGameXp(baseStats)
    expect(Number.isInteger(xp)).toBe(true)
    expect(xp).toBeGreaterThan(0)
  })
})

// ── Achievements ──────────────────────────────────────────────────────────────

describe('ACHIEVEMENT_DEFS', () => {
  it('define al menos 20 logros', () => {
    expect(ACHIEVEMENT_DEFS.length).toBeGreaterThanOrEqual(20)
  })

  it('cada logro tiene slug, nombre y xpReward > 0', () => {
    for (const def of ACHIEVEMENT_DEFS) {
      expect(typeof def.slug).toBe('string')
      expect(def.slug.length).toBeGreaterThan(0)
      expect(typeof def.name).toBe('string')
      expect(def.xpReward).toBeGreaterThan(0)
    }
  })

  it('los slugs son únicos', () => {
    const slugs = ACHIEVEMENT_DEFS.map(d => d.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

describe('checkAchievements', () => {
  const noAchievements: string[] = []

  it('desbloquea FIRST_WIN al ganar por primera vez', () => {
    const stats: AchievementStats = {
      won: true, consecutiveWins: 1, nucleusLandings: 1,
      clustersCompleted: 0, propertiesOwned: 2, totalGamesPlayed: 1,
      eliminations: 0, survivedTurn35: false, wonWithoutBuying: false,
      eliminatedBothSameTurn: false, completedAllColors: false,
    }
    const unlocked = checkAchievements(stats, noAchievements)
    expect(unlocked.some(a => a.slug === 'first-win')).toBe(true)
  })

  it('no repite logros ya obtenidos', () => {
    const stats: AchievementStats = {
      won: true, consecutiveWins: 1, nucleusLandings: 1,
      clustersCompleted: 0, propertiesOwned: 2, totalGamesPlayed: 1,
      eliminations: 0, survivedTurn35: false, wonWithoutBuying: false,
      eliminatedBothSameTurn: false, completedAllColors: false,
    }
    const unlocked = checkAchievements(stats, ['first-win'])
    expect(unlocked.some(a => a.slug === 'first-win')).toBe(false)
  })

  it('desbloquea SURVIVOR al sobrevivir turno 35', () => {
    const stats: AchievementStats = {
      won: false, consecutiveWins: 0, nucleusLandings: 0,
      clustersCompleted: 0, propertiesOwned: 0, totalGamesPlayed: 5,
      eliminations: 0, survivedTurn35: true, wonWithoutBuying: false,
      eliminatedBothSameTurn: false, completedAllColors: false,
    }
    const unlocked = checkAchievements(stats, noAchievements)
    expect(unlocked.some(a => a.slug === 'survivor')).toBe(true)
  })

  it('desbloquea CLUSTER_MASTER al completar 3 clústers en una partida', () => {
    const stats: AchievementStats = {
      won: true, consecutiveWins: 1, nucleusLandings: 0,
      clustersCompleted: 3, propertiesOwned: 9, totalGamesPlayed: 2,
      eliminations: 0, survivedTurn35: false, wonWithoutBuying: false,
      eliminatedBothSameTurn: false, completedAllColors: false,
    }
    const unlocked = checkAchievements(stats, noAchievements)
    expect(unlocked.some(a => a.slug === 'cluster-master')).toBe(true)
  })

  it('desbloquea PROPERTY_MOGUL al tener 6+ propiedades', () => {
    const stats: AchievementStats = {
      won: false, consecutiveWins: 0, nucleusLandings: 0,
      clustersCompleted: 0, propertiesOwned: 6, totalGamesPlayed: 3,
      eliminations: 0, survivedTurn35: false, wonWithoutBuying: false,
      eliminatedBothSameTurn: false, completedAllColors: false,
    }
    const unlocked = checkAchievements(stats, noAchievements)
    expect(unlocked.some(a => a.slug === 'property-mogul')).toBe(true)
  })

  it('retorna array vacío si no se desbloquea nada nuevo', () => {
    const stats: AchievementStats = {
      won: false, consecutiveWins: 0, nucleusLandings: 0,
      clustersCompleted: 0, propertiesOwned: 0, totalGamesPlayed: 1,
      eliminations: 0, survivedTurn35: false, wonWithoutBuying: false,
      eliminatedBothSameTurn: false, completedAllColors: false,
    }
    const unlocked = checkAchievements(stats, noAchievements)
    expect(unlocked).toHaveLength(0)
  })

  it('puede desbloquear múltiples logros en la misma partida', () => {
    const stats: AchievementStats = {
      won: true, consecutiveWins: 1, nucleusLandings: 5,
      clustersCompleted: 3, propertiesOwned: 9, totalGamesPlayed: 1,
      eliminations: 1, survivedTurn35: true, wonWithoutBuying: false,
      eliminatedBothSameTurn: false, completedAllColors: false,
    }
    const unlocked = checkAchievements(stats, noAchievements)
    expect(unlocked.length).toBeGreaterThan(1)
  })
})
