"use client";

import { Participant, supabase } from '@/types/types'
import { useQRCode } from 'next-qrcode'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Lobby({
  participants: participants,
  gameId,
}: {
  participants: Participant[]
  gameId: string
}) {
  const { Canvas } = useQRCode()
  const router = useRouter()

  const onClickStartGame = async () => {
    console.log('gameId:', gameId);
    const { data, error } = await supabase
      .from('games')
      .update({ phase: 'quiz' })
      .eq('id', gameId)
    console.log('update data:', data, 'error:', error);
    if (error) {
      return alert(error.message)
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    const channel = supabase
      .channel('game-phase')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          if (payload.new.phase === 'quiz') {
            router.push(`/host/game/${gameId}/quiz`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="flex justify-between m-auto bg-black p-12">
        <div className="w-96">
          <div className="flex justify-start flex-wrap pb-4">
            {participants.map((participant) => (
              <div
                className="text-xl m-2 p-2 bg-green-500"
                key={participant.id}
              >
                {participant.nickname}
              </div>
            ))}
          </div>

          <button
            className="mx-auto bg-white py-4 px-12 block text-black"
            onClick={onClickStartGame}
          >
            Start Game
          </button>
        </div>
        <div className="pl-4">
          {/* <img src="/qr.png" alt="QR code" /> */}
          <Canvas
            text={`${baseUrl}/game/${gameId}`}
            options={{
              errorCorrectionLevel: 'M',
              margin: 3,
              scale: 4,
              width: 400,
            }}
          />
        </div>
      </div>
    </div>
  )
}
