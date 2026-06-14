import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect('/lobby')

  return (
    <div className="min-h-dvh bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm max-w-sm w-full mx-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-cyan-400 font-mono tracking-wider">NEO-VERIDIA</h1>
          <p className="mt-2 text-white/50 text-sm">Civilización hexagonal · Cyberpunk · Estrategia</p>
        </div>

        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
          <div className="relative w-full h-full rounded-full bg-cyan-500/30 border border-cyan-400/50 flex items-center justify-center text-2xl">
            ⬡
          </div>
        </div>

        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/lobby' })
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-colors text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar con Google
          </button>
        </form>

        <p className="text-white/30 text-xs text-center">
          Al entrar aceptas los términos de servicio.<br />
          Datos mínimos: email y nombre.
        </p>
      </div>
    </div>
  )
}
