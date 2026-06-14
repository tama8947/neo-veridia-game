import { XP_REWARDS } from './constants'
import type { AchievementStats } from '../lib/achievements'

// ── Level curve: XP required to reach each level ─────────────────────────────
// Formula: xpForLevel(n) = 100 * (n-1)^1.6  (quadratic-ish growth)

export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.round(100 * Math.pow(level - 1, 1.6))
}

export function levelFromXp(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  return level
}

export function xpToNextLevel(currentXp: number): number {
  const currentLevel = levelFromXp(currentXp)
  return xpForLevel(currentLevel + 1) - xpForLevel(currentLevel)
}

// ── Game XP calculation ───────────────────────────────────────────────────────

export function calcGameXp(stats: AchievementStats): number {
  let xp = 0

  xp += stats.won ? XP_REWARDS.WIN : XP_REWARDS.LOSE
  xp += stats.eliminations  * XP_REWARDS.CAUSE_BANKRUPTCY
  xp += stats.clustersCompleted * XP_REWARDS.CLUSTER_COMPLETE
  if (stats.survivedTurn35) xp += XP_REWARDS.SURVIVE_TURN_35

  return Math.max(1, Math.round(xp))
}
