# AGENTS.MD - HexEstate Development Guidelines

## Project Overview
HexEstate is a hexagonal board game (Monopoly-like) built with Next.js (App Router), React, TypeScript, and PartyKit on Cloudflare Workers.
Players authenticate via Google (NextAuth/Auth.js), create/join temporary rooms via short IDs, and play turn-based matches against humans or AI.
The app is a **responsive web application** (mobile-first, no PWA). Push notifications for async turns are delivered via Web Push API + VAPID keys — no service worker installation required.

## Tech Stack (Version-Agnostic)
- **Framework:** Next.js (Latest Stable, App Router, Turbopack)
- **UI Library:** React (Latest Stable, Server Components default)
- **Language:** TypeScript (Latest Stable, Strict Mode, no `any`)
- **Styling:** Tailwind CSS (Latest Stable, CSS-first config)
- **UI Components:** shadcn/ui (Latest) + CVA
- **Realtime:** PartyKit (Cloudflare Workers Durable Objects)
- **Auth:** NextAuth / Auth.js (Latest Stable, App Router compatible)
- **Database:** Neon Postgres + Prisma ORM (Latest Stable)
- **State Machine:** XState (Latest v5+, Shared isomorphic machines)
- **Validation:** Zod (Latest Stable, Edge-native)
- **AI:** Classical Minimax + Heuristics (NO LLMs for gameplay)
- **Hex Math:** honeycomb-grid (Latest Stable, Pure TS)
- **3D Renderer:** @react-three/fiber (Latest Stable, Client-only via `dynamic()`)
- **3D Helpers:** @react-three/drei (Latest Stable — Text, Float, PerspectiveCamera, etc.)
- **Visual FX:** @react-three/postprocessing (Latest Stable — Bloom, ChromaticAberration para efecto neón)
- **UI Animations:** motion (Latest Stable — animaciones fuera del canvas: fichas, paneles, transiciones)
- **Testing:** Vitest (Latest Stable)
- **Package Manager:** pnpm (Latest Stable)

> ⚠️ **VERSION POLICY:** Always use the latest stable version of every library. Never hardcode version numbers. Consult official docs when uncertain.

## Architecture Rules (NON-NEGOTIABLE)
1.  **Isomorphic Engine:** All game logic in `src/engine/` must be pure TS. Zero React/Node deps. Runs in browser AND Cloudflare Workers.
2.  **Server Authority:** Client NEVER modifies game state. Client sends intents → PartyKit validates via Zod + XState → Broadcasts state.
3.  **Prisma & PartyKit Boundary:** Prisma ORM runs ONLY in Next.js Server Actions/API Routes (Node runtime). PartyKit (Edge/Workers) CANNOT import Prisma directly. PartyKit persists data by calling Next.js API endpoints or using lightweight Edge-compatible DB drivers (e.g., @neondatabase/serverless) for direct writes if needed.
4.  **DB is for Persistence Only:** Live state lives ONLY in PartyKit Durable Object memory. DB writes on room creation/game end only. Never read DB during active gameplay.
5.  **No LLMs for AI:** Deterministic Minimax <200ms. Never LLM APIs for gameplay decisions.
6.  **Mobile First:** Portrait mode. Touch targets ≥48px. `dvh` units. iOS Safe Area support.
7.  **Type Safety:** Shared types in `src/engine/types.ts`. Zod schemas = single source of truth. Prisma generated types are secondary to Zod for runtime validation.
8.  **Edge Compatibility:** No Node.js APIs in engine/partykit. Web Standards API only.
9.  **R3F Client-Only:** `BoardCanvas` and ALL `@react-three/fiber` imports MUST be loaded with `dynamic(() => import(...), { ssr: false })`. Never import R3F in a Server Component or at module level in a shared file.
10. **Render Layer is Read-Only:** The 3D canvas reads XState context/snapshot only. Zero game logic, zero state mutations, zero `useReducer`/`useState` for game data inside canvas components. `useFrame()` and `useThree()` are allowed only inside children of `<Canvas>`.

## Folder Structure Contract
-   `src/engine/` → Pure game logic, XState machine, AI, hex math
-   `src/partykit/` → PartyKit Room (Durable Object), AI worker (NO Prisma imports)
-   `src/app/(game)/[roomId]/` → Game UI (Client Component)
-   `src/app/(lobby)/` → Lobby flows
-   `src/app/api/` → Next.js API routes for Prisma persistence (called by PartyKit)
-   `src/auth/` → NextAuth configuration, session helpers
-   `src/components/board/` → R3F Canvas, hex mesh renderer, token animations, postprocessing
-   `src/components/board/BoardCanvas.tsx` → Entry point lazy-loaded with `dynamic(..., {ssr:false})`
-   `src/components/board/HexTile.tsx` → Individual hex mesh (reads tile state, no mutations)
-   `src/components/board/PlayerToken.tsx` → Animated player piece mesh
-   `src/components/ui/` → shadcn/ui panels, HUD, modals (DOM layer, outside canvas)
-   `src/hooks/` → PartyKit connection, auth, derived state
-   `prisma/` → Schema, migrations, seed scripts

## Code Generation Preferences
-   Functional patterns preferred (except PartyKit Durable Object class)
-   Named exports only
-   JSDoc on all public engine functions
-   Vitest tests generated alongside engine code
-   Use latest XState v5+ `setup()` syntax (never legacy v4 API)
-   Use honeycomb-grid helpers only (never manual hex math)
-   Use `server-only` package to prevent server code leakage
-   Leverage latest React features: `use()` hook, Server Actions, Suspense
-   Tailwind CSS-first configuration (no JS/TS config file)
-   NextAuth App Router handlers in `src/app/api/auth/[...nextauth]/route.ts`
-   R3F canvas entry always via `dynamic(() => import('@/components/board/BoardCanvas'), { ssr: false })`
-   Use `@react-three/drei` helpers (Text, Float, PerspectiveCamera, Html) before writing custom Three.js
-   Postprocessing effects (Bloom, ChromaticAberration) via `@react-three/postprocessing` EffectComposer
-   UI animations (token move, card draw, panel transitions) via `motion` outside canvas, never inside R3F

## Common Pitfalls to Avoid
-   ❌ Importing Prisma Client in PartyKit/Edge runtime (WILL FAIL)
-   ❌ Storing game state in React useState/useReducer
-   ❌ Reading Prisma DB during active turns
-   ❌ LLM API calls for AI decisions
-   ❌ Manual hex coordinate arithmetic
-   ❌ `vh` CSS units (always use `dvh`)
-   ❌ Node.js built-ins in edge-compatible code
-   ❌ Legacy XState v4 syntax
-   ❌ Tailwind JS/TS config file
-   ❌ Hardcoding library version numbers
-   ❌ Importing `@react-three/fiber` or `@react-three/drei` in a Server Component (build crash)
-   ❌ Forgetting `{ ssr: false }` in `dynamic()` for BoardCanvas (hydration mismatch)
-   ❌ Using `useFrame()` or `useThree()` outside a `<Canvas>` subtree (runtime error)
-   ❌ Adding game logic or XState dispatches inside R3F mesh components (violates render-only rule)
-   ❌ Wrapping `<Canvas>` in a Suspense boundary without a fallback (invisible crash on slow loads)
-   ❌ Implementar PWA / service worker — la app es responsive web pura; las notificaciones push van por Web Push API directamente
-   ❌ Usar `next-pwa` o cualquier service worker wrapper
