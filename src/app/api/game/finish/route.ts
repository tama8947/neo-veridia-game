import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { FinishGameBodySchema } from '@/engine/schemas'
import { calcGameXp } from '@/engine/progression'
import { levelFromXp } from '@/engine/progression'
import { ELO_K_FACTOR } from '@/engine/constants'

// Called by PartyKit at game end (uses PARTYKIT_SECRET to verify)
export async function POST(req: Request) {
  const secret = req.headers.get('x-partykit-secret')
  if (secret !== process.env.PARTYKIT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await req.json()
  const parsed = FinishGameBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  }

  const { roomId, winnerUserId, players, totalTurns, replayFrames } = parsed.data

  // Fetch current ELO for all players
  const userIds = players.map(p => p.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, xp: true, level: true, elo: true },
  })
  const userMap = Object.fromEntries(users.map(u => [u.id, u]))

  // Update game record
  await prisma.game.update({
    where: { roomId },
    data: {
      status:       'FINISHED',
      endedAt:      new Date(),
      winnerUserId,
      totalTurns,
      replayFrames: (replayFrames ?? []) as object[],
    },
  }).catch(() => null) // ignore if game not found (demo mode)

  // Award XP and update ELO for each player
  for (const p of players) {
    const user = userMap[p.userId]
    if (!user) continue

    const won = p.userId === winnerUserId
    const gameXp = calcGameXp({
      won,
      consecutiveWins: 0, // resolved separately via stats tracking
      nucleusLandings: 0,
      clustersCompleted: 0,
      propertiesOwned: 0,
      totalGamesPlayed: 1,
      eliminations: 0,
      survivedTurn35: totalTurns >= 35,
      wonWithoutBuying: false,
      eliminatedBothSameTurn: false,
      completedAllColors: false,
    })

    const totalXp = user.xp + gameXp + p.xpEarned
    const newLevel = levelFromXp(totalXp)

    // Simple ELO: winner gains points from losers
    const opponents = players.filter(op => op.userId !== p.userId)
    let eloDelta = 0
    for (const opp of opponents) {
      const oppUser = userMap[opp.userId]
      if (!oppUser) continue
      const expectedScore = 1 / (1 + Math.pow(10, (oppUser.elo - user.elo) / 400))
      const actualScore = won ? 1 : 0
      eloDelta += Math.round(ELO_K_FACTOR * (actualScore - expectedScore))
    }

    await prisma.user.update({
      where: { id: p.userId },
      data: {
        xp:    totalXp,
        level: newLevel,
        elo:   Math.max(0, user.elo + eloDelta),
      },
    })
  }

  return NextResponse.json({ ok: true })
}
