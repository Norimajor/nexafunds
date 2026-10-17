import { useEffect, useRef, useState } from 'react'
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
  useConnectionState,
  useTracks,
  VideoTrack,
} from '@livekit/components-react'
import '@livekit/components-styles'
import {
  ArrowUpRight,
  Check,
  Eye,
  Gift,
  Heart,
  MessageCircle,
  Mic,
  MonitorUp,
  MoreHorizontal,
  Radio,
  Share2,
  Square,
  Users,
  Video,
  X,
  UserPlus,
} from 'lucide-react'
import { ConnectionState, Track } from 'livekit-client'

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

function LiveStage({ publisher, controlsOpen, onDeviceError }) {
  const audienceCount = useParticipants().filter(
    (participant) => participant.permissions?.canPublish === false
  ).length
  const connectionState = useConnectionState()
  const screenShareSupported = Boolean(navigator.mediaDevices?.getDisplayMedia)
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  return (
    <div className={`lk-video-conference absolute inset-0 h-full min-h-0 ${publisher && tracks.length === 2 ? 'live-room-cohost-stage' : ''}`}>
      {tracks.length > 0 ? (
        <GridLayout tracks={tracks}>
          <LiveParticipantTile />
        </GridLayout>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#080a09] px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#eac16e]/30 bg-[#eac16e]/10 text-[#eac16e]">
            <Radio size={26} />
          </div>
          <p className="text-sm font-semibold text-white">Waiting for video</p>
          <p className="max-w-xs text-xs leading-relaxed text-white/60">
            {connectionState !== ConnectionState.Connected
              ? 'Connecting to the live stream…'
              : publisher
                ? 'Your live connection is active. Turn on your camera or share your screen to appear.'
                : 'The live connection is active. Video will appear when the creator starts a camera or screen share.'}
          </p>
        </div>
      )}
      <RoomAudioRenderer />
      <div className="absolute right-3 top-[max(5.25rem,calc(env(safe-area-inset-top)+4rem))] z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md sm:right-5">
        <Eye size={14} /> {audienceCount.toLocaleString()}
      </div>
      <div className="absolute left-3 top-[max(5.25rem,calc(env(safe-area-inset-top)+4rem))] z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-1.5 text-[10px] font-semibold text-white/90 shadow-lg backdrop-blur-md sm:left-5">
        <span className={`live-room-motion h-1.5 w-1.5 rounded-full ${connectionState === ConnectionState.Connected ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,.8)]' : connectionState === ConnectionState.Reconnecting ? 'animate-pulse bg-amber-300' : 'animate-pulse bg-white/60'}`} />
        {connectionState === ConnectionState.Connected
          ? 'LIVE'
          : connectionState === ConnectionState.Reconnecting
            ? 'Reconnecting'
            : connectionState === ConnectionState.Disconnected
              ? 'Disconnected'
              : 'Connecting'}
      </div>
      {publisher && controlsOpen && (
        <div data-live-overlay className="absolute right-3 top-[max(8.75rem,calc(env(safe-area-inset-top)+7.5rem))] z-40 flex items-center gap-2 rounded-2xl border border-white/15 bg-black/65 p-2 shadow-xl backdrop-blur-xl sm:right-5">
          <TrackToggle
            source={Track.Source.Microphone}
            showIcon={false}
            aria-label="Toggle microphone"
            title="Toggle microphone"
            onDeviceError={onDeviceError}
            className="live-control-toggle min-h-11 min-w-11 rounded-xl border border-white/15 bg-white/10 p-3 text-white transition hover:bg-white/20 data-[lk-enabled=true]:border-emerald-300/60 data-[lk-enabled=true]:bg-emerald-400/15 data-[lk-enabled=false]:border-rose-400/60 data-[lk-enabled=false]:bg-rose-500/20 data-[lk-enabled=false]:text-rose-200"
          >
            <Mic size={18} />
          </TrackToggle>
          <TrackToggle
            source={Track.Source.Camera}
            showIcon={false}
            aria-label="Toggle camera"
            title="Toggle camera"
            onDeviceError={onDeviceError}
            className="live-control-toggle min-h-11 min-w-11 rounded-xl border border-white/15 bg-white/10 p-3 text-white transition hover:bg-white/20 data-[lk-enabled=true]:border-emerald-300/60 data-[lk-enabled=true]:bg-emerald-400/15 data-[lk-enabled=false]:border-rose-400/60 data-[lk-enabled=false]:bg-rose-500/20 data-[lk-enabled=false]:text-rose-200"
          >
            <Video size={18} />
          </TrackToggle>
          <TrackToggle
            source={Track.Source.ScreenShare}
            showIcon={false}
            aria-label="Toggle screen sharing"
            title={screenShareSupported ? 'Toggle screen sharing' : 'Screen sharing is not supported by this browser'}
            disabled={!screenShareSupported}
            onDeviceError={onDeviceError}
            className="live-control-toggle live-screen-toggle min-h-11 min-w-11 rounded-xl border border-[#eac16e]/40 bg-[#eac16e]/15 p-3 text-[#f1d48e] transition hover:bg-[#eac16e]/25 disabled:cursor-not-allowed disabled:opacity-40"
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
  chatContent,
  giftContent,
  giftFeedback,
  errorMessage,
  likes,
  commentsCount,
  onFocusComposer,
  onDoubleTapLike,
  onInviteCohost,
  cohostInvitation,
  onAcceptCohost,
  onDismissError,
  onEndLive,
  endingLive,
  invitationBusy,
  onFollow,
  followingBusy,
}) {
  const lastTapRef = useRef(0)
  const currentTokenRef = useRef(stream.token)
  const [candleCount, setCandleCount] = useState(0)
  const [cohostUsername, setCohostUsername] = useState('')
  const [shareNotice, setShareNotice] = useState('')
  const [streamError, setStreamError] = useState('')
  const [viewport, setViewport] = useState(null)
  const [showControls, setShowControls] = useState(false)
  const [showGifts, setShowGifts] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const isPublisher = stream.isHost || stream.isCohost
  currentTokenRef.current = stream.token

  useEffect(() => {
    const visualViewport = window.visualViewport
    if (!visualViewport) return undefined

    const updateViewport = () => {
      const nextViewport = {
        height: visualViewport.height,
        offsetTop: visualViewport.offsetTop,
      }
      setViewport((current) => (
        current?.height === nextViewport.height && current?.offsetTop === nextViewport.offsetTop
          ? current
          : nextViewport
      ))
    }

    updateViewport()
    visualViewport.addEventListener('resize', updateViewport)
    visualViewport.addEventListener('scroll', updateViewport)
    window.addEventListener('resize', updateViewport)
    return () => {
      visualViewport.removeEventListener('resize', updateViewport)
      visualViewport.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  const handleLikeTap = () => {
    const tappedAt = Date.now()
    if (tappedAt - lastTapRef.current <= 350) {
      setCandleCount((count) => count + 1)
      onDoubleTapLike()
    }
    lastTapRef.current = tappedAt
  }

  const handleStageTap = (event) => {
    if (event.target.closest('button, input, textarea, select, [role="button"], [data-live-overlay]')) return
    handleLikeTap()
  }

  const handleDeviceError = (error) => {
    setStreamError(error.message || 'Unable to access the selected media device. Check browser permissions and try again.')
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
    <div
      className="fixed inset-x-0 z-[70] overflow-hidden bg-black text-white"
      style={{
        top: viewport ? `${viewport.offsetTop}px` : 0,
        height: viewport ? `${viewport.height}px` : '100dvh',
      }}
    >
      <style>{`
        @keyframes bull-candle-rise {
          0% { opacity: 0; transform: translateY(18px) scale(.7); }
          18% { opacity: 1; }
          78% { opacity: 1; transform: translateY(-54px) scale(1); }
          100% { opacity: 0; transform: translateY(-76px) scale(.92); }
        }
        .live-room-stage .lk-grid-layout {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .live-room-stage .lk-video-conference {
          position: absolute;
          inset: 0;
        }
        .live-room-stage .lk-participant-tile {
          min-width: 0;
          min-height: 0;
          flex: 1;
          border-radius: 0;
        }
        .live-room-cohost-stage .lk-grid-layout {
          display: block;
        }
        .live-room-cohost-stage .lk-participant-tile:first-child {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .live-room-cohost-stage .lk-participant-tile:nth-child(2) {
          position: absolute;
          right: max(1rem, env(safe-area-inset-right));
          bottom: max(7rem, calc(env(safe-area-inset-bottom) + 6rem));
          z-index: 10;
          width: clamp(5.5rem, 24vw, 8rem);
          height: clamp(8rem, 34vw, 11rem);
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, .85);
          border-radius: 1rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, .55);
        }
        .live-room-cohost-stage .lk-participant-tile:nth-child(2) .lk-participant-metadata {
          padding: .35rem;
        }
        .live-room-cohost-stage .lk-participant-tile:nth-child(2) .lk-participant-metadata-item {
          display: none;
        }
        .live-room-stage .lk-participant-media-video[data-lk-source="camera"] {
          object-fit: cover;
          background: #000;
        }
        .live-room-stage .lk-participant-media-video[data-lk-source="screen_share"] {
          object-fit: contain;
          background: #000;
        }
        .live-control-toggle[data-lk-enabled="true"] {
          border-color: rgba(91, 209, 167, .65);
          background: rgba(91, 209, 167, .17);
          color: #b9f1dd;
        }
        .live-control-toggle[data-lk-enabled="false"] {
          border-color: rgba(251, 113, 133, .5);
          background: rgba(244, 63, 94, .17);
          color: #fecdd3;
        }
        .live-screen-toggle[data-lk-enabled="true"] {
          border-color: rgba(234, 193, 110, .75);
          background: rgba(234, 193, 110, .2);
          color: #f1d48e;
        }
        @media (prefers-reduced-motion: reduce) {
          .live-room-motion, .animate-pulse { animation: none !important; transition: none !important; }
        }
      `}</style>
      <div className="relative h-full w-full overflow-hidden bg-black">
        <header data-live-overlay className="absolute inset-x-0 top-0 z-30 flex items-center gap-2 bg-gradient-to-b from-black/80 via-black/35 to-transparent px-3 pb-5 pt-[max(.75rem,env(safe-area-inset-top))] sm:gap-3 sm:px-5 sm:pb-7">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#eac16e]/60 bg-black/45 text-sm font-black italic text-[#eac16e] shadow-lg sm:h-11 sm:w-11">
            N
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="max-w-[11rem] truncate text-sm font-bold drop-shadow sm:max-w-xs sm:text-base">
                {stream.username || 'Creator'}
              </h1>
              {stream.is_verified && <CreatorVerificationBadge />}
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/90 px-2 py-1 text-[9px] font-extrabold tracking-wide shadow-lg">
                <span className="live-room-motion h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-white/80 drop-shadow">
              {stream.title || 'Live trading session'} · {Number(stream.followers || 0).toLocaleString()} followers
            </p>
          </div>
          {isPublisher && (
            <button
              type="button"
              onClick={() => setShowControls((visible) => !visible)}
              aria-label={showControls ? 'Hide streaming controls' : 'Show streaming controls'}
              aria-expanded={showControls}
              title={showControls ? 'Hide controls' : 'Show controls'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur transition hover:bg-black/70"
            >
              <MoreHorizontal size={20} />
            </button>
          )}
          <button
            type="button"
            onClick={() => void shareLive()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur transition hover:bg-black/70"
            aria-label="Share live stream"
            title="Share live stream"
          >
            <Share2 size={17} />
          </button>
          {stream.isHost ? (
            <button
              type="button"
              onClick={onEndLive}
              disabled={endingLive}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-rose-300/40 bg-rose-600/90 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-rose-500 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:px-4 sm:text-sm"
              aria-label="End live stream"
              title="End live stream for everyone"
            >
              <Square size={14} fill="currentColor" />
              <span className="sr-only sm:not-sr-only">{endingLive ? 'Ending…' : 'End live'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur transition hover:bg-black/70"
              aria-label="Leave live stream"
              title="Leave live stream"
            >
              <X size={20} />
            </button>
          )}
        </header>
        <div className="absolute inset-0">
          <main className="absolute inset-0">
            <div className="live-room-stage absolute inset-0 overflow-hidden bg-black" onClick={handleStageTap}>
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
                onError={(error) => setStreamError(error.message || 'The live connection could not be established.')}
                onConnected={() => setStreamError('')}
                onMediaDeviceFailure={(_failure, kind) => {
                  setStreamError(`Unable to access ${kind || 'media'} device. Check browser permissions and try again.`)
                }}
                data-lk-theme="default"
                style={{ height: '100%', width: '100%' }}
              >
                <LiveStage
                  publisher={isPublisher}
                  controlsOpen={showControls}
                  onDeviceError={handleDeviceError}
                />
              </LiveKitRoom>

              {candleCount > 0 && (
                <div
                  key={candleCount}
                  className="pointer-events-none absolute right-[4.75rem] top-1/2 z-20 flex -translate-y-1/2 flex-col items-center text-emerald-300 sm:right-24"
                  style={{ animation: 'bull-candle-rise 1.15s ease-out forwards' }}
                  aria-hidden="true"
                >
                  <ArrowUpRight size={24} strokeWidth={3} />
                  <span className="relative my-1 h-7 w-3 rounded-sm bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.65)] before:absolute before:left-1/2 before:top-[-7px] before:h-11 before:w-px before:-translate-x-1/2 before:bg-emerald-300 after:absolute after:left-1/2 after:bottom-[-7px] after:h-11 after:w-px after:-translate-x-1/2 after:bg-emerald-300" />
                </div>
              )}
            </div>
          </main>

          {chatContent && (
            <section
              data-live-overlay
              aria-label="Live chat"
              className="absolute bottom-[max(.65rem,env(safe-area-inset-bottom))] left-3 z-20 flex h-[min(48dvh,30rem)] w-[calc(100%-5.5rem)] max-w-[32rem] flex-col justify-end sm:bottom-[max(1rem,env(safe-area-inset-bottom))] sm:left-5"
            >
              {chatContent}
            </section>
          )}

          <div data-live-overlay className="absolute right-2 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2.5 sm:right-5 sm:gap-4">
            <button
              type="button"
              onClick={handleLikeTap}
              aria-label={`Double tap to like. ${Number(likes || 0).toLocaleString()} live likes`}
              className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-full bg-black/35 text-rose-300 drop-shadow-lg transition active:scale-90 sm:min-h-14 sm:min-w-14"
            >
              <Heart size={27} fill="currentColor" className="live-room-motion transition-transform active:scale-125" />
              <span aria-live="polite" aria-atomic="true" className="text-[10px] font-bold text-white">
                {Number(likes || 0).toLocaleString()}
              </span>
            </button>
            <button
              type="button"
              onClick={onFocusComposer}
              aria-label={`Open live comments, ${Number(commentsCount || 0).toLocaleString()} loaded`}
              title="Open comments"
              className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-full bg-black/35 text-white drop-shadow-lg transition active:scale-90 sm:min-h-14 sm:min-w-14"
            >
              <MessageCircle size={25} />
              <span className="text-[10px] font-semibold">{Number(commentsCount || 0).toLocaleString()}</span>
            </button>
            <button
              type="button"
              onClick={() => void shareLive()}
              aria-label="Share live stream"
              title="Share live stream"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white drop-shadow-lg transition active:scale-90 sm:h-14 sm:w-14"
            >
              <Share2 size={23} />
            </button>
            <button
              type="button"
              onClick={() => setShowGifts((visible) => !visible)}
              aria-label={showGifts ? 'Close gifts' : 'Send a gift'}
              aria-expanded={showGifts}
              title="Send a gift"
              className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-full bg-black/35 text-[#eac16e] drop-shadow-lg transition active:scale-90 sm:min-h-14 sm:min-w-14"
            >
              <Gift size={24} />
              <span className="text-[10px] font-semibold text-white">Gift</span>
            </button>
            {!stream.isHost && Boolean(stream.username) && (
              <button
                type="button"
                onClick={onFollow}
                disabled={followingBusy}
                aria-label={stream.is_following ? `Following ${stream.username}` : `Follow ${stream.username}`}
                className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-full bg-black/35 drop-shadow-lg transition active:scale-90 disabled:opacity-60 sm:min-h-14 sm:min-w-14 ${
                  stream.is_following ? 'text-[#eac16e]' : 'text-white'
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/35 bg-[#161713]/80">
                  {stream.is_following ? <Check size={16} /> : <UserPlus size={16} />}
                </span>
                <span className="text-[9px] font-semibold">{followingBusy ? '…' : stream.is_following ? 'Followed' : 'Follow'}</span>
              </button>
            )}
            {stream.isHost && (
              <button
                type="button"
                onClick={() => setShowInvite((visible) => !visible)}
                aria-label="Invite a cohost"
                aria-expanded={showInvite}
                title="Invite a cohost"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white drop-shadow-lg transition active:scale-90 sm:h-14 sm:w-14"
              >
                <Users size={23} />
              </button>
            )}
          </div>

          {showGifts && giftContent && (
            <section data-live-overlay className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-[4.5rem] z-40 sm:right-24">
              {giftContent}
            </section>
          )}

          {(streamError || errorMessage || shareNotice || giftFeedback) && (
            <div
              data-live-overlay
              role={streamError || errorMessage ? 'alert' : 'status'}
              className={`absolute left-3 top-[max(7.5rem,calc(env(safe-area-inset-top)+6rem))] z-50 flex max-w-[calc(100%-5.5rem)] items-start gap-3 rounded-xl border px-3 py-2 text-xs shadow-xl backdrop-blur sm:left-5 ${
                streamError || errorMessage
                  ? 'border-rose-400/30 bg-black/75 text-rose-100'
                  : 'border-[#eac16e]/25 bg-black/65 text-[#f1d48e]'
              }`}
            >
              <span>{streamError || errorMessage || shareNotice || giftFeedback}</span>
              {(streamError || errorMessage) && (
                <button
                  type="button"
                  onClick={() => {
                    setStreamError('')
                    onDismissError()
                  }}
                  className="shrink-0 rounded-full p-1 text-white/75 hover:bg-white/10"
                  aria-label="Dismiss live stream error"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {showInvite && stream.isHost && (
            <form
              data-live-overlay
              onSubmit={inviteCohost}
              className="absolute right-[4.5rem] top-[max(6rem,calc(env(safe-area-inset-top)+5rem))] z-40 flex w-[min(19rem,calc(100vw-6rem))] flex-col gap-2 rounded-2xl border border-white/15 bg-black/75 p-3 shadow-2xl backdrop-blur-xl sm:right-24"
            >
              <label htmlFor="live-cohost-username" className="text-xs font-semibold text-white/80">Invite a cohost</label>
              <div className="flex gap-2">
                <input
                  id="live-cohost-username"
                  value={cohostUsername}
                  onChange={(event) => setCohostUsername(event.target.value)}
                  maxLength={40}
                  pattern="@?[a-zA-Z0-9_]{3,40}"
                  placeholder="@username"
                  required
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white outline-none focus:border-[#eac16e]/60 sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={invitationBusy}
                  className="min-h-11 rounded-xl bg-[#eac16e] px-3 text-sm font-semibold text-[#15110a] disabled:opacity-50"
                >
                  {invitationBusy ? '…' : 'Invite'}
                </button>
              </div>
              {cohostInvitation && <p role="status" className="text-xs text-emerald-200">{cohostInvitation}</p>}
            </form>
          )}

          {!stream.isHost && cohostInvitation && !stream.isCohost && (
            <div
              data-live-overlay
              className="absolute left-3 right-[4.5rem] top-[max(6rem,calc(env(safe-area-inset-top)+5rem))] z-40 flex items-center justify-between gap-2 rounded-2xl border border-[#eac16e]/25 bg-black/75 px-3 py-2 shadow-xl backdrop-blur-xl sm:left-5 sm:right-24"
            >
              <p className="text-xs text-white">The owner invited you to cohost.</p>
              <button
                type="button"
                onClick={onAcceptCohost}
                disabled={invitationBusy}
                className="min-h-10 shrink-0 rounded-xl bg-[#eac16e] px-3 text-xs font-bold text-[#15110a] disabled:opacity-50"
              >
                {invitationBusy ? 'Joining…' : 'Accept'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
