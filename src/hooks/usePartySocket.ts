'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import PartySocket from 'partysocket'
import type { GameContext, GameIntent } from '@/engine/schemas'
import type { ServerMsg, ClientMsg } from '../../party/room'

interface UsePartySocketOptions {
  roomId: string
  userId: string
  characterSlug: string
}

interface PartySocketState {
  context: GameContext | null
  status: 'connecting' | 'joined' | 'started' | 'finished' | 'error'
  error: string | null
  playerCount: number
}

export function usePartySocket({ roomId, userId, characterSlug }: UsePartySocketOptions) {
  const [state, setState] = useState<PartySocketState>({
    context: null,
    status: 'connecting',
    error: null,
    playerCount: 0,
  })

  const socketRef = useRef<PartySocket | null>(null)

  useEffect(() => {
    const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'localhost:1999'

    const socket = new PartySocket({
      host,
      room: roomId,
      query: { userId },
    })

    socketRef.current = socket

    socket.addEventListener('open', () => {
      const joinMsg: ClientMsg = { type: 'JOIN', userId, characterSlug }
      socket.send(JSON.stringify(joinMsg))
    })

    socket.addEventListener('message', (event: MessageEvent) => {
      let msg: ServerMsg
      try {
        msg = JSON.parse(event.data as string) as ServerMsg
      } catch {
        return
      }

      switch (msg.type) {
        case 'GAME_STATE':
          setState(s => ({
            ...s,
            context: msg.context,
            status: s.status === 'started' ? 'started' : s.status,
          }))
          break

        case 'PLAYER_JOINED':
          setState(s => ({ ...s, playerCount: s.playerCount + 1 }))
          break

        case 'GAME_STARTED':
          setState(s => ({ ...s, status: 'started' }))
          break

        case 'GAME_OVER':
          setState(s => ({ ...s, status: 'finished' }))
          break

        case 'ERROR':
          setState(s => ({ ...s, error: msg.message }))
          break
      }
    })

    socket.addEventListener('close', () => {
      setState(s => ({ ...s, status: 'error', error: 'Connection lost' }))
    })

    return () => socket.close()
  }, [roomId, userId, characterSlug])

  const sendIntent = useCallback((intent: GameIntent) => {
    if (!socketRef.current) return
    const msg: ClientMsg = { type: 'INTENT', intent, senderId: userId }
    socketRef.current.send(JSON.stringify(msg))
  }, [userId])

  const startGame = useCallback(() => {
    if (!socketRef.current) return
    const msg: ClientMsg = { type: 'START_GAME' }
    socketRef.current.send(JSON.stringify(msg))
  }, [])

  return { ...state, sendIntent, startGame }
}
