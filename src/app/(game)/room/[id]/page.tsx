import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RoomClientLoader } from './RoomClientLoader'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RoomPage({ params }: Props) {
  const { id: roomId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const game = await prisma.game.findUnique({
    where: { roomId },
    select: { status: true, player1Id: true, player2Id: true, player3Id: true },
  })

  if (!game) redirect('/lobby')

  const playerIds = [game.player1Id, game.player2Id, game.player3Id].filter(Boolean)
  const isParticipant = playerIds.includes(session.user.id)

  if (!isParticipant) {
    if (playerIds.length >= 3 || game.status !== 'WAITING') redirect('/lobby')
  }

  // Find user's unlocked character, default to first base character
  const userChar = await prisma.userCharacter.findFirst({
    where: { userId: session.user.id },
    include: { character: true },
  })

  const characterSlug = userChar?.character.slug ?? 'el-arquitecto'

  return (
    <RoomClientLoader
      roomId={roomId}
      userId={session.user.id}
      userName={session.user.name ?? 'Jugador'}
      characterSlug={characterSlug}
    />
  )
}
