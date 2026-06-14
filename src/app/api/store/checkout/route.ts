import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { auth } from '@/auth'
import { getProduct } from '@/lib/store'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
}

const CheckoutBodySchema = z.object({
  productId: z.string(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await req.json()
  const parsed = CheckoutBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const product = getProduct(parsed.data.productId)
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(product.priceUsd * 100),
          product_data: {
            name: product.name,
            description: product.description,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId:    session.user.id,
      productId: product.id,
      itemType:  product.type.toUpperCase(),
    },
    success_url: `${baseUrl}/store?success=1`,
    cancel_url:  `${baseUrl}/store?cancelled=1`,
  })

  return NextResponse.json({ url: checkoutSession.url })
}
