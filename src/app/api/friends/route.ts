import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const friendships = await prisma.friendship.findMany({
    where: { userId: session.user.id },
    include: {
      friend: { select: { id: true, name: true, image: true, elo: true, level: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ friends: friendships.map(f => f.friend) })
}

const AddFriendSchema = z.object({ friendId: z.string() })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const body: unknown = await req.json()
  const parsed = AddFriendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { friendId } = parsed.data
  if (friendId === userId) return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 })

  const friendExists = await prisma.user.findUnique({ where: { id: friendId }, select: { id: true } })
  if (!friendExists) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const already = await prisma.friendship.findFirst({ where: { userId, friendId } })
  if (already) return NextResponse.json({ error: 'Already friends' }, { status: 409 })

  await prisma.friendship.createMany({
    data: [
      { userId, friendId },
      { userId: friendId, friendId: userId },
    ],
    skipDuplicates: true,
  })

  return NextResponse.json({ ok: true })
}
