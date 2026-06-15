import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { nanoid } from 'nanoid'
import { PushOptIn } from '@/components/PushOptIn'

export default async function LobbyPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const activeGames = await prisma.game.findMany({
    where: {
      status: { in: ['WAITING', 'IN_PROGRESS'] },
      OR: [{ player1Id: userId }, { player2Id: userId }, { player3Id: userId }],
    },
    orderBy: { startedAt: 'desc' },
    take: 10,
  })

  const recentFinished = await prisma.game.findMany({
    where: {
      status: 'FINISHED',
      OR: [{ player1Id: userId }, { player2Id: userId }, { player3Id: userId }],
    },
    orderBy: { endedAt: 'desc' },
    take: 5,
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, xp: true, level: true, elo: true },
  })

  return (
    <div className="min-h-dvh bg-[#0a0a0f] text-white font-mono">
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <span className="text-cyan-400 font-bold text-lg tracking-wider">NEO-VERIDIA</span>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <Link href="/store"       className="text-white/50 hover:text-violet-300 transition-colors text-xs">Tienda</Link>
          <Link href="/leaderboard" className="text-white/50 hover:text-cyan-300 transition-colors text-xs">Clasificación</Link>
          <Link href="/friends"     className="text-white/50 hover:text-emerald-300 transition-colors text-xs">Amigos</Link>
          <span className="text-white/20">|</span>
          <span className="text-white/60">{session.user.name}</span>
          <span className="text-amber-400">⚡ Lv.{user?.level ?? 1}</span>
          <span className="text-cyan-400">ELO {user?.elo ?? 1000}</span>
          <PushOptIn />
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
            <button type="submit" className="text-white/30 hover:text-white/60 transition-colors text-xs">
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Sala de espera</h2>
          <CreateRoomButton userId={userId} />
        </div>

        <div className="p-4 rounded-xl border border-cyan-400/30 bg-cyan-400/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-cyan-400">Modo demo (1 jugador)</div>
              <div className="text-white/50 text-xs mt-1">Prueba el tablero sin servidor</div>
            </div>
            <Link
              href="/demo"
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-400 rounded-full text-sm transition-colors"
            >
              Jugar demo →
            </Link>
          </div>
        </div>

        {/* Active games */}
        <div className="flex flex-col gap-3">
          <h3 className="text-white/50 text-xs uppercase tracking-widest">Partidas activas</h3>
          {activeGames.length === 0 ? (
            <p className="text-white/30 text-sm py-6 text-center">
              No hay partidas activas. ¡Crea una nueva sala!
            </p>
          ) : (
            activeGames.map(game => (
              <Link
                key={game.id}
                href={`/room/${game.roomId}`}
                className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div>
                  <div className="font-bold text-sm">Sala {game.roomId.slice(0, 8)}…</div>
                  <div className="text-white/40 text-xs mt-1">
                    {game.mode} · {game.status === 'WAITING' ? 'Esperando jugadores' : 'En progreso'}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${
                  game.status === 'WAITING'
                    ? 'border-amber-400/40 text-amber-400'
                    : 'border-emerald-400/40 text-emerald-400'
                }`}>
                  {game.status === 'WAITING' ? '⏳ Espera' : '▶ Jugando'}
                </span>
              </Link>
            ))
          )}
        </div>

        {/* Recent finished with replay links */}
        {recentFinished.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-white/50 text-xs uppercase tracking-widest">Partidas recientes</h3>
            {recentFinished.map(game => (
              <div
                key={game.id}
                className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-slate-900/30"
              >
                <div>
                  <div className="font-bold text-sm text-white/60">Sala {game.roomId.slice(0, 8)}…</div>
                  <div className="text-white/30 text-xs mt-1">
                    {game.mode}
                    {game.winnerUserId === userId ? ' · 🏆 Victoria' : ' · Derrota'}
                    {game.totalTurns ? ` · ${game.totalTurns} turnos` : ''}
                  </div>
                </div>
                <Link
                  href={`/room/${game.roomId}/replay`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-900/20 transition-colors"
                >
                  Ver replay →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function CreateRoomButton({ userId }: { userId: string }) {
  const action = async () => {
    'use server'
    const roomId = nanoid(10)
    await prisma.game.create({
      data: { roomId, mode: 'DUEL', status: 'WAITING', player1Id: userId },
    })
    redirect(`/room/${roomId}`)
  }

  return (
    <form action={action}>
      <button
        type="submit"
        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full text-sm transition-colors"
      >
        + Nueva sala
      </button>
    </form>
  )
}
