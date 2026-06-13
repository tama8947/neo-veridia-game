'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { Player } from '@/engine/schemas'
import { hexToWorld } from './HexTile'

const PLAYER_COLORS = ['#00e5ff', '#ff4081', '#ffea00', '#69f0ae']

interface PlayerTokenProps {
  player: Player
  playerIndex: number
}

export function PlayerToken({ player, playerIndex }: PlayerTokenProps) {
  const meshRef = useRef<Mesh>(null)

  const [q, r] = player.currentTileId.split(',').map(Number)
  const [x, , z] = hexToWorld(q, r)

  // Small offset so multiple players on same tile don't overlap
  const offsetX = (playerIndex % 2) * 0.3 - 0.15
  const offsetZ = Math.floor(playerIndex / 2) * 0.3 - 0.15

  useFrame(() => {
    if (!meshRef.current) return
    // Bobbing animation
    meshRef.current.position.y = 0.3 + Math.sin(Date.now() * 0.003 + playerIndex) * 0.05
    // Slow rotation
    meshRef.current.rotation.y += 0.01
  })

  if (player.isEliminated) return null

  const color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length]

  return (
    <group position={[x + offsetX, 0.3, z + offsetZ]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>
      {/* Stasis indicator */}
      {player.isInStasis && (
        <mesh position={[0, 0.3, 0]}>
          <torusGeometry args={[0.22, 0.04, 8, 16]} />
          <meshBasicMaterial color="#546e7a" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}
