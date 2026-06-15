import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { ReplayFrame } from '@/lib/replay'
import { ReplayViewer } from '@/components/replay/ReplayViewer'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReplayPage({ params }: Props) {
  const { id: roomId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const game = await prisma.game.findUnique({
    where:  { roomId },
    select: { status: true, replayFrames: true, endedAt: true, totalTurns: true },
  })

  if (!game || game.status !== 'FINISHED') {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 mb-4">Replay no disponible para esta partida.</p>
          <Link href="/lobby" className="text-cyan-400 text-sm hover:underline">← Volver al lobby</Link>
        </div>
      </main>
    )
  }

  const frames = (game.replayFrames ?? []) as unknown as ReplayFrame[]

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/lobby" className="text-white/40 hover:text-white/70 text-sm">← Lobby</Link>
          <h1 className="text-2xl font-bold text-violet-300">Replay</h1>
          <span className="text-white/30 text-sm">
            {game.totalTurns ? `${game.totalTurns} turnos` : ''}
            {game.endedAt ? ` · ${new Date(game.endedAt).toLocaleDateString('es')}` : ''}
          </span>
        </div>

        {frames.length === 0 ? (
          <p className="text-white/40 text-sm">Esta partida no tiene frames de replay guardados.</p>
        ) : (
          <ReplayViewer frames={frames} />
        )}
      </div>
    </main>
  )
}
