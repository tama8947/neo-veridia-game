'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import type { Mesh } from 'three'
import type { Tile, TileId } from '@/engine/schemas'

// Hex geometry constants (flat-top hexagon)
const HEX_SIZE = 0.95  // slightly smaller than 1 to show gaps
const HEX_HEIGHT = 0.12

// Color map for property districts
const DISTRICT_COLORS: Record<string, string> = {
  cyan:    '#00e5ff',
  sky:     '#40c4ff',
  lime:    '#c6ff00',
  emerald: '#00e676',
  amber:   '#ffca28',
  orange:  '#ff7043',
  rose:    '#f06292',
  fuchsia: '#e040fb',
  magenta: '#ea80fc',
  indigo:  '#536dfe',
  violet:  '#7c4dff',
  teal:    '#1de9b6',
}

const TILE_TYPE_COLORS: Record<string, string> = {
  nucleus:     '#ffffff',
  stasis:      '#546e7a',
  portal:      '#00bcd4',
  guild_event: '#ffd600',
  dark_district: '#212121',
}

// Axial to 3D world position (flat-top hex layout)
export function hexToWorld(q: number, r: number): [number, number, number] {
  const x = HEX_SIZE * 1.5 * q
  const z = HEX_SIZE * Math.sqrt(3) * (r + q / 2)
  return [x, 0, z]
}

interface HexTileProps {
  tile: Tile
  tileId: TileId
  isSelected?: boolean
  isAvailable?: boolean
  onClick?: (tileId: TileId) => void
}

export function HexTile({ tile, tileId, isSelected, isAvailable, onClick }: HexTileProps) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const [q, r] = tileId.split(',').map(Number)
  const [x, y, z] = hexToWorld(q, r)

  const baseColor = tile.color
    ? DISTRICT_COLORS[tile.color]
    : TILE_TYPE_COLORS[tile.type] ?? '#444444'

  // Pulse animation for available paths
  useFrame((_, delta) => {
    if (!meshRef.current) return
    if (isAvailable) {
      meshRef.current.position.y = Math.sin(Date.now() * 0.004) * 0.04
    } else if (tile.type === 'nucleus') {
      meshRef.current.position.y = Math.sin(Date.now() * 0.002) * 0.02
    } else {
      meshRef.current.position.y = 0
    }
  })

  const emissiveIntensity = tile.isUnderSiege ? 0.8 : isSelected ? 0.5 : hovered ? 0.3 : isAvailable ? 0.4 : 0.05

  return (
    <group position={[x, y, z]}>
      <mesh
        ref={meshRef}
        onClick={() => onClick?.(tileId)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[HEX_SIZE, HEX_SIZE, HEX_HEIGHT, 6]} />
        <meshStandardMaterial
          color={tile.isUnderSiege ? '#ff1744' : baseColor}
          emissive={tile.isUnderSiege ? '#ff1744' : isAvailable ? '#ffffff' : baseColor}
          emissiveIntensity={emissiveIntensity}
          metalness={tile.upgradeLevel > 0 ? 0.6 : 0.2}
          roughness={tile.upgradeLevel > 0 ? 0.2 : 0.7}
        />
      </mesh>

      {/* Upgrade level indicator */}
      {tile.upgradeLevel > 0 && (
        <Text
          position={[0, HEX_HEIGHT + 0.08, 0]}
          fontSize={0.22}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {'★'.repeat(tile.upgradeLevel)}
        </Text>
      )}

      {/* Owner indicator ring */}
      {tile.ownerId && !tile.isMortgaged && (
        <mesh position={[0, HEX_HEIGHT + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[HEX_SIZE * 0.7, HEX_SIZE * 0.85, 6]} />
          <meshBasicMaterial color={baseColor} transparent opacity={0.6} />
        </mesh>
      )}

      {/* Mortgaged overlay */}
      {tile.isMortgaged && (
        <mesh position={[0, HEX_HEIGHT + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[HEX_SIZE * 0.5, 6]} />
          <meshBasicMaterial color="#333333" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}
