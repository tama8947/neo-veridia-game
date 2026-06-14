import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import { auth } from '@/auth'

export const revalidate = 60

async function getLeaderboard() {
  return prisma.user.findMany({
    select: {
      id:    true,
      name:  true,
      image: true,
      elo:   true,
      level: true,
      xp:    true,
    },
    orderBy: { elo: 'desc' },
    take:    50,
  })
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>
  if (rank === 2) return <span className="text-xl">🥈</span>
  if (rank === 3) return <span className="text-xl">🥉</span>
  return <span className="text-white/40 text-sm w-6 text-center">{rank}</span>
}

export default async function LeaderboardPage() {
  const [session, users] = await Promise.all([auth(), getLeaderboard()])
  const currentUserId = session?.user?.id

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-1 text-cyan-300">Clasificación Global</h1>
        <p className="text-white/50 mb-8 text-sm">Top 50 por ELO — actualiza cada minuto</p>

        <div className="space-y-1">
          {users.map((user, i) => {
            const rank = i + 1
            const isMe = user.id === currentUserId
            return (
              <div
                key={user.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                  isMe
                    ? 'bg-violet-900/40 border-violet-500/60'
                    : 'bg-slate-900/60 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="w-8 flex justify-center">
                  <RankBadge rank={rank} />
                </div>

                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? 'avatar'}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-xs font-bold">
                    {(user.name ?? '?')[0]?.toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isMe ? 'text-violet-300' : 'text-white'}`}>
                    {user.name ?? 'Anónimo'}
                    {isMe && <span className="ml-2 text-xs text-violet-400">(tú)</span>}
                  </p>
                  <p className="text-xs text-white/40">Nivel {user.level}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-amber-400">{user.elo}</p>
                  <p className="text-xs text-white/40">ELO</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
