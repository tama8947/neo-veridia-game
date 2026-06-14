import type * as Party from 'partykit/server'
import { createActor } from 'xstate'
import { gameMachine, createInitialContext } from '../src/engine/game-machine'
import { IntentSchema } from '../src/engine/schemas'
import type { GameContext } from '../src/engine/schemas'
import { chooseIntent } from '../src/engine/ai/ai-player'

// ── Message types (client ↔ PartyKit) ────────────────────────────────────────

export type ServerMsg =
  | { type: 'GAME_STATE'; context: GameContext }
  | { type: 'ERROR'; message: string }
  | { type: 'PLAYER_JOINED'; playerId: string }
  | { type: 'GAME_STARTED' }
  | { type: 'GAME_OVER'; winnerId?: string }

export type ClientMsg =
  | { type: 'JOIN'; userId: string; characterSlug: string }
  | { type: 'INTENT'; intent: unknown; senderId: string }
  | { type: 'START_GAME' }

interface RoomState {
  players: Array<{ id: string; userId: string; characterSlug: string; connectionId: string; isAI: boolean }>
  gameStarted: boolean
  vsAI: boolean
  actor: ReturnType<typeof createActor<typeof gameMachine>> | null
}

export default class GameRoom implements Party.Server {
  private state: RoomState = {
    players: [],
    gameStarted: false,
    vsAI: false,
    actor: null,
  }

  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection) {
    // Send current game state to newly connected client
    if (this.state.actor) {
      const ctx = this.state.actor.getSnapshot().context
      conn.send(JSON.stringify({ type: 'GAME_STATE', context: ctx } satisfies ServerMsg))
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMsg
    try {
      msg = JSON.parse(message) as ClientMsg
    } catch {
      sender.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON' } satisfies ServerMsg))
      return
    }

    switch (msg.type) {
      case 'JOIN':
        await this.handleJoin(msg, sender)
        break
      case 'START_GAME':
        await this.handleStart(sender)
        break
      case 'INTENT':
        await this.handleIntent(msg, sender)
        break
    }
  }

  async onClose(conn: Party.Connection) {
    this.state.players = this.state.players.filter(p => p.connectionId !== conn.id)
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private async handleJoin(msg: Extract<ClientMsg, { type: 'JOIN' }>, conn: Party.Connection) {
    if (this.state.gameStarted) {
      conn.send(JSON.stringify({ type: 'ERROR', message: 'Game already started' } satisfies ServerMsg))
      return
    }
    if (this.state.players.length >= 3) {
      conn.send(JSON.stringify({ type: 'ERROR', message: 'Room is full' } satisfies ServerMsg))
      return
    }
    if (this.state.players.some(p => p.userId === msg.userId)) {
      conn.send(JSON.stringify({ type: 'ERROR', message: 'Already joined' } satisfies ServerMsg))
      return
    }

    const playerId = `p${this.state.players.length + 1}`
    this.state.players.push({
      id: playerId,
      userId: msg.userId,
      characterSlug: msg.characterSlug,
      connectionId: conn.id,
      isAI: false,
    })

    this.room.broadcast(
      JSON.stringify({ type: 'PLAYER_JOINED', playerId } satisfies ServerMsg)
    )
  }

  private async handleStart(conn: Party.Connection) {
    if (this.state.gameStarted) {
      conn.send(JSON.stringify({ type: 'ERROR', message: 'Game already started' } satisfies ServerMsg))
      return
    }

    // Add AI opponent if only 1 human player (VS_AI mode)
    if (this.state.players.length === 1) {
      this.state.vsAI = true
      this.state.players.push({
        id: 'p2',
        userId: 'ai-player',
        characterSlug: 'el-energista',
        connectionId: 'ai',
        isAI: true,
      })
    }

    if (this.state.players.length < 2) {
      conn.send(JSON.stringify({ type: 'ERROR', message: 'Need at least 2 players' } satisfies ServerMsg))
      return
    }

    const initialCtx = createInitialContext(
      this.state.players.map(p => ({ id: p.id, userId: p.userId, characterSlug: p.characterSlug }))
    )

    this.state.actor = createActor(gameMachine, { input: initialCtx })

    this.state.actor.subscribe(snapshot => {
      const ctx = snapshot.context
      this.room.broadcast(JSON.stringify({ type: 'GAME_STATE', context: ctx } satisfies ServerMsg))

      if (snapshot.matches('finished')) {
        const players = Object.values(ctx.players).filter(p => !p.isEliminated)
        const winner = players.sort((a, b) => b.credits - a.credits)[0]
        this.room.broadcast(
          JSON.stringify({ type: 'GAME_OVER', winnerId: winner?.userId } satisfies ServerMsg)
        )
        return
      }

      // Trigger AI move if it's the AI's turn
      if (this.state.vsAI && this.state.actor) {
        const currentPlayerId = ctx.turnOrder[ctx.currentPlayerIndex]
        const currentPlayer = this.state.players.find(p => p.id === currentPlayerId)
        if (currentPlayer?.isAI) {
          // Small delay so the UI can render state before AI acts
          setTimeout(() => {
            if (!this.state.actor) return
            const latest = this.state.actor.getSnapshot().context
            const intent = chooseIntent(latest, currentPlayerId)
            this.state.actor!.send(intent)
          }, 800)
        }
      }
    })

    this.state.actor.start()
    this.state.gameStarted = true
    this.room.broadcast(JSON.stringify({ type: 'GAME_STARTED' } satisfies ServerMsg))
  }

  private async handleIntent(msg: Extract<ClientMsg, { type: 'INTENT' }>, conn: Party.Connection) {
    if (!this.state.actor || !this.state.gameStarted) {
      conn.send(JSON.stringify({ type: 'ERROR', message: 'Game not started' } satisfies ServerMsg))
      return
    }

    const parsed = IntentSchema.safeParse(msg.intent)
    if (!parsed.success) {
      conn.send(JSON.stringify({ type: 'ERROR', message: 'Invalid intent' } satisfies ServerMsg))
      return
    }

    // Verify sender owns the current turn
    const snapshot = this.state.actor.getSnapshot()
    const currentPlayerId = snapshot.context.turnOrder[snapshot.context.currentPlayerIndex]
    const sender = this.state.players.find(p => p.userId === msg.senderId)

    if (!sender || sender.id !== currentPlayerId) {
      conn.send(JSON.stringify({ type: 'ERROR', message: 'Not your turn' } satisfies ServerMsg))
      return
    }

    this.state.actor.send(parsed.data)
  }
}
