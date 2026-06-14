'use client'

import dynamic from 'next/dynamic'

const RoomClient = dynamic(
  () => import('./RoomClient').then(m => m.RoomClient),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-dvh bg-[#0a0a0f] flex items-center justify-center text-cyan-400 font-mono">
        Conectando a sala…
      </div>
    ),
  },
)

interface Props {
  roomId:        string
  userId:        string
  userName:      string
  characterSlug: string
}

export function RoomClientLoader(props: Props) {
  return <RoomClient {...props} />
}
