# BUSINESS.MD - HexEstate: Product & Game Design Blueprint

> **Documento Maestro** | Propósito: Definir temática, reglas, alcance de negocio y mapeo técnico para HexEstate.
> **Complemento a:** `AGENTS.MD` (normas de desarrollo) y `package.json` (dependencias).
> **Estado:** Full Product Scope

---

## 📊 Executive Summary
**HexEstate** es un juego de mesa digital multijugador, mobile-first, basado en geometría hexagonal y economía dual. Los jugadores compiten por dominar Neo-Veridia, una ciudad futurista solarpunk/cyberpunk, mediante compras estratégicas, gestión de energía, táctica espacial y habilidades únicas de personaje.

- **Plataforma:** Web App Responsive (mobile-first) | Next.js + React + React Three Fiber
- **Modos:** 1v1 / 1v1v1 Humano, Humano vs IA, Async Turnos, Torneo
- **Acceso:** Auth con Google (NextAuth), salas temporales por ID corto
- **Progresión:** Sistema de XP + niveles, personajes desbloqueables por logros o compra
- **Monetización:** Compras in-app (personajes premium, tableros temáticos, efectos visuales, pases de temporada)
- **Social:** Amigos, ranking global, historial de partidas, repeticiones
- **Objetivo de producto:** Partida completa jugable, progresión real, economía de compras funcional, retención a largo plazo.

---

## 🌆 Game World & Theme
### "Neo-Veridia: La Ciudad Colmena"
Neo-Veridia es una metrópolis solarpunk/cyberpunk construida sobre una placa tectónica hexagonal autosuficiente. Los jugadores son **Magnates del Gremio** compitiendo por controlar distritos, gestionar la red de energía y expandir sus imperios antes de que el "Núcleo Central" entre en hibernación programada.

**El Tablero (El Escritorio Digital)**
- Vista cenital 2.5D/3D renderizada con React Three Fiber + postprocessing
- **Geometría:** 37 hexágonos (1 centro + 2 anillos) para partidas de ~20 min
- **Centro:** "El Núcleo" — Banco, Salida, regeneración de recursos. Pulsa visualmente más rápido conforme avanza el Reloj
- **Anillos Exteriores:** Distritos progresivamente más caros pero de mayor rendimiento energético
- **Estética:** Paleta neón suave, bloom en propiedades mejoradas, chromatic aberration en eventos críticos, animaciones de energía fluyendo entre hexágonos adyacentes del mismo clúster

---

## 👥 Personajes Base — Los 10 del Gremio Fundador
Disponibles para todos los jugadores desde el inicio. Cada uno tiene **1 habilidad pasiva** que altera la estrategia sin romper el balance.

| # | Nombre | Descripción Visual | Habilidad Pasiva |
|---|--------|-------------------|-----------------|
| 1 | **El Arquitecto** | Casco dorado, plano holográfico flotante | Primera mejora de cada propiedad cuesta 1⚡ menos |
| 2 | **La Abeja Mecánica** | Dron con alas de cristal, ojo de cámara rotatorio | Recibe +1⚡ adicional al aterrizar en propiedades propias |
| 3 | **El Golem de Cristal** | Figura robusta translúcida que refleja colores de distrito | Paga 50% menos al salir de Zona de Estasis |
| 4 | **La Mercader** | Capa colorida, saco brillante de recursos | Recibe +50💰 extra al pasar por El Núcleo |
| 5 | **El Fantasma del Vapor** | Figura etérea, sombrero de copa, engranajes orbitando | Puede atravesar 1 hexágono ocupado por turno (no lo desplaza) |
| 6 | **La Hacker** | Visera de neón, cables conectados al suelo hexagonal | Ve el contenido de la próxima carta de Evento antes de robarla |
| 7 | **El Gato Cibernético** | Felino ágil, collar holográfico, cola de fibra óptica | Una vez por partida puede saltar 1 hexágono ocupado |
| 8 | **El Druida Urbano** | Enredaderas + metal reciclado, flores bioluminiscentes | Clústers propios generan +1⚡ adicional por turno |
| 9 | **La Robot Bailarina** | Porcelana y metal, articulaciones doradas, pose dinámica | El alquiler que cobra tiene +10% si está en su turno exacto de cumpleaños energético (cada 5 turnos) |
| 10 | **El Cuervo Mensajero** | Ave grande, pergamino en pico, lentes de aviador | Teletransporte gratuito a cualquier Portal 1 vez por partida |

---

## 🔓 Personajes Desbloqueables por Logros
Se desbloquean automáticamente al cumplir condiciones de juego. No requieren pago. Generan retención orgánica.

| # | Nombre | Descripción Visual | Condición de Desbloqueo | Habilidad Pasiva |
|---|--------|-------------------|------------------------|-----------------|
| 11 | **El Oráculo Roto** | Figura sin rostro, cristales flotando fragmentados, voz glitcheada | Ganar 3 partidas seguidas | Al inicio de cada turno propio, recibe una pista del próximo Evento del Gremio |
| 12 | **La Baronesa de Hierro** | Armadura art déco, capa de datos fluyendo, corona de antenas | Poseer los 37 hexágonos simultáneamente en cualquier partida | Propiedades hipotecadas siguen generando 25% de alquiler |
| 13 | **El Niño del Núcleo** | Figura infantil translúcida, cables que salen de su espalda hacia el suelo | Aterrizar en El Núcleo exactamente 10 veces en una partida | Recibe el doble de recursos al aterrizar en El Núcleo |
| 14 | **La Sombra Cuántica** | Silueta oscura con partículas de luz dispersas, ojos violeta | Ganar una partida sin comprar ninguna propiedad (estrategia de alquiler puro vía Eventos) | Invisible al sistema de asedio — no puede ser sitiado |
| 15 | **El Coloso de Sal** | Figura gigantesca pixelada, 8-bit sobre entorno 3D, animaciones toscas | Perder 10 partidas — recompensa por persistencia | Nunca entra en quiebra en el primer turno de deuda (segunda oportunidad automática) |
| 16 | **La Tejedora de Redes** | Mujer con hilos de luz entre sus dedos conectando hexágonos | Completar un clúster de cada color en una sola partida | Sus clústers activos parpadean y revelan el color de las propiedades ocultas de rivales |
| 17 | **El Ermitaño del Arco** | Figura encorvada, linterna solar, mapa de Neo-Veridia grabado en su espalda | Jugar 50 partidas totales (win o loss) | Comienza cada partida con +100💰 y +5⚡ extra |
| 18 | **La Reina del Vacío** | Corona de agujero negro, vestido de espacio-tiempo doblado | Ganar una partida de 3 jugadores eliminando a ambos rivales en el mismo turno | Una vez por partida puede anular el efecto de un Evento del Gremio |

---

## 💎 Personajes Premium — Compra In-App
Disponibles en la tienda. Precio sugerido entre $1.99 y $4.99 USD. Habilidades más espectaculares visualmente y ligeramente más complejas estratégicamente.

| # | Nombre | Descripción Visual | Precio | Habilidad Pasiva |
|---|--------|-------------------|--------|-----------------|
| 19 | **NEXUS-7** | IA corporativa encarnada, cuerpo de servidor viviente, pantallas en el torso mostrando datos de todos los jugadores | $2.99 | Al inicio de partida ve los créditos y energía actuales de todos los rivales |
| 20 | **La Emperatriz Solar** | Figura dorada con panel solar en la espalda irradiando luz, corona de plasma | $3.99 | Propiedades mejoradas al nivel 3 generan +3⚡ por turno en vez de 0 |
| 21 | **El Pirata del Vacío** | Parche holográfico, gancho de gravedad, nave mini orbita su cabeza | $2.99 | Una vez por partida puede "robar" 1⚡ de cada rival en el mismo turno |
| 22 | **La Dj Cuántica** | Auriculares gigantes de cristal, vinilo giratorio que distorsiona el espacio hex | $1.99 | Cuando aterriza en propiedad ajena puede pagar con ⚡ en vez de 💰 (tasa 1⚡ = 20💰) |
| 23 | **El Senador Corrupto** | Traje impecable, maleta llena de créditos, sombra con forma diferente a él | $4.99 | Al comprar propiedades paga 15% menos — pero si pierde, el rival gana el doble de créditos finales |
| 24 | **La Bruja del Código** | Grimorio flotante de algoritmos, dedos que escriben en el aire y afectan el tablero | $3.99 | Una vez por partida puede cambiar el tipo de una casilla especial (Portal ↔ Evento ↔ Estasis) |
| 25 | **El Titan Dormido** | Figura enorme que juega "dormida" con efectos de sueño/pesadilla a su alrededor | $2.99 | Cada 10 turnos se "despierta" y cobra alquiler doble durante 3 turnos, luego vuelve a dormir |

---

## 🎭 Pases de Temporada
Cada temporada (90 días) introduce 3-4 personajes exclusivos + tablero temático + efectos de partícula. Al fin de temporada los personajes pasan a la tienda permanente a precio completo. Los jugadores que compraron el pase los retienen para siempre.

**Temporada 1 — "La Gran Tormenta de Datos"**
- Tablero: Neo-Veridia bajo lluvia de datos, hexágonos con efecto glitch
- Personajes exclusivos de temporada: El Profeta de Bits, La Tormenta Encarnada
- Precio pase: $7.99 | Precio unitario post-temporada: $3.99 c/u

---

## 📜 Core Rules & Mechanics

### 🎯 Objective
Ser el último jugador solvente, O controlar ≥60% de los distritos activos cuando el "Reloj del Núcleo" llegue a 0 (máx. 40 turnos totales por partida).

### 💰 Dual Economy
| Recurso | Regeneración | Uso Principal | Validación |
|---------|--------------|---------------|------------|
| 💰 **Créditos** | +200 al pasar/caer en Núcleo | Comprar propiedades, pagar alquileres, multas | `credits >= cost` |
| ⚡ **Energía** | +2 automática por turno | Mejorar propiedades, liberarse de Estasis, pagar multas alternativas, habilidades especiales | `energy >= cost` |

### 🚶 Movement (Hex Advantage)
1. Lanza **1d6**
2. **Selección de Camino:** Elige entre 1-3 hexágonos adyacentes válidos hasta `N` pasos de distancia
3. **Bloqueo Táctico:** No se puede saltar hexágonos ocupados por otros jugadores. Fuerza rutas alternativas o activa mecánica de Asedio

### 🏘️ Properties & Clusters
- Distritos agrupados por **Colores** (3 hexágonos por color)
- **Regla del Clúster:** Poseer 3 hexágonos del mismo color **adyacentes entre sí** → Alquiler x2 + efecto visual de energía fluyendo entre ellos
- **Mejoras:** Cuestan ⚡. Cada nivel aumenta 💰 de alquiler. Máx. nivel 3. Nivel 3 activa glow bloom en R3F

### ⚔️ Asedio (Mecánica Táctica)
- Si 2 fichas del mismo jugador **rodean** un hexágono enemigo por ambos lados adyacentes → **Asedio activo**
- El dueño sitiado no puede mejorar esa propiedad ni hipotecarla mientras dure el asedio
- Visualización: el hexágono sitiado pulsa en rojo con efecto de compresión
- Se levanta cuando el propietario aterriza en él o usa una carta de Evento que lo libere

### 🤝 Pactos de No Agresión
- Cualquier jugador puede proponer un **PNA** a otro: no aterrizar intencionalmente en sus propiedades por 5 turnos
- Romper el PNA tiene penalización: -3⚡ y el rival recibe notificación de traición
- Los PNA expirados aparecen en el log de partida (mecánica social de drama)

### 🎲 Eventos del Gremio — Cartas de Alto Impacto
| Carta | Efecto | Probabilidad |
|-------|--------|-------------|
| **Cortocircuito Masivo** | Todos los distritos mejorados de un color elegido al azar pierden 1 nivel | 8% |
| **Subasta de Emergencia** | Una propiedad sin dueño sale a subasta con timer 15s — todos pujan simultáneamente | 10% |
| **Alianza Forzada** | Los 2 jugadores con menos créditos deben compartir ingresos de alquiler por 3 turnos | 6% |
| **Rebote del Núcleo** | Todos los jugadores reciben +150💰 y +4⚡ del Núcleo por sobrecarga energética | 12% |
| **Zona de Cuarentena** | Un hexágono al azar queda bloqueado e inaccesible por 3 turnos | 9% |
| **Festival de Energía** | Todas las mejoras cuestan 0⚡ durante 2 turnos | 7% |
| **Tormenta de Créditos** | El jugador con más propiedades pierde 200💰 distribuidos entre los demás | 8% |
| **Portal Inestable** | Los Portales cambian de posición aleatoriamente | 5% |
| **Traición del Gremio** | El jugador con más ⚡ pierde la mitad — redistribuida al que tiene menos | 7% |
| **Bonanza Solarpunk** | Todos los clústers completos generan +500💰 extra este turno | 6% |
| **Llamado de la IA** | El jugador IA (o el líder en puntos) pierde su turno por "recalibración" | 5% |
| **Eclipse del Núcleo** | El Núcleo queda inactivo 3 turnos — nadie recibe bonus al pasar | 7% |
| **Evento Neutro** | Flavour text narrativo sin efecto mecánico (inmersión) | 10% |

### 🕐 Eventos de Cuenta Regresiva del Reloj del Núcleo
En turnos clave, ocurren eventos globales automáticos que intensifican la partida:

| Turno | Evento Global |
|-------|--------------|
| **20** | "Primera Advertencia" — El alquiler de todos los distritos aumenta 25% permanentemente |
| **30** | "Apagón Parcial" — La mitad de los Portales se desactivan aleatoriamente |
| **35** | "Crisis Energética" — La regeneración de ⚡ cae a +1 por turno para todos |
| **38** | "Última Subasta" — Todas las propiedades sin dueño se rematan en subasta simultánea |
| **40** | "Hibernación del Núcleo" — Fin de partida, se calcula control de distritos |

### 🎯 Sistema de XP y Niveles de Jugador
Los jugadores acumulan XP para desbloquear personajes de logro y cosmetics:

| Acción | XP |
|--------|-----|
| Ganar partida | +500 |
| Perder partida | +100 |
| Completar un clúster | +75 |
| Causar quiebra a rival | +200 |
| Sobrevivir al turno 35 | +150 |
| Robar carta de Evento | +25 |
| Propuesta de PNA aceptada | +50 |

### 📉 Bankruptcy & Trading
- **Hipoteca:** Recibe 50% valor en 💰. La propiedad deja de generar ⚡ y alquiler
- **Quiebra:** Si tras hipotecar todo `credits < 0` → Eliminado. Propiedades vuelven al banco sin mejoras
- **Negociación:** Intercambio de propiedades/créditos/⚡ fuera de turno mediante propuesta con timer de aceptación de 30 segundos
- **Segunda Oportunidad:** Una vez por partida, el jugador en quiebra puede declarar "Rescate del Gremio" — recibe 100💰 pero pierde su mejor propiedad al banco

### 🎰 Casillas Especiales
| Casilla | Efecto | Resolución |
|---------|--------|------------|
| **El Núcleo** | Salida/Banco | +200💰, +2⚡ |
| **Zona de Estasis** | Pierde 1 turno | Paga 50💰 o 5⚡ para liberarse |
| **Portales** | Teletransporte | Salta a Portal libre elegido por el jugador |
| **Eventos del Gremio** | Roba carta | Ver tabla de Eventos arriba |
| **Distrito Oscuro** | Zona sin dueño posible | Efecto de carta Evento negativo inmediato |

---

## 🛒 Tienda In-App (IAP)

### Estructura de la Tienda
```
Tienda
├── Personajes          → Personajes premium + desbloqueables por logro (preview con animación 3D)
├── Tableros            → Tableros temáticos alternativos (mismo layout, estética diferente)
├── Efectos de Fichas   → Trails, auras, emotes de victoria/derrota
├── Pases de Temporada  → Contenido exclusivo 90 días
└── Pack de Inicio      → Bundle con 3 personajes + 1 tablero a precio especial
```

### Principios de Monetización (No Pay-to-Win)
- Todos los personajes premium tienen habilidades creativas pero **ninguna rompe el balance** — el jugador base puede ganar igualmente
- Las habilidades pasivas son **aditivas**, nunca anulan las mecánicas base
- La ventaja real viene de la **estrategia**, no del personaje comprado
- Siempre habrá contenido gratuito nuevo cada temporada

---

## 🏆 Modos de Juego

| Modo | Descripción | Jugadores | Tiempo estimado |
|------|-------------|-----------|----------------|
| **Duelo Rápido** | Partida 1v1 estándar | 2 | ~20 min |
| **Triángulo** | Partida 1v1v1 con alianzas dinámicas | 3 | ~35 min |
| **Asalto IA** | Humano vs 1-2 IAs | 1+IA | ~15 min |
| **Asíncrono** | Turnos por notificación push — sin tiempo real | 2-3 | Días |
| **Torneo** | Bracket eliminatorio de 4-8 jugadores | 4-8 | Sesión |
| **Modo Espectador** | Ver partidas en vivo de otros jugadores | - | - |

---

## 📱 Funcionalidades Completas de la App

### Autenticación y Perfil
- Login con Google (NextAuth)
- Perfil con avatar, nivel XP, historial de partidas, personaje favorito, winrate
- Colección de personajes desbloqueados (pantalla tipo gacha sin gacha — todo transparente)

### Social
- Lista de amigos (vía Google o ID de usuario)
- Invitación directa por ID corto de sala
- Notificaciones push para turnos async (PWA + Web Push API)
- Chat de sala (mensajes predefinidos para evitar toxicidad) y emotes

### Ranking y Estadísticas
- Ranking global por ELO
- Ranking por temporada (se resetea)
- Estadísticas personales: partidas ganadas/perdidas, personaje más usado, clústers completados, quiebras causadas
- Historial de partidas con replay (rewind visual de la partida)

### Notificaciones Push (PWA)
- "Es tu turno" en partidas async
- "Tu rival te desafió"
- "Nuevo contenido de temporada"
- "Lograste desbloquear [Personaje]"

---

## ⚙️ Technical Translation Matrix

| Regla de Negocio | Módulo en `src/engine/` | Validación / Lógica |
|------------------|-------------------------|---------------------|
| Elección de ruta hexagonal | `pathfinding.ts` | `honeycomb-grid.getNeighbors()`, filtra `occupantId !== null` |
| Regla del Clúster | `economy.ts` | `checkAdjacency(playerId, color)` → `rentMultiplier = 2.0` |
| Economía Dual | `types.ts` + `game-machine.ts` | Schema Zod valida `{credits, energy}` antes de transición |
| Bloqueo de camino / Asedio | `board.ts` | Campo `tile.occupantId` + `siege.ts` calcula adyacencias |
| Eventos / Cartas | `events.ts` | Array tipado con pesos de probabilidad, efecto vía XState `assign()` |
| Habilidades de personaje | `abilities.ts` | Hooks en las transiciones XState, `PassiveAbility` interface |
| XP y niveles | `progression.ts` | Acumulado en Prisma, calculado en Server Action post-partida |
| PNA / Negociación | `diplomacy.ts` | Estado en PartyKit DO, broadcast a todos los clientes |
| Subasta simultánea | `auction.ts` | Timer en PartyKit, bids via WebSocket, resolución server-side |
| Eventos de Cuenta Regresiva | `game-machine.ts` | Guard en XState: `if (turn === 20 | 30 | 35 | 38)` trigger evento global |
| Replay de partida | `replay.ts` | Snapshots de estado en Prisma cada turno, reproducción en cliente |
| IAP / Tienda | `src/app/api/store/` | Stripe o similar, validación server-side, unlock guardado en Prisma |
| Persistencia de partida | `src/partykit/` → `src/app/api/` | HTTP POST a Next.js Server Action al finalizar |

---

## 🏗️ Stack & Architecture Constraints
*(Ver `AGENTS.MD` para normas de código completas)*
- **Autoridad:** PartyKit Durable Object = única fuente de verdad en vivo
- **Persistencia:** Next.js Server Actions + Prisma ORM = writes al inicio/fin + XP/logros
- **Límite Crítico:** Prisma NO corre en PartyKit/Edge. Comunicación vía HTTP bridge
- **IA:** Minimax determinístico (<200ms). Cero LLMs en lógica de juego
- **Render 3D:** React Three Fiber con `dynamic(..., {ssr:false})`. Bloom/FX via postprocessing
- **Mobile-First:** `dvh`, touch ≥48px, portrait nativo, reconexión WS tolerante
- **IAP:** Procesado en Next.js API Route (Node) — nunca en PartyKit
- **Push Notifications:** Web Push API vía Next.js Server Action + VAPID keys, suscripciones en Prisma. No requiere service worker completo ni instalación PWA

---

## 🗺️ Development Roadmap

| Fase | Alcance | Criterio de Éxito |
|------|---------|-------------------|
| **1. Foundation** | NextAuth Google, Prisma schema completo, XState v5 machine, types base | Auth flow funcional + máquina transiciona sin errores |
| **2. Board & Move** | R3F hex renderer, pathfinding, 1d6 + route selection, efectos bloom | Jugador se mueve y elige camino en móvil con visuals 3D |
| **3. Economy & Rules** | Buy, rent, cluster bonus, energy regen, stasis, asedio | Transacciones validadas por Zod, asedio funcional |
| **4. Events & Abilities** | 13 cartas de Evento, habilidades pasivas de 10 personajes base | Eventos ocurren, habilidades se activan automáticamente |
| **5. Multiplayer Live** | PartyKit room, turn sync, PNA, negociación, subasta, WS reconnect | 2-3 humanos juegan partida completa sin bugs |
| **6. AI Integration** | Minimax worker, pesos por dificultad, decisiones con habilidades | IA juega tácticamente <200ms incluyendo habilidades |
| **7. Progression** | XP, niveles, desbloqueo de 8 personajes por logro, sistema de logros | Jugador desbloquea personaje tras cumplir condición real |
| **8. Store & IAP** | Tienda, 7 personajes premium, pase de temporada, Stripe | Compra fluye end-to-end, unlock inmediato post-pago |
| **9. Social & Notifications** | Amigos, ranking ELO, push async, chat con emotes, espectador | Partida async funciona con notificaciones reales en móvil |
| **10. Replay & Polish** | Replay de partidas, Lighthouse mobile ≥90, error boundaries, deploy | Usuario externo juega y vuelve sin intervención |

---

## ✅ Success Criteria (Producto Completo)
- [ ] Partida completa (inicio → fin) sin crashes en cualquier modo
- [ ] Clústers, Asedio, PNA y Economía Dual al 100%
- [ ] 13 cartas de Evento + 4 Eventos de Cuenta Regresiva funcionando
- [ ] 10 habilidades pasivas de personajes base activas y testeadas
- [ ] IA responde en <200ms con decisiones coherentes incluyendo uso de habilidad
- [ ] Reconexión móvil no pierde estado ni turno
- [ ] Subasta simultánea con timer funciona en tiempo real
- [ ] 8 personajes desbloqueables por logro con condiciones validadas
- [ ] Tienda IAP con 7 personajes premium + pase de temporada operativa
- [ ] Push notifications en iOS/Android para turnos async
- [ ] Replay de partidas reproducible
- [ ] Ranking ELO global actualizado al fin de cada partida
- [ ] Cobertura de tests en `src/engine/` ≥ 90%
- [ ] Lighthouse mobile ≥ 90, FID < 100ms

---

## 📝 Notes for AI & Dev Teams
1. Este documento define **QUÉ** hace el juego y **POR QUÉ**. El `AGENTS.MD` define **CÓMO** escribirlo.
2. Nunca hardcodees valores de economía, reglas o precios. Usa constantes tipadas en `src/engine/constants.ts` y `src/config/store.ts`.
3. Si una regla requiere modificación de UI, primero actualiza este `BUSINESS.MD`, luego el schema Zod, luego la UI.
4. Los personajes tienen habilidades pasivas — implementar como `PassiveAbility` interface en `abilities.ts`, no como casos especiales dispersos en el engine.
5. El IAP nunca otorga ventaja determinística. Balance-check cada habilidad premium antes de lanzar.
6. Toda decisión de diseño debe poder traducirse a una transición XState o un schema Zod. Si no puede, simplifícala.
7. Los personajes de temporada se agregan a la tienda permanente al finalizar la temporada — planificar columna `season_exclusive_until` en Prisma.

---
*Última actualización: 2026 | Mantener sincronizado con `AGENTS.MD` y `prisma/schema.prisma`*
