'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import type { Mesh } from 'three'

interface NucleusCoreProps {
  currentTurn: number
  maxTurns: number
}

export function NucleusCore({ currentTurn, maxTurns }: NucleusCoreProps) {
  const ringRef = useRef<Mesh>(null)
  const urgency = currentTurn / maxTurns // 0→1 as game progresses

  useFrame(() => {
    if (!ringRef.current) return
    // Pulse faster as game approaches end
    const speed = 0.003 + urgency * 0.01
    ringRef.current.rotation.y += speed
    ringRef.current.scale.setScalar(1 + Math.sin(Date.now() * speed * 2) * 0.05)
  })

  const ringColor = urgency > 0.75 ? '#ff1744' : urgency > 0.5 ? '#ff6d00' : '#00e5ff'

  return (
    <group position={[0, 0.2, 0]}>
      {/* Rotating energy ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.06, 8, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.9} />
      </mesh>
      {/* Turn counter */}
      <Text
        position={[0, 0.25, 0]}
        fontSize={0.28}
        color={ringColor}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {`${currentTurn}/${maxTurns}`}
      </Text>
    </group>
  )
}
