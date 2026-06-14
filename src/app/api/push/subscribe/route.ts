import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { PushSubscribeBodySchema } from '@/engine/schemas'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await req.json()
  const parsed = PushSubscribeBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  }

  const { endpoint, p256dh, auth: authKey } = parsed.data

  await prisma.pushSubscription.upsert({
    where:  { endpoint },
    update: { p256dh, auth: authKey },
    create: {
      userId:   session.user.id,
      endpoint,
      p256dh,
      auth:     authKey,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { endpoint } = (await req.json()) as { endpoint?: string }
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
