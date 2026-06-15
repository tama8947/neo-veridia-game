import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'

async function getFriends(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { userId },
    include: {
      friend: { select: { id: true, name: true, image: true, elo: true, level: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(r => r.friend)
}

async function searchUser(query: string) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: query },
        { id:    query },
      ],
    },
    select: { id: true, name: true, image: true, elo: true, level: true },
  })
}

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; added?: string; error?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const sp = await searchParams
  const query = sp.q?.trim() ?? ''

  const [friends, found] = await Promise.all([
    getFriends(userId),
    query ? searchUser(query) : Promise.resolve(null),
  ])

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/lobby" className="text-white/40 hover:text-white/70 text-sm">← Lobby</Link>
          <h1 className="text-3xl font-bold text-emerald-300">Amigos</h1>
        </div>

        {/* Add friend form */}
        <div className="mb-8 rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-white/70 mb-3">Añadir amigo</h2>
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={query}
              placeholder="ID de usuario o email"
              className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/60"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white transition-colors"
            >
              Buscar
            </button>
          </form>

          {sp.added === '1' && (
            <p className="mt-3 text-xs text-emerald-400">¡Amigo añadido correctamente!</p>
          )}
          {sp.error === 'not_found' && (
            <p className="mt-3 text-xs text-red-400">Usuario no encontrado.</p>
          )}
          {sp.error === 'already' && (
            <p className="mt-3 text-xs text-amber-400">Ya sois amigos.</p>
          )}
          {sp.error === 'self' && (
            <p className="mt-3 text-xs text-red-400">No puedes añadirte a ti mismo.</p>
          )}

          {/* Search result */}
          {found && (
            <div className="mt-3 flex items-center gap-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20">
              {found.image ? (
                <Image src={found.image} alt="" width={32} height={32} className="rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold">
                  {(found.name ?? '?')[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{found.name ?? 'Anónimo'}</p>
                <p className="text-xs text-white/40">ELO {found.elo} · Nivel {found.level}</p>
              </div>
              <form action={async () => {
                'use server'
                if (!session.user?.id) return
                if (found.id === session.user.id) { redirect('/friends?error=self') }
                const already = await prisma.friendship.findFirst({ where: { userId: session.user.id, friendId: found.id } })
                if (already) { redirect('/friends?error=already') }
                await prisma.friendship.createMany({
                  data: [
                    { userId: session.user.id, friendId: found.id },
                    { userId: found.id, friendId: session.user.id },
                  ],
                  skipDuplicates: true,
                })
                redirect('/friends?added=1')
              }}>
                <button
                  type="submit"
                  className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors"
                >
                  + Añadir
                </button>
              </form>
            </div>
          )}

          {query && !found && !sp.added && (
            <p className="mt-3 text-xs text-white/40">Sin resultados para «{query}»</p>
          )}
        </div>

        {/* Friends list */}
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Tus amigos ({friends.length})
        </h2>

        {friends.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">Aún no tienes amigos. ¡Añade uno!</p>
        ) : (
          <div className="space-y-1">
            {friends.map(friend => (
              <div
                key={friend.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/5 bg-slate-900/60"
              >
                {friend.image ? (
                  <Image src={friend.image} alt="" width={32} height={32} className="rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-xs font-bold">
                    {(friend.name ?? '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{friend.name ?? 'Anónimo'}</p>
                  <p className="text-xs text-white/40">ELO {friend.elo} · Nivel {friend.level}</p>
                </div>
                <form action={async () => {
                  'use server'
                  if (!session.user?.id) return
                  await prisma.friendship.deleteMany({
                    where: {
                      OR: [
                        { userId: session.user.id, friendId: friend.id },
                        { userId: friend.id, friendId: session.user.id },
                      ],
                    },
                  })
                  redirect('/friends')
                }}>
                  <button
                    type="submit"
                    className="text-xs text-white/30 hover:text-red-400 transition-colors px-2 py-1"
                  >
                    Eliminar
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
