'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial } from 'three'
import type { GameContext, TileId } from '@/engine/schemas'
import { checkCluster } from '@/engine/economy'
import { hexToWorld } from './HexTile'
import { coordsFromTileId } from '@/engine/board'

const COLOR_HEX: Record<string, string> = {
  cyan: '#00e5ff', sky: '#38bdf8', lime: '#a3e635', emerald: '#34d399',
  amber: '#fbbf24', orange: '#fb923c', rose: '#fb7185', fuchsia: '#e879f9',
  magenta: '#f0abfc', indigo: '#818cf8', violet: '#a78bfa', teal: '#2dd4bf',
}

function ClusterPulse({ tileId, color }: { tileId: TileId; color: string }) {
  const meshRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    meshRef.current.scale.setScalar(1 + Math.sin(t * 2.5) * 0.08)
    const mat = (meshRef.current.material as MeshStandardMaterial)
    mat.emissiveIntensity = 1.2 + Math.sin(t * 2.5) * 0.6
  })

  const { q, r } = coordsFromTileId(tileId)
  const [wx, , wz] = hexToWorld(q, r)
  const hex = COLOR_HEX[color] ?? '#ffffff'

  return (
    <mesh ref={meshRef} position={[wx, 0.28, wz]}>
      <cylinderGeometry args={[0.52, 0.52, 0.04, 6]} />
      <meshStandardMaterial
        color={hex}
        emissive={hex}
        emissiveIntensity={1.2}
        transparent
        opacity={0.35}
      />
    </mesh>
  )
}

interface ClusterGlowProps {
  context: GameContext
}

export function ClusterGlow({ context }: ClusterGlowProps) {
  const clusterTileIds = useMemo(() => {
    const result: Array<{ tileId: TileId; color: string }> = []
    const seen = new Set<string>()

    for (const [id, tile] of Object.entries(context.tiles)) {
      if (tile.type !== 'property' || !tile.ownerId || !tile.color) continue
      const key = `${tile.ownerId}-${tile.color}`
      if (seen.has(key)) continue
      if (checkCluster(context.tiles, tile.ownerId, tile.color)) {
        seen.add(key)
        // Add all 3 tiles of this cluster
        Object.entries(context.tiles)
          .filter(([, t]) => t.color === tile.color && t.ownerId === tile.ownerId)
          .forEach(([tid]) => result.push({ tileId: tid as TileId, color: tile.color! }))
      }
    }
    return result
  }, [context.tiles])

  if (clusterTileIds.length === 0) return null

  return (
    <>
      {clusterTileIds.map(({ tileId, color }) => (
        <ClusterPulse key={tileId} tileId={tileId} color={color} />
      ))}
    </>
  )
}
