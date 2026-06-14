import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-05-27.dahlia',
})

export async function POST(req: Request) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const { userId, productId, itemType } = session.metadata ?? {}

  if (!userId || !productId || !itemType) {
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
  }

  const amountUsd = (session.amount_total ?? 0) / 100

  // Record purchase (idempotent via stripeId unique constraint)
  await prisma.purchase.upsert({
    where:  { stripeId: session.id },
    update: {},
    create: {
      userId,
      itemType: itemType as 'CHARACTER' | 'BOARD_SKIN' | 'SEASON_PASS' | 'STARTER_PACK',
      itemId:   productId,
      amountUsd,
      stripeId: session.id,
    },
  })

  // Unlock character if applicable
  if (itemType === 'CHARACTER') {
    const character = await prisma.character.findFirst({
      where: { slug: productId.replace(/^char-/, '') },
    })
    if (character) {
      await prisma.userCharacter.upsert({
        where: {
          userId_characterId: { userId, characterId: character.id },
        },
        update: {},
        create: {
          userId,
          characterId: character.id,
          source:      'PURCHASE',
        },
      })
    }
  }

  // Starter pack: unlock all three base premium characters (Amo del Caos, Señor del Tiempo, Reina de Circuitos)
  if (itemType === 'STARTER_PACK') {
    const starterSlugs = ['el-amo-del-caos', 'el-senor-del-tiempo', 'la-reina-de-circuitos']
    const characters = await prisma.character.findMany({
      where: { slug: { in: starterSlugs } },
    })
    await Promise.all(
      characters.map(char =>
        prisma.userCharacter.upsert({
          where: { userId_characterId: { userId, characterId: char.id } },
          update: {},
          create: { userId, characterId: char.id, source: 'PURCHASE' },
        }),
      ),
    )
  }

  return NextResponse.json({ ok: true })
}
