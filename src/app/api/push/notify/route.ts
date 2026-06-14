import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushNotification } from '@/lib/push'

// Internal endpoint — only callable with PARTYKIT_SECRET
export async function POST(req: Request) {
  const secret = req.headers.get('x-partykit-secret')
  if (secret !== process.env.PARTYKIT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, title, body, url } = (await req.json()) as {
    userId?: string
    title?:  string
    body?:   string
    url?:    string
  }

  if (!userId || !title || !body) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  const results = await Promise.allSettled(
    subs.map(s => sendPushNotification({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, title, body, url)),
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed })
}
