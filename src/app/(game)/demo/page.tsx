import dynamic from 'next/dynamic'

// R3F nunca corre en SSR — regla de AGENTS.md
const GameDemo = dynamic(
  () => import('./GameDemo').then(m => m.GameDemo),
  { ssr: false, loading: () => <div className="w-full h-dvh bg-[#0a0a0f] flex items-center justify-center text-cyan-400">Cargando Neo-Veridia...</div> }
)

export default function DemoPage() {
  return <GameDemo />
}
