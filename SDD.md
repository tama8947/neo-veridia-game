# SDD.MD - HexEstate: Spec Driven Design

> **Documento de Especificaciones** | Filosofía: Spec → Test → Code. Nada se implementa sin spec previa.
> **Complemento a:** `AGENTS.MD` (normas de código) y `BUSINESS.MD` (reglas de negocio).
> **Regla de oro:** Si no hay spec, no hay código. Si hay ambigüedad en la spec, se resuelve aquí antes de tocar el engine.

---

## 0. Filosofía Spec Driven Design

```
SPEC (Zod / XState / API contract)
  ↓
TEST (Vitest describe/it que falla — red)
  ↓
CODE (implementación mínima que pasa — green)
  ↓
REFACTOR (sin romper specs)
```

**Reglas del proceso:**
1. Todo cambio de regla de negocio empieza en `BUSINESS.MD` → luego aquí en la spec → luego en tests → luego en código
2. Los Zod schemas son la única fuente de verdad en runtime. Prisma types son secundarios
3. La XState machine es la spec del flujo de juego. Si una transición no está en la máquina, no existe
4. Cada API endpoint tiene un contrato definido aquí antes de ser implementado
5. Los tests de `src/engine/` se escriben ANTES de la implementación

---

## 1. Zod Schemas — Fuente de Verdad

> Ubicación: `src/engine/schemas.ts`  
> Importados en PartyKit (validación de intents), Next.js (validación de API bodies) y tests.

### 1.1 Recursos del Jugador

```typescript
export const ResourcesSchema = z.object({
  credits: z.number().int().min(0),
  energy:  z.number().int().min(0),
})
```

**Specs de invariantes:**
- `credits` y `energy` nunca pueden ser negativos en el estado persistido
- La deducción que llevaría a negativo debe rechazarse antes de aplicarse

---

### 1.2 Tile

```typescript
export const TileIdSchema = z.string().regex(/^-?\d+,-?\d+,-?\d+$/) // "q,r,s" axial

export const TileTypeSchema = z.enum([
  'nucleus', 'property', 'stasis', 'portal', 'guild_event', 'dark_district',
])

export const PropertyColorSchema = z.enum([
  'cyan', 'magenta', 'amber', 'violet', 'emerald',
  'rose', 'indigo', 'orange', 'lime', 'sky', 'fuchsia', 'teal',
])

export const UpgradeLevelSchema = z.union([
  z.literal(0), z.literal(1), z.literal(2), z.literal(3),
])

export const TileSchema = z.object({
  id:              TileIdSchema,
  type:            TileTypeSchema,
  color:           PropertyColorSchema.optional(),
  ownerId:         z.string().optional(),
  upgradeLevel:    UpgradeLevelSchema,
  isMortgaged:     z.boolean(),
  isUnderSiege:    z.boolean(),
  siegeByPlayerId: z.string().optional(),
  baseRent:        z.number().int().nonnegative(),
  baseCost:        z.number().int().nonnegative(),
  portalGroupId:   z.string().optional(),
})
```

**Specs de invariantes:**
- `color` solo presente si `type === 'property'`
- `ownerId` solo presente si `type === 'property'`
- `upgradeLevel > 0` requiere `ownerId` definido y `isMortgaged === false`
- `isUnderSiege === true` requiere `siegeByPlayerId` definido
- `portalGroupId` solo presente si `type === 'portal'`

---

### 1.3 PNA (Pacto de No Agresión)

```typescript
export const PnaSchema = z.object({
  withPlayerId: z.string(),
  turnsLeft:    z.number().int().min(0).max(5),
  broken:       z.boolean(),
})
```

---

### 1.4 Player

```typescript
export const PlayerSchema = z.object({
  id:              z.string(),
  userId:          z.string(),
  characterSlug:   z.string(),
  credits:         z.number().int().min(0),
  energy:          z.number().int().min(0),
  currentTileId:   TileIdSchema,
  isEliminated:    z.boolean(),
  isInStasis:      z.boolean(),
  stasisTurnsLeft: z.number().int().min(0).max(3),
  activePnas:      z.array(PnaSchema),
  xpEarned:        z.number().int().min(0),
})
```

**Specs de invariantes:**
- `isInStasis === true` implica `stasisTurnsLeft > 0`
- `isEliminated === true` implica `credits === 0`
- `activePnas` no puede contener dos PNA con el mismo `withPlayerId`

---

### 1.5 Guild Event Card

```typescript
export const GuildEventCardSchema = z.object({
  id:          z.string(),
  name:        z.string(),
  effectKey:   z.string(),
  probability: z.number().min(0).max(1),
})

// Invariante: suma de todas las probabilidades === 1.0
export const EventDeckSchema = z.array(GuildEventCardSchema).refine(
  deck => Math.abs(deck.reduce((sum, c) => sum + c.probability, 0) - 1.0) < 0.001,
  { message: 'Event deck probabilities must sum to 1.0' }
)
```

---

### 1.6 Auction

```typescript
export const AuctionSchema = z.object({
  tileId:   TileIdSchema,
  bids:     z.record(z.string(), z.number().int().nonnegative()),
  timerMs:  z.number().int().min(0).max(15_000),
  active:   z.boolean(),
})
```

**Specs de invariantes:**
- Solo un auction puede estar activo a la vez (`active: true`)
- Un bid solo es válido si `amount <= player.credits`
- El ganador es el mayor bid; empate lo gana quien pujó primero

---

### 1.7 Global Effect

```typescript
export const GlobalEffectSchema = z.object({
  key:       z.string(),
  turnsLeft: z.number().int().positive().optional(), // undefined = permanente
})
```

---

### 1.8 Game Phase

```typescript
export const GamePhaseSchema = z.enum([
  'waiting',
  'rolling',
  'choosing_path',
  'landing',
  'buying',
  'paying_rent',
  'guild_event',
  'auction',
  'stasis_choice',
  'end_turn',
  'finished',
])
```

---

### 1.9 Game Context (Estado completo)

```typescript
export const GameContextSchema = z.object({
  tiles:                z.record(TileIdSchema, TileSchema),
  players:              z.record(z.string(), PlayerSchema),
  turnOrder:            z.array(z.string()).min(2).max(3),
  currentPlayerIndex:   z.number().int().min(0).max(2),
  currentTurn:          z.number().int().min(1).max(40),
  maxTurns:             z.literal(40),
  phase:                GamePhaseSchema,
  diceValue:            z.union([
                          z.literal(1), z.literal(2), z.literal(3),
                          z.literal(4), z.literal(5), z.literal(6),
                        ]).optional(),
  availablePaths:       z.array(z.array(TileIdSchema)).optional(),
  lastEvent:            GuildEventCardSchema.optional(),
  auction:              AuctionSchema.optional(),
  globalEffects:        z.array(GlobalEffectSchema),
  log:                  z.array(z.object({
                          turn:      z.number().int(),
                          playerId:  z.string(),
                          action:    z.string(),
                          timestamp: z.number(),
                        })),
})
```

**Specs de invariantes globales:**
- `currentPlayerIndex < turnOrder.length`
- `turnOrder` no contiene duplicados
- Todos los `ownerId` en tiles existen como keys en `players`
- Si `phase === 'finished'`, `currentTurn === 40` O solo 1 jugador no eliminado
- `availablePaths` solo presente en fase `choosing_path`
- `diceValue` solo presente desde fase `choosing_path` hasta `end_turn`

---

### 1.10 Game Intents (Mensajes WebSocket cliente → PartyKit)

```typescript
export const IntentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ROLL_DICE') }),
  z.object({ type: z.literal('CHOOSE_PATH'),      path: z.array(TileIdSchema).min(1).max(6) }),
  z.object({ type: z.literal('BUY_PROPERTY'),     tileId: TileIdSchema }),
  z.object({ type: z.literal('SKIP_BUY') }),
  z.object({ type: z.literal('PAY_RENT_CREDITS') }),
  z.object({ type: z.literal('PAY_RENT_ENERGY') }),
  z.object({ type: z.literal('UPGRADE_PROPERTY'), tileId: TileIdSchema }),
  z.object({ type: z.literal('MORTGAGE_PROPERTY'),tileId: TileIdSchema }),
  z.object({ type: z.literal('PAY_STASIS'),       method: z.enum(['credits', 'energy']) }),
  z.object({ type: z.literal('SKIP_STASIS') }),
  z.object({ type: z.literal('PROPOSE_PNA'),      targetPlayerId: z.string() }),
  z.object({ type: z.literal('ACCEPT_PNA'),       fromPlayerId: z.string() }),
  z.object({ type: z.literal('REJECT_PNA'),       fromPlayerId: z.string() }),
  z.object({ type: z.literal('PLACE_AUCTION_BID'),tileId: TileIdSchema, amount: z.number().int().positive() }),
  z.object({ type: z.literal('GUILD_RESCUE') }),
])

export type GameIntent = z.infer<typeof IntentSchema>
```

---

### 1.11 API Bodies

```typescript
// POST /api/games/finish
export const FinishGameBodySchema = z.object({
  roomId:       z.string(),
  winnerUserId: z.string().optional(),   // undefined si empate por tiempo
  players: z.array(z.object({
    userId:       z.string(),
    xpEarned:     z.number().int().min(0),
    finalCredits: z.number().int().min(0),
    finalEnergy:  z.number().int().min(0),
  })),
  replayFrames: z.array(GameContextSchema),
  totalTurns:   z.number().int().min(1).max(40),
})

// POST /api/store/checkout
export const CheckoutBodySchema = z.object({
  itemType: z.enum(['character', 'board_skin', 'season_pass', 'starter_pack']),
  itemId:   z.string(),
})

// POST /api/push/subscribe
export const PushSubscribeBodySchema = z.object({
  endpoint: z.string().url(),
  p256dh:   z.string(),
  auth:     z.string(),
})

// POST /api/achievements/check
export const AchievementCheckBodySchema = z.object({
  userId:  z.string(),
  gameId:  z.string(),
  stats: z.object({
    won:               z.boolean(),
    consecutiveWins:   z.number().int().min(0),
    nucleusLandings:   z.number().int().min(0),
    clustersCompleted: z.number().int().min(0),
    propertiesOwned:   z.number().int().min(0),
    totalGamesPlayed:  z.number().int().min(0),
    eliminations:      z.number().int().min(0),
    survivedTurn35:    z.boolean(),
    wonWithoutBuying:  z.boolean(),
    eliminatedBothSameTurn: z.boolean(),
    completedAllColors: z.boolean(),
  }),
})
```

---

## 2. XState Machine Spec

> La máquina define **qué transiciones son legales**. Cualquier intent fuera de una transición permitida es rechazado por PartyKit sin procesar.

### 2.1 Diagrama de estados

```
waiting
  └─ [todos conectados] → rolling

rolling
  └─ ROLL_DICE (solo currentPlayer) → choosing_path

choosing_path
  └─ CHOOSE_PATH (path válido) → landing

landing
  ├─ [type=nucleus]       → end_turn  (apply: +200💰 +2⚡, countdown_event?)
  ├─ [type=property, sin dueño]   → buying
  ├─ [type=property, dueño=self]  → end_turn
  ├─ [type=property, dueño=otro, no hipotecada] → paying_rent
  ├─ [type=stasis]        → stasis_choice
  ├─ [type=portal]        → choosing_path (con tileId del portal destino)
  ├─ [type=guild_event]   → guild_event
  └─ [type=dark_district] → guild_event (carta negativa forzada)

buying
  ├─ BUY_PROPERTY [credits >= cost] → end_turn
  └─ SKIP_BUY                       → end_turn

paying_rent
  ├─ PAY_RENT_CREDITS [credits >= rent]         → end_turn
  ├─ PAY_RENT_ENERGY  [energy >= rent/20]       → end_turn
  └─ [credits < rent && energy < rent/20]       → bankruptcy

stasis_choice
  ├─ PAY_STASIS credits [credits >= 50]  → end_turn
  ├─ PAY_STASIS energy  [energy >= 5]    → end_turn
  └─ SKIP_STASIS                          → end_turn (stasisTurnsLeft = 1)

guild_event
  └─ [auto, no player input]  → end_turn | auction

auction
  ├─ PLACE_AUCTION_BID [active, credits >= amount]  → auction
  └─ [timer 15s expired]                            → end_turn (resolve winner)

end_turn
  └─ [auto] → rolling | finished

finished
  └─ [terminal]
```

### 2.2 Guards (condiciones de transición)

```typescript
// Specs de guards — cada uno tiene un test que lo verifica

isCurrentPlayer:    context.turnOrder[context.currentPlayerIndex] === senderId
canBuyProperty:     tile.type === 'property' && !tile.ownerId && player.credits >= tile.baseCost
mustPayRent:        tile.ownerId && tile.ownerId !== player.id && !tile.isMortgaged
canAffordRentCredits: player.credits >= calculatedRent(context, tile)
canAffordRentEnergy:  player.energy >= Math.ceil(calculatedRent(context, tile) / 20)
isBankrupt:         !canAffordRentCredits && !canAffordRentEnergy && allPropertiesMortgaged
isTurnLimit:        context.currentTurn >= context.maxTurns
isCountdownTurn:    [20, 30, 35, 38].includes(context.currentTurn)
hasActiveSiege:     tile.isUnderSiege && tile.siegeByPlayerId === player.id
```

### 2.3 Actions (efectos de transición)

```typescript
// Specs de actions — cada una tiene un test de estado antes/después

rollDice:           context.diceValue = random 1-6; context.availablePaths = pathfinding(context)
movePlayer:         player.currentTileId = path[path.length-1]; clear diceValue
chargeRent:         owner.credits += calculatedRent; player.credits -= calculatedRent
chargeRentEnergy:   owner.credits += calculatedRent; player.energy -= Math.ceil(rent/20)
collectNucleus:     player.credits += 200; player.energy += 2
applyUpgrade:       tile.upgradeLevel += 1; player.energy -= upgradeCost(tile.upgradeLevel)
applyMortgage:      tile.isMortgaged = true; player.credits += Math.floor(tile.baseCost * 0.5)
drawGuildEvent:     context.lastEvent = weightedRandom(EVENT_DECK)
applyEvent:         dispatch effectKey handler from events.ts
applyCountdown:     apply GlobalEffect for turn 20|30|35|38
applyStasis:        player.isInStasis = true; player.stasisTurnsLeft = 1
payStasis:          player.credits -= 50 | player.energy -= 5; player.isInStasis = false
applyAbility:       call ABILITIES[player.characterSlug][hookName]?.(context, player.id)
eliminatePlayer:    player.isEliminated = true; return all tiles to bank (upgradeLevel=0)
advanceTurn:        currentPlayerIndex = (currentPlayerIndex+1) % turnOrder.length; currentTurn++
addXpAction:        player.xpEarned += XP_REWARDS[action]
updateSieges:       recalculate isUnderSiege for all tiles after every move
decrementPnas:      activePnas.forEach(p => p.turnsLeft--)
```

---

## 3. Specs de Comportamiento del Engine

> Estos son los tests que deben escribirse **antes** de implementar cada módulo. Cada bloque `describe/it` es una spec ejecutable.

### 3.1 `pathfinding.spec.ts`

```typescript
describe('pathfinding', () => {
  it('retorna paths válidos de exactamente N pasos desde posición actual')
  it('nunca incluye tiles con occupantId !== null en el camino intermedio')
  it('El Fantasma del Vapor puede atravesar 1 tile ocupado')
  it('El Gato Cibernético puede saltar 1 tile ocupado una vez por partida')
  it('no retorna paths que salgan del tablero (37 tiles)')
  it('retorna array vacío si todas las rutas están bloqueadas')
  it('para portal: incluye el salto al portal destino como path adicional')
})
```

### 3.2 `economy.spec.ts`

```typescript
describe('calculateRent', () => {
  it('retorna baseRent si tile sin mejoras y sin clúster')
  it('multiplica x2 si tile pertenece a clúster completo (3 hex mismos color adyacentes)')
  it('añade bonus por upgradeLevel: nivel1=+50%, nivel2=+100%, nivel3=+200%')
  it('aplica clúster x2 sobre el valor ya con mejoras')
  it('retorna 0 si tile está hipotecado')
  it('La Abeja Mecánica: +1⚡ al propietario cuando cobra alquiler en propiedad propia')
  it('La Robot Bailarina: +10% si es turno múltiplo de 5 del propietario')
})

describe('clusterBonus', () => {
  it('detecta clúster cuando los 3 tiles del mismo color son adyacentes entre sí')
  it('no activa clúster si los 3 tiles del color no son todos adyacentes')
  it('no activa clúster si alguno de los 3 es de distinto dueño')
  it('El Druida Urbano: clúster activo genera +1⚡ adicional por turno')
})

describe('upgradeCost', () => {
  it('nivel 1 cuesta 3⚡, nivel 2 cuesta 5⚡, nivel 3 cuesta 8⚡')
  it('El Arquitecto: primera mejora de cada propiedad cuesta 1⚡ menos')
  it('rechaza upgrade si tile hipotecado')
  it('rechaza upgrade si tile bajo asedio')
  it('rechaza upgrade si player.energy < costo')
})
```

### 3.3 `board.spec.ts`

```typescript
describe('detectSiege', () => {
  it('activa asedio si 2 tokens del mismo jugador rodean hexágono enemigo por adyacencia')
  it('no activa asedio con solo 1 token adyacente')
  it('La Sombra Cuántica nunca puede ser sitiada')
  it('asedio se levanta si el propietario aterriza en el tile sitiado')
  it('asedio se levanta si el sitiador mueve ambos tokens fuera del radio')
})

describe('isValidPath', () => {
  it('acepta path cuya longitud === diceValue')
  it('rechaza path con longitud !== diceValue')
  it('rechaza path con tiles no adyacentes entre sí')
  it('rechaza path que incluye tile con otro jugador (salvo habilidad Fantasma)')
})
```

### 3.4 `events.spec.ts`

```typescript
describe('EventDeck', () => {
  it('la suma de probabilidades es exactamente 1.0')
  it('contiene exactamente 13 tipos de carta distintas')
  it('weightedRandom retorna cartas con frecuencia proporcional a su probabilidad')
})

describe('event effects', () => {
  it('CORTO_CIRCUITO: reduce upgradeLevel en 1 a todos los tiles del color seleccionado')
  it('REBOTE_NUCLEO: añade +150💰 y +4⚡ a todos los jugadores')
  it('ZONA_CUARENTENA: bloquea tile aleatorio por 3 turnos')
  it('TORMENTA_CREDITOS: resta 200💰 al líder, distribuye entre los demás')
  it('ECLIPSE_NUCLEO: activa GlobalEffect que desactiva núcleo por 3 turnos')
  it('ALIANZA_FORZADA: los 2 jugadores con menos créditos comparten ingresos por 3 turnos')
})

describe('countdown events', () => {
  it('turno 20: alquiler global aumenta 25% permanentemente')
  it('turno 30: mitad de portales se desactivan')
  it('turno 35: regeneración de ⚡ cae a +1 por turno')
  it('turno 38: inicia subasta de todas las propiedades sin dueño')
  it('turno 40: game phase → finished')
})
```

### 3.5 `abilities.spec.ts`

```typescript
describe('PassiveAbilities', () => {
  // Base characters
  it('el-arquitecto: primera mejora de cada propiedad cuesta 1⚡ menos')
  it('el-arquitecto: la segunda mejora de la misma propiedad cuesta normal')
  it('la-abeja-mecanica: aterrizar en propiedad propia otorga +1⚡')
  it('el-golem-de-cristal: pagar estasis cuesta 50% menos')
  it('la-mercader: pasar por núcleo otorga +50💰 adicionales')
  it('el-fantasma-del-vapor: canTraverseTile retorna true para tile ocupado una vez por turno')
  it('la-hacker: onDrawEvent retorna la carta sin consumirla del mazo')
  it('el-gato-cibernetico: puede saltar exactamente 1 tile ocupado, una sola vez por partida')
  it('el-druida-urbano: clúster activo añade +1⚡ en end_turn')
  it('el-cuervo-mensajero: teletransporte gratuito a portal disponible una vez por partida')

  // Achievement characters
  it('el-oraculo-roto: onStartTurn revela effectKey de la próxima carta sin robarla')
  it('la-sombra-cuantica: canBeSeized es false — detectSiege la ignora')
  it('el-nino-del-nucleo: collectNucleus duplica la cantidad recibida')
  it('el-coloso-de-sal: isBankrupt retorna false en el primer turno de deuda')

  // Premium characters
  it('nexus-7: al iniciar partida recibe credits y energy de todos los rivales')
  it('la-emperatriz-solar: tiles nivel 3 generan +3⚡ adicionales en end_turn')
  it('el-pirata-del-vacio: una vez por partida roba 1⚡ de cada rival')
  it('la-dj-cuantica: PAY_RENT_ENERGY acepta tasa 1⚡=20💰')
  it('la-bruja-del-codigo: puede cambiar tipo de casilla especial una vez por partida')
})
```

### 3.6 `diplomacy.spec.ts`

```typescript
describe('PNA', () => {
  it('PROPOSE_PNA crea entrada pendiente en targetPlayer')
  it('ACCEPT_PNA crea PNA activo en ambos jugadores con turnsLeft=5')
  it('REJECT_PNA elimina la propuesta sin efectos')
  it('PNA decrementa turnsLeft en end_turn')
  it('PNA expirado (turnsLeft=0) se elimina automáticamente')
  it('romper PNA: aterrizar en propiedad enemiga con PNA activo aplica -3⚡ y marca broken=true')
  it('no puede haber 2 PNA activos con el mismo withPlayerId')
  it('proponer PNA a jugador eliminado es rechazado')
})
```

### 3.7 `auction.spec.ts`

```typescript
describe('Auction', () => {
  it('solo puede haber una subasta activa a la vez')
  it('bid inválido si amount > player.credits')
  it('bid de 0 no es válido')
  it('al resolver: gana el bid más alto')
  it('empate: gana el jugador que pujó primero (timestamp)')
  it('ganador: credits -= bid, tile.ownerId = ganador')
  it('perdedores: sin cargo')
  it('si nadie puja: tile queda sin dueño')
  it('GUILD_RESCUE: jugador puede declararlo una sola vez por partida')
  it('GUILD_RESCUE: recibe 100💰 y pierde tile con mayor baseCost')
})
```

### 3.8 `progression.spec.ts`

```typescript
describe('XP', () => {
  it('ganar partida otorga +500 XP')
  it('perder otorga +100 XP')
  it('completar clúster otorga +75 XP')
  it('causar quiebra a rival otorga +200 XP')
  it('sobrevivir al turno 35 otorga +150 XP')
  it('robar carta de Evento otorga +25 XP')
  it('PNA aceptado otorga +50 XP')
})

describe('Achievement unlock', () => {
  it('consecutiveWins >= 3 desbloquea el-oraculo-roto')
  it('nucleusLandings >= 10 en 1 partida desbloquea el-nino-del-nucleo')
  it('wonWithoutBuying === true desbloquea la-sombra-cuantica')
  it('totalGamesPlayed >= 10 desbloquea el-ermitano-del-arco') // ajuste: 10 para testability, 50 en prod
  it('eliminatedBothSameTurn === true desbloquea la-reina-del-vacio')
  it('completedAllColors === true desbloquea la-tejedora-de-redes')
  it('no genera duplicado si el personaje ya está desbloqueado')
})
```

### 3.9 `minimax.spec.ts`

```typescript
describe('AI Minimax', () => {
  it('retorna un intent válido en <200ms para cualquier snapshot de estado')
  it('prefiere comprar propiedad que complete un clúster sobre propiedad aislada')
  it('no intenta comprar si credits < baseCost')
  it('elige pagar renta con energía cuando credits son bajos y energy es abundante')
  it('sitia hexágono enemigo si tiene 2 fichas adyacentes disponibles')
  it('usa habilidad pasiva cuando mejora el score en >10 puntos')
  it('nunca envía intent ROLL_DICE si phase !== rolling')
})
```

---

## 4. API Contracts

> Cada endpoint con su request, response y códigos de error posibles.

### `POST /api/games/finish`

```
Headers:  x-partykit-secret: string (validado con env.PARTYKIT_SECRET)
Body:     FinishGameBodySchema
Response 200: { ok: true, xpGained: Record<userId, number> }
Response 400: { error: 'invalid_body', details: ZodError }
Response 401: { error: 'unauthorized' }
Response 409: { error: 'game_already_finished' }
```

**Efectos garantizados:**
- Crea `Game` en DB con status FINISHED
- Actualiza `user.xp` y `user.elo` para cada jugador
- Llama a `/api/achievements/check` internamente
- Guarda `replayFrames` en DB

---

### `POST /api/store/checkout`

```
Headers:  Authorization: Bearer <session_token>
Body:     CheckoutBodySchema
Response 200: { checkoutUrl: string }
Response 400: { error: 'invalid_item' }
Response 409: { error: 'already_owned' }  // si user ya tiene el item
Response 402: { error: 'payment_required' }
```

---

### `POST /api/store/webhook`

```
Headers:  stripe-signature: string
Body:     Stripe event (raw)
Response 200: { ok: true }
Response 400: { error: 'invalid_signature' }

Efectos (solo en event.type === 'checkout.session.completed'):
  - Crea Purchase en DB
  - Crea UserCharacter en DB
  - NO hace HTTP redirect — el cliente lo detecta via polling de /api/profile
```

---

### `GET /api/games/[id]/replay`

```
Headers:  Authorization: Bearer <session_token>
Response 200: { frames: GameContext[], totalTurns: number, players: PlayerSummary[] }
Response 404: { error: 'game_not_found' }
Response 403: { error: 'not_participant' }  // solo los jugadores de la partida pueden ver replay
```

---

### `POST /api/push/subscribe`

```
Headers:  Authorization: Bearer <session_token>
Body:     PushSubscribeBodySchema
Response 200: { ok: true }
Response 409: { ok: true }  // ya existía, idempotente
```

---

### `POST /api/achievements/check`

```
Headers:  x-partykit-secret: string
Body:     AchievementCheckBodySchema
Response 200: { unlocked: Achievement[] }  // lista de logros/personajes nuevos
```

---

## 5. WebSocket Protocol (PartyKit)

### Mensajes Cliente → Server

```typescript
// Intent del jugador — validado con IntentSchema en room.ts
{ type: 'INTENT', payload: GameIntent, playerId: string }

// Solicitud de estado inicial al conectar
{ type: 'GET_STATE' }
```

### Mensajes Server → Cliente

```typescript
// Broadcast tras cada transición
{ type: 'STATE', snapshot: GameContext }

// Error de validación
{ type: 'ERROR', code: 'invalid_intent' | 'not_your_turn' | 'invalid_phase', message: string }

// Evento puntual (no cambia estado, solo UI)
{ type: 'NOTIFICATION', event: 'pna_proposed' | 'auction_started' | 'player_eliminated', payload: unknown }

// Confirmación de fin de subasta
{ type: 'AUCTION_RESOLVED', winnerId: string | null, tileId: string }
```

---

## 6. Passive Ability Interface (Contrato del Engine)

```typescript
// src/engine/abilities.ts

export interface PassiveAbility {
  characterSlug: string

  // Hooks — cada uno retorna un patch parcial del contexto o undefined (sin cambio)
  onUpgrade?(ctx: GameContext, playerId: string, tileId: string): Partial<GameContext> | undefined
  onLandOwnProperty?(ctx: GameContext, playerId: string): Partial<GameContext> | undefined
  onPassNucleus?(ctx: GameContext, playerId: string): Partial<GameContext> | undefined
  onPayRent?(ctx: GameContext, playerId: string): Partial<GameContext> | undefined
  onStartTurn?(ctx: GameContext, playerId: string): Partial<GameContext> | undefined
  onClusterComplete?(ctx: GameContext, playerId: string): Partial<GameContext> | undefined
  onEndTurn?(ctx: GameContext, playerId: string): Partial<GameContext> | undefined
  onGameStart?(ctx: GameContext, playerId: string): Partial<GameContext> | undefined

  // Draw hook — null = no interfiere, GuildEventCard = override de la carta robada
  onDrawEvent?(ctx: GameContext, playerId: string): GuildEventCard | null

  // Guards — sobreescriben lógica del board
  canTraverseTile?(ctx: GameContext, playerId: string, tileId: string): boolean
  canBeSeized?: false  // solo para La Sombra Cuántica
}
```

**Specs de contrato:**
- Cada hook debe ser puro: no mutar `ctx` directamente, solo retornar patch
- El engine aplica el patch con `Object.assign({}, ctx, patch)`
- Si un hook retorna `undefined`, el contexto no cambia
- Los hooks se llaman **después** de la acción principal de XState
- Máximo 1 habilidad activa por turno para el mismo jugador (excepto `onEndTurn`)

---

## 7. Plan de Implementación por Fases

> Cada fase sigue el orden: **spec ya está aquí → escribir tests → implementar → pasar tests**.

---

### FASE 1 — Foundation
**Prerequisito:** Sección 1 (schemas), sección 4 (API contracts auth) completos ✓

**Tests a escribir primero:**
```
src/engine/__tests__/schemas.spec.ts  → validar todos los Zod schemas con casos válidos e inválidos
src/app/api/auth/__tests__/           → mock Google OAuth, verificar creación de User en DB
```

**Implementar:**
- [ ] `pnpm create next-app` — App Router, TypeScript strict, Tailwind
- [ ] `src/engine/schemas.ts` — todos los schemas de sección 1
- [ ] `src/engine/constants.ts` — `TILE_COSTS`, `RENT_TABLE`, `XP_REWARDS`, `UPGRADE_COSTS`
- [ ] Prisma schema + `prisma migrate dev`
- [ ] Seed: 25 personajes + 8 achievements con sus condiciones
- [ ] NextAuth config con Google provider + Prisma adapter
- [ ] Página de login + página de perfil básica
- [ ] `.env.example` documentado

**Spec de aceptación:** `schemas.spec.ts` pasa al 100%. Usuario hace login con Google, aparece en DB.

---

### FASE 2 — Board & Movement
**Prerequisito:** specs `pathfinding.spec.ts`, `board.spec.ts` sección 3 ✓

**Tests a escribir primero:**
```
src/engine/__tests__/pathfinding.spec.ts
src/engine/__tests__/board.spec.ts (solo isValidPath)
```

**Implementar:**
- [ ] `src/engine/board.ts` — layout 37 tiles con honeycomb-grid, grafo de adyacencias
- [ ] `src/engine/pathfinding.ts` — BFS con N pasos, filtro de tiles ocupados
- [ ] `src/engine/game-machine.ts` — estados `rolling`, `choosing_path`, `landing`, `end_turn`
- [ ] `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` instalados
- [ ] `BoardCanvas.tsx` con `dynamic(..., {ssr:false})`
- [ ] `HexTile.tsx` — mesh básico, color por tipo
- [ ] `PlayerToken.tsx` — placeholder esfera
- [ ] `NucleusCore.tsx` — pulso básico
- [ ] `PostFX.tsx` — Bloom mínimo
- [ ] `usePartyKit.ts` — conexión WS stub (sin servidor aún)
- [ ] Demo local: 1 jugador, dado en consola, movimiento en canvas

**Spec de aceptación:** `pathfinding.spec.ts` y `board.spec.ts` pasan al 100%. Tablero visible en móvil.

---

### FASE 3 — Economy & Rules
**Prerequisito:** specs `economy.spec.ts`, `board.spec.ts` (siege) sección 3 ✓

**Tests a escribir primero:**
```
src/engine/__tests__/economy.spec.ts
src/engine/__tests__/board.spec.ts (detectSiege)
```

**Implementar:**
- [ ] `src/engine/economy.ts` — `calculateRent`, `clusterBonus`, `upgradeCost`, `mortgageValue`
- [ ] `src/engine/board.ts` — `detectSiege`, `updateSieges`
- [ ] XState: añadir estados `buying`, `paying_rent`, `stasis_choice`, lógica de quiebra
- [ ] XState: `GUILD_RESCUE` action
- [ ] `PlayerHUD.tsx` — créditos, energía, turno actual
- [ ] `ActionPanel.tsx` — botones contextuales por fase
- [ ] `SiegeOverlay.tsx` — pulso rojo
- [ ] `ClusterGlow.tsx` — flujo de energía

**Spec de aceptación:** `economy.spec.ts` 100%. Partida local termina correctamente por quiebra.

---

### FASE 4 — Events & Abilities
**Prerequisito:** specs `events.spec.ts`, `abilities.spec.ts`, `diplomacy.spec.ts`, `auction.spec.ts` sección 3 ✓

**Tests a escribir primero:**
```
src/engine/__tests__/events.spec.ts
src/engine/__tests__/abilities.spec.ts
src/engine/__tests__/diplomacy.spec.ts
src/engine/__tests__/auction.spec.ts
```

**Implementar:**
- [ ] `src/engine/events.ts` — 13 cartas con handlers + `EventDeckSchema` validation
- [ ] `src/engine/abilities.ts` — `PassiveAbility` interface + 25 implementaciones
- [ ] `src/engine/diplomacy.ts` — PNA logic
- [ ] `src/engine/auction.ts` — bids, resolución
- [ ] XState: integrar hooks de abilities en transiciones, estado `guild_event`, `auction`
- [ ] XState: countdown guards para turnos 20/30/35/38
- [ ] `EventCard.tsx` — animación con motion
- [ ] `AuctionModal.tsx` — countdown 15s
- [ ] `DiplomacyPanel.tsx` — proponer/aceptar/rechazar PNA

**Spec de aceptación:** todos los specs de esta fase al 100%. Partida local con eventos y habilidades funcional.

---

### FASE 5 — Multiplayer Live
**Prerequisito:** `IntentSchema` y WebSocket protocol (sección 5) ✓, fases 1-4 completas

**Tests a escribir primero:**
```
src/partykit/__tests__/room.spec.ts  → intent validation, broadcast, siege update post-move
src/app/api/__tests__/finish.spec.ts → body validation, DB writes, ELO update
```

**Implementar:**
- [ ] `src/partykit/room.ts` — DO con XState server-side, validación con `IntentSchema`
- [ ] Broadcast snapshot a todos los clients
- [ ] Timer de subasta server-side (setTimeout en DO)
- [ ] `POST /api/games/finish` — persiste resultado
- [ ] `usePartyKit.ts` — WS real con reconnect exponential backoff
- [ ] `useGameState.ts` — consume snapshot del servidor
- [ ] Lobby: crear sala, sala de espera, selección de personaje
- [ ] Manejo de desconexión: pausa turno, timeout 60s

**Spec de aceptación:** `room.spec.ts` 100%. 2 jugadores juegan partida completa sin bugs.

---

### FASE 6 — AI Integration
**Prerequisito:** `minimax.spec.ts` sección 3 ✓

**Tests a escribir primero:**
```
src/engine/ai/__tests__/minimax.spec.ts
src/engine/ai/__tests__/heuristics.spec.ts
src/engine/ai/__tests__/ai-player.bench.ts  → performance <200ms
```

**Implementar:**
- [ ] `src/engine/ai/heuristics.ts` — `evaluate(state, playerId): number`
- [ ] `src/engine/ai/minimax.ts` — alpha-beta pruning, depth 1/2/3 por dificultad
- [ ] `src/engine/ai/ai-player.ts` — executor: snapshot → intent en <200ms
- [ ] Integración en PartyKit: turno IA ejecuta `ai-player` server-side

**Spec de aceptación:** `minimax.spec.ts` y bench 100%. IA hace decisiones coherentes <200ms en difícil.

---

### FASE 7 — Progression & Achievements
**Prerequisito:** specs `progression.spec.ts` sección 3 ✓

**Tests a escribir primero:**
```
src/engine/__tests__/progression.spec.ts
src/app/api/__tests__/achievements.spec.ts
```

**Implementar:**
- [ ] `src/engine/progression.ts` — `calculateXp`, `checkLevelUp`
- [ ] `POST /api/achievements/check` — evalúa 8 condiciones, crea UserCharacter si aplica
- [ ] Página de perfil completa: XP, nivel, colección de personajes
- [ ] `CharacterCard.tsx` — preview 3D + habilidad
- [ ] Notificación in-app de desbloqueo

**Spec de aceptación:** `progression.spec.ts` 100%. Desbloqueo automático de personaje funciona end-to-end.

---

### FASE 8 — Store & IAP
**Prerequisito:** API contracts `checkout` y `webhook` (sección 4) ✓

**Tests a escribir primero:**
```
src/app/api/__tests__/store.spec.ts  → checkout body, webhook validation, idempotencia de compra
```

**Implementar:**
- [ ] Stripe SDK instalado
- [ ] `src/config/store.ts` — catálogo completo (25 personajes premium, pase de temporada)
- [ ] `POST /api/store/checkout` + `POST /api/store/webhook`
- [ ] Página de tienda con secciones Personajes / Temporada
- [ ] Protección contra doble compra (`already_owned`)

**Spec de aceptación:** `store.spec.ts` 100%. Compra end-to-end funciona en Stripe test mode.

---

### FASE 9 — Social & Notifications
**Prerequisito:** `PushSubscribeBodySchema` (sección 1.11) ✓

**Tests a escribir primero:**
```
src/app/api/__tests__/push.spec.ts   → subscribe idempotencia, notify entrega
```

**Implementar:**
- [ ] Sistema de amigos: buscar, solicitar, aceptar
- [ ] `POST /api/push/subscribe` + `POST /api/push/notify`
- [ ] Modo Async: sin timer de turno, push notif al rival
- [ ] Ranking ELO: cálculo post-partida (K=32), tabla global + temporada
- [ ] Chat de sala con emotes predefinidos
- [ ] Modo Espectador: WS readonly

**Spec de aceptación:** Partida async con push notifications funciona en móvil real.

---

### FASE 10 — Replay, Polish & Deploy
**Prerequisito:** API contract `GET /api/games/[id]/replay` (sección 4) ✓

**Tests a escribir primero:**
```
src/app/api/__tests__/replay.spec.ts → acceso solo a participantes, frames correctos
```

**Implementar:**
- [ ] `src/engine/replay.ts` — serialización de frames durante partida
- [ ] `GET /api/games/[id]/replay` — retorna frames con auth guard
- [ ] UI de replay: scrubber + playback en R3F
- [ ] Error boundaries en canvas y partida
- [ ] Instanced meshes para hexágonos (R3F performance)
- [ ] Deploy: Vercel (Next.js) + PartyKit cloud + Neon prod
- [ ] Smoke tests post-deploy

**Spec de aceptación:** Lighthouse mobile ≥ 90. Usuario externo completa flujo completo sin errores.

---

## 8. Variables de Entorno (`.env.example`)

```bash
# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database
DATABASE_URL=

# PartyKit
PARTYKIT_HOST=
PARTYKIT_SECRET=
NEXTJS_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Web Push (VAPID)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:ortalla_9@hotmail.com
```

---

*Última actualización: 2026 | Spec es la ley. Código que no tiene spec no entra al repo.*
