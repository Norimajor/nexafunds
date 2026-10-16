import { useRef, useState } from 'react'
import {
  ConnectionQualityIndicator,
  GridLayout,
  LiveKitRoom,
  ParticipantPlaceholder,
  ParticipantTile,
  RoomAudioRenderer,
  TrackToggle,
  useParticipantInfo,
  useParticipants,
  useTracks,
  VideoTrack,
} from '@livekit/components-react'
import '@livekit/components-styles'
import {
  ArrowUpRight,
  Eye,
  Heart,
  MessageCircle,
  Mic,
  MonitorUp,
  Radio,
  Share2,
  Users,
  Video,
  X,
} from 'lucide-react'
import { Track } from 'livekit-client'

function CreatorVerificationBadge() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-label="Verified creator"
      role="img"
      className="h-[18px] w-[18px] shrink-0 drop-shadow-[0_0_5px_rgba(234,193,110,.65)]"
    >
      <path
        d="m12 1.8 2.1 1.5 2.6-.3 1 2.4 2.4 1-.3 2.6 1.5 2.1-1.5 2.1.3 2.6-2.4 1-1 2.4-2.6-.3-2.1 1.5-2.1-1.5-2.6.3-1-2.4-2.4-1 .3-2.6L2.7 11l1.5-2.1-.3-2.6 2.4-1 1-2.4 2.6.3z"
        fill="#eab84f"
        stroke="#ffdd83"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="m8.2 11.8 2.5 2.5 5.2-5.3"
        fill="none"
        stroke="#fff8e7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CreatorParticipantName() {
  const { name, identity } = useParticipantInfo()
  const participantName = name || identity || 'Creator'
  const isVerified = participantName.endsWith(' ✓')
  const username = isVerified ? participantName.slice(0, -2) : participantName

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#d7a83f]/75 bg-[#11100e]/90 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_14px_rgba(234,193,110,.16)] backdrop-blur-sm">
      <span className="truncate">{username}</span>
      {isVerified && <CreatorVerificationBadge />}
    </span>
  )
}

function LiveParticipantTile() {
  return (
    <ParticipantTile>
      <>
        <VideoTrack />
        <div className="lk-participant-placeholder">
          <ParticipantPlaceholder />
        </div>
        <div className="lk-participant-metadata">
          <div className="lk-participant-metadata-item">
            <CreatorParticipantName />
          </div>
          <ConnectionQualityIndicator className="lk-participant-metadata-item" />
        </div>
      </>
    </ParticipantTile>
  )
}

function LiveStage({ publisher }) {
  const audienceCount = useParticipants().filter(
    (participant) => participant.permissions?.canPublish === false
  ).length
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  return (
    <div className="lk-video-conference h-full min-h-0">
      <GridLayout tracks={tracks}>
        <LiveParticipantTile />
      </GridLayout>
      <RoomAudioRenderer />
      <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
        <Eye size={14} /> {audienceCount.toLocaleString()}
      </div>
      {publisher && (
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-black/70 p-2 shadow-xl backdrop-blur">
          <TrackToggle
            source={Track.Source.Microphone}
            showIcon={false}
            aria-label="Toggle microphone"
            title="Toggle microphone"
            className="rounded-xl border border-white/10 bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <Mic size={18} />
          </TrackToggle>
          <TrackToggle
            source={Track.Source.Camera}
            showIcon={false}
            aria-label="Toggle camera"
            title="Toggle camera"
            className="rounded-xl border border-white/10 bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <Video size={18} />
          </TrackToggle>
          <TrackToggle
            source={Track.Source.ScreenShare}
            showIcon={false}
            aria-label="Share screen"
            title="Share screen"
            className="rounded-xl border border-[#eac16e]/40 bg-[#eac16e] p-3 text-[#15110a] hover:bg-[#f3d28c]"
          >
            <MonitorUp size={18} />
          </TrackToggle>
        </div>
      )}
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
  onFollow,
  followingBusy,
}) {
  const lastTapRef = useRef(0)
  const currentTokenRef = useRef(stream.token)
  const [candleCount, setCandleCount] = useState(0)
  const [cohostUsername, setCohostUsername] = useState('')
  const [shareNotice, setShareNotice] = useState('')
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

  const shareLive = async () => {
    const shareUrl = new URL('/streaming', window.location.origin)
    shareUrl.searchParams.set('live', stream.id)
    const shareData = { title: `${stream.username} is live on NexaFunds`, url: shareUrl.toString() }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setShareNotice('Live link shared.')
      } else {
        await navigator.clipboard.writeText(shareData.url)
        setShareNotice('Live link copied. Share it with your viewers.')
      }
    } catch (shareError) {
      if (shareError.name !== 'AbortError') {
        setShareNotice('Could not share the live link. Please try again.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#050606]/95 p-2 text-white sm:p-4">
      <style>{`
        @keyframes bull-candle-rise {
          0% { opacity: 0; transform: translateY(18px) scale(.7); }
          18% { opacity: 1; }
          78% { opacity: 1; transform: translateY(-54px) scale(1); }
          100% { opacity: 0; transform: translateY(-76px) scale(.92); }
        }
      `}</style>
      <div className="flex h-[min(96vh,1000px)] w-full max-w-[1600px] flex-col overflow-hidden rounded-[26px] border border-[#d7a83f]/30 bg-[#0b0b0c] shadow-[0_24px_100px_rgba(0,0,0,.75)]">
        <header className="flex min-h-[76px] items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#eac16e]/55 bg-[#15120b] text-sm font-black italic text-[#eac16e]">
            N
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="max-w-[22rem] truncate text-sm font-bold sm:text-base">
                {stream.username || 'Creator'}
              </h1>
              {stream.is_verified && <CreatorVerificationBadge />}
              <span className="rounded-lg bg-rose-600 px-2.5 py-1 text-[10px] font-extrabold tracking-wide">LIVE</span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/80">
                <Users size={13} /> {Number(stream.followers || 0).toLocaleString()} followers
              </span>
            </div>
            <p className="truncate text-xs text-white/50">{stream.title || 'Live trading session'}</p>
          </div>
          {!stream.isHost && Boolean(stream.username) && (
            <button
              type="button"
              onClick={onFollow}
              disabled={followingBusy}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 sm:px-5 sm:text-sm ${
                stream.is_following
                  ? 'border-white/15 text-white/70 hover:bg-white/10'
                  : 'border-[#eac16e] text-[#eac16e] hover:bg-[#eac16e]/10'
              }`}
            >
              {followingBusy ? 'Updating…' : stream.is_following ? 'Following' : 'Follow'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void shareLive()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 transition hover:border-[#eac16e]/60 hover:text-[#eac16e] sm:px-4 sm:text-sm"
            aria-label="Share live stream link"
          >
            <Share2 size={15} />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Leave live stream"
          >
            <X size={22} />
          </button>
        </header>
        {shareNotice && (
          <p role="status" className="border-b border-[#eac16e]/20 bg-[#eac16e]/10 px-5 py-2 text-center text-xs text-[#f1d48e]">
            {shareNotice}
          </p>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(260px,42%)] lg:grid-cols-[minmax(0,1fr)_350px] lg:grid-rows-1">
          <main className="flex min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="relative min-h-0 flex-1 overflow-hidden bg-black" onClick={handleStageTap}>
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
                style={{ height: '100%', width: '100%' }}
              >
                <LiveStage publisher={isPublisher} />
              </LiveKitRoom>

              <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[75%] rounded-2xl border border-white/10 bg-black/65 px-4 py-3 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">{stream.title || 'Live trading session'}</p>
              </div>
              <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-4">
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
                  className="flex min-w-[62px] flex-col items-center gap-1 rounded-2xl bg-black/55 px-3 py-2 text-rose-400 backdrop-blur transition hover:scale-105 hover:bg-black/75 active:scale-95"
                  aria-label={`Double tap to like. ${Number(likes || 0).toLocaleString()} live likes`}
                >
                  <Heart size={28} fill="currentColor" />
                  <span className="text-xs font-bold text-white">{Number(likes || 0).toLocaleString()}</span>
                </button>
                <div className="flex min-w-[62px] flex-col items-center gap-1 rounded-2xl bg-black/55 px-3 py-2 text-white/90 backdrop-blur">
                  <MessageCircle size={25} />
                  <span className="text-[10px]">Chat</span>
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-xl bg-black/45 px-3 py-2 text-xs text-white/75 backdrop-blur-sm">
                {isPublisher
                  ? stream.isHost ? 'You are live · only publishers appear on stage' : 'You are cohosting'
                  : 'You are watching as a viewer'}
              </div>
            </div>
            {stream.isHost && (
              <form onSubmit={inviteCohost} className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-[#101011] px-4 py-3">
                <label htmlFor="live-cohost-username" className="hidden text-xs text-white/60 sm:block">
                  Invite cohost
                </label>
                <input
                  id="live-cohost-username"
                  value={cohostUsername}
                  onChange={(event) => setCohostUsername(event.target.value)}
                  maxLength={40}
                  pattern="@?[a-zA-Z0-9_]{3,40}"
                  placeholder="@username"
                  required
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#eac16e]/60"
                />
                <button
                  type="submit"
                  disabled={invitationBusy}
                  className="rounded-xl bg-[#eac16e] px-4 py-2 text-sm font-semibold text-[#15110a] disabled:opacity-50"
                >
                  {invitationBusy ? 'Sending…' : 'Invite'}
                </button>
                {cohostInvitation && <span className="hidden text-xs text-emerald-300 xl:inline">{cohostInvitation}</span>}
              </form>
            )}
            {!stream.isHost && cohostInvitation && !stream.isCohost && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#eac16e]/20 bg-[#eac16e]/10 px-4 py-3">
                <p className="text-xs text-white">The stream owner invited you to cohost.</p>
                <button
                  type="button"
                  onClick={onAcceptCohost}
                  disabled={invitationBusy}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#eac16e] px-3 py-2 text-xs font-bold text-[#15110a] disabled:opacity-50"
                >
                  <Radio size={14} /> {invitationBusy ? 'Joining…' : 'Accept invite'}
                </button>
              </div>
            )}
          </main>

          <aside className="flex min-h-0 flex-col bg-[#0d0d0e]">
            <div className="flex h-[62px] shrink-0 items-center border-b border-white/10 px-5">
              <div className="flex h-full items-center border-b-2 border-[#eac16e] px-2 text-sm font-semibold">
                Live chat
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">
              {children}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
