'use client'

import { useState } from 'react'
import { STORE_PRODUCTS, type StoreProduct } from '@/lib/store'

const TYPE_LABEL: Record<string, string> = {
  character:    'Personaje',
  board_skin:   'Skin',
  season_pass:  'Pase de Temporada',
  starter_pack: 'Pack',
}

const TYPE_BG: Record<string, string> = {
  character:    'bg-violet-900/60 border-violet-500/40',
  board_skin:   'bg-cyan-900/60 border-cyan-500/40',
  season_pass:  'bg-amber-900/60 border-amber-500/40',
  starter_pack: 'bg-emerald-900/60 border-emerald-500/40',
}

function ProductCard({ product }: { product: StoreProduct }) {
  const [loading, setLoading] = useState(false)

  async function handleBuy() {
    setLoading(true)
    try {
      const res  = await fetch('/api/store/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId: product.id }),
      })
      const data = await res.json() as { url?: string }
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  const bg = TYPE_BG[product.type] ?? 'bg-slate-900/60 border-white/10'

  return (
    <div className={`flex flex-col rounded-xl border p-4 ${bg}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-white leading-tight">{product.name}</h3>
        <span className="shrink-0 text-xs border border-white/30 text-white/60 rounded px-1.5 py-0.5">
          {TYPE_LABEL[product.type]}
        </span>
      </div>
      <p className="text-xs text-white/50 mb-4 flex-1">{product.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-amber-400">${product.priceUsd.toFixed(2)}</span>
        <button
          onClick={handleBuy}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors"
        >
          {loading ? 'Redirigiendo…' : 'Comprar'}
        </button>
      </div>
    </div>
  )
}

const FILTER_TYPES = ['all', 'character', 'board_skin', 'starter_pack'] as const
type FilterType = (typeof FILTER_TYPES)[number]

export default function StorePage() {
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = filter === 'all'
    ? STORE_PRODUCTS
    : STORE_PRODUCTS.filter(p => p.type === filter)

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-1 text-violet-300">Tienda Neo-Veridia</h1>
        <p className="text-white/50 mb-8 text-sm">Personajes premium, skins y packs de inicio</p>

        <div className="flex gap-2 mb-8 flex-wrap">
          {FILTER_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                filter === t
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'border-white/20 text-white/60 hover:border-white/40'
              }`}
            >
              {t === 'all' ? 'Todo' : TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </main>
  )
}
