import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { checkAchievements } from '@/lib/achievements'
import { levelFromXp } from '@/engine/progression'
import { AchievementCheckBodySchema } from '@/engine/schemas'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await req.json()
  const parsed = AchievementCheckBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  }

  const { userId, stats } = parsed.data

  // Only allow users to check their own achievements
  if (session.user.id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch user's current achievements and XP
  const [user, earnedAchievements] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { xp: true, level: true } }),
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: { select: { slug: true } } },
    }),
  ])

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const earnedSlugs = earnedAchievements.map(ua => ua.achievement.slug)
  const newlyUnlocked = checkAchievements(stats, earnedSlugs)

  if (newlyUnlocked.length === 0) {
    return NextResponse.json({ unlocked: [], xpGained: 0, newLevel: user.level })
  }

  // Find or create achievement records and award XP
  let totalXpGained = 0
  const unlockedResults: Array<{ slug: string; name: string; xpReward: number; unlocksChar?: string }> = []

  for (const def of newlyUnlocked) {
    // Upsert achievement record
    const achievement = await prisma.achievement.upsert({
      where: { slug: def.slug },
      create: { slug: def.slug, name: def.name, description: def.description, xpReward: def.xpReward },
      update: {},
    })

    // Award achievement to user
    await prisma.userAchievement.createMany({
      data: [{ userId, achievementId: achievement.id }],
      skipDuplicates: true,
    })

    totalXpGained += def.xpReward

    // Unlock character if this achievement grants one
    if (def.unlocksCharSlug) {
      const char = await prisma.character.findUnique({ where: { slug: def.unlocksCharSlug } })
      if (char) {
        await prisma.userCharacter.createMany({
          data: [{ userId, characterId: char.id, source: 'ACHIEVEMENT' }],
          skipDuplicates: true,
        })
      }
    }

    unlockedResults.push({
      slug:        def.slug,
      name:        def.name,
      xpReward:    def.xpReward,
      unlocksChar: def.unlocksCharSlug,
    })
  }

  // Update user XP and level
  const newXp = user.xp + totalXpGained
  const newLevel = levelFromXp(newXp)

  await prisma.user.update({
    where: { id: userId },
    data: { xp: newXp, level: newLevel },
  })

  return NextResponse.json({
    unlocked:  unlockedResults,
    xpGained:  totalXpGained,
    newXp,
    newLevel,
    levelUp:   newLevel > user.level,
  })
}
