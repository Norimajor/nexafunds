import { useRef, useState } from 'react'
import {
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  VideoConference,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { ArrowUpRight, Heart, MessageCircle, Radio, Send, X } from 'lucide-react'
import { Track } from 'livekit-client'

function ViewerLiveStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  return (
    <div className="lk-video-conference" style={{ height: 'min(72vh, 760px)' }}>
      <GridLayout tracks={tracks}>
        <ParticipantTile />
      </GridLayout>
      <RoomAudioRenderer />
    </div>
  )
}

export default function StreamingLiveRoom({
  stream,
  onClose,
  children,
  likes,
  onDoubleTapLike,
  onInviteCohost,
  cohostInvitation,
  onAcceptCohost,
  invitationBusy,
}) {
  const lastTapRef = useRef(0)
  const currentTokenRef = useRef(stream.token)
  const [candleCount, setCandleCount] = useState(0)
  const [cohostUsername, setCohostUsername] = useState('')
  const isPublisher = stream.isHost || stream.isCohost
  currentTokenRef.current = stream.token

  const handleLikeTap = () => {
    const tappedAt = Date.now()
    if (tappedAt - lastTapRef.current <= 350) {
      setCandleCount((count) => count + 1)
      onDoubleTapLike()
    }
    lastTapRef.current = tappedAt
  }

  const handleStageTap = (event) => {
    if (event.target.closest('button, input, textarea, select, [role="button"]')) return
    handleLikeTap()
  }

  const inviteCohost = (event) => {
    event.preventDefault()
    const username = cohostUsername.trim().replace(/^@/, '')
    if (!username) return
    onInviteCohost(username)
    setCohostUsername('')
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3 sm:p-6">
      <style>{`
        @keyframes bull-candle-rise {
          0% { opacity: 0; transform: translateY(18px) scale(.7); }
          18% { opacity: 1; }
          78% { opacity: 1; transform: translateY(-54px) scale(1); }
          100% { opacity: 0; transform: translateY(-76px) scale(.92); }
        }
      `}</style>
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-[#eac16e]/20 bg-[#081211] shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#f3f1e9]">{stream.title}</p>
            <p className="text-xs text-[#a8b0a9]">
              {stream.isHost
                ? 'You are live as the owner. You can invite a cohost to publish.'
                : stream.isCohost
                  ? 'You are a cohost. Your camera and microphone are enabled.'
                  : 'You are watching as a viewer. Only the owner and invited cohosts can publish.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-[#d1d5cc] hover:bg-white/10"
            aria-label="Leave live stream"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative" onClick={handleStageTap}>
            <LiveKitRoom
              key={stream.token}
              serverUrl={stream.livekitUrl}
              token={stream.token}
              connect
              audio={isPublisher}
              video={isPublisher}
              onDisconnected={() => {
                if (currentTokenRef.current === stream.token) onClose()
              }}
              data-lk-theme="default"
              style={{ height: 'min(72vh, 760px)' }}
            >
              {isPublisher ? <VideoConference /> : <ViewerLiveStage />}
            </LiveKitRoom>
            <div className="absolute right-4 top-4 z-10">
              {candleCount > 0 && (
                <div
                  key={candleCount}
                  className="pointer-events-none absolute -top-16 left-1/2 flex -translate-x-1/2 flex-col items-center text-emerald-300"
                  style={{ animation: 'bull-candle-rise 1.15s ease-out forwards' }}
                  aria-hidden="true"
                >
                  <ArrowUpRight size={24} strokeWidth={3} />
                  <span className="relative my-1 h-7 w-3 rounded-sm bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.65)] before:absolute before:left-1/2 before:top-[-7px] before:h-11 before:w-px before:-translate-x-1/2 before:bg-emerald-300 after:absolute after:left-1/2 after:bottom-[-7px] after:h-11 after:w-px after:-translate-x-1/2 after:bg-emerald-300" />
                </div>
              )}
              <button
                type="button"
                onClick={handleLikeTap}
                className="flex min-w-20 flex-col items-center gap-1 rounded-2xl border border-rose-300/20 bg-[#111a17]/95 px-4 py-3 text-rose-300 shadow-lg transition hover:scale-105 hover:bg-rose-500/10 active:scale-95"
                aria-label={`Double tap to like. ${Number(likes || 0).toLocaleString()} live likes`}
              >
                <Heart size={22} fill="currentColor" />
                <span className="text-xs font-bold">{Number(likes || 0).toLocaleString()}</span>
                <span className="text-[9px] uppercase tracking-wide">Double-tap</span>
              </button>
            </div>
          </div>
          <aside className="flex max-h-[min(72vh,760px)] flex-col border-t border-white/10 p-4 lg:border-l lg:border-t-0">
            {stream.isHost && (
              <form onSubmit={inviteCohost} className="mb-4 rounded-xl border border-[#eac16e]/15 bg-[#101a16] p-3">
                <label htmlFor="live-cohost-username" className="mb-2 block text-xs font-semibold text-[#d1d5cc]">
                  Invite a cohost by username
                </label>
                <div className="flex gap-2">
                  <input
                    id="live-cohost-username"
                    value={cohostUsername}
                    onChange={(event) => setCohostUsername(event.target.value)}
                    maxLength={40}
                    pattern="@?[a-zA-Z0-9_]{3,40}"
                    placeholder="@username"
                    required
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0b1512] px-3 py-2 text-sm text-white outline-none focus:border-[#eac16e]/50"
                  />
                  <button
                    type="submit"
                    disabled={invitationBusy}
                    className="rounded-lg bg-[#eac16e] px-3 text-[#0b100e] disabled:opacity-50"
                    aria-label="Invite cohost"
                  >
                    <Send size={15} />
                  </button>
                </div>
                {cohostInvitation && <p className="mt-2 text-xs text-[#5bd1a7]">{cohostInvitation}</p>}
              </form>
            )}
            {!stream.isHost && cohostInvitation && !stream.isCohost && (
              <div className="mb-4 rounded-xl border border-[#eac16e]/20 bg-[#eac16e]/10 p-3">
                <p className="text-xs text-[#f3f1e9]">The stream owner invited you to cohost.</p>
                <button
                  type="button"
                  onClick={onAcceptCohost}
                  disabled={invitationBusy}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#eac16e] px-3 py-2 text-xs font-bold text-[#0b100e] disabled:opacity-50"
                >
                  <Radio size={14} /> {invitationBusy ? 'Joining…' : 'Accept cohost invite'}
                </button>
              </div>
            )}
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MessageCircle size={16} className="text-[#eac16e]" /> Live chat
            </p>
            {children}
          </aside>
        </div>
      </div>
    </div>
  )
}
