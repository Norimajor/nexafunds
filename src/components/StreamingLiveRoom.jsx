import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { MessageCircle, X } from 'lucide-react'

export default function StreamingLiveRoom({ stream, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3 sm:p-6">
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-[#eac16e]/20 bg-[#081211] shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#f3f1e9]">{stream.title}</p>
            <p className="text-xs text-[#a8b0a9]">
              {stream.isHost
                ? 'You are live. Use the screen-share control to share your trading setup.'
                : 'Watching live'}
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
          <LiveKitRoom
            serverUrl={stream.livekitUrl}
            token={stream.token}
            connect
            audio={stream.isHost}
            video={stream.isHost}
            onDisconnected={onClose}
            data-lk-theme="default"
            style={{ height: 'min(72vh, 760px)' }}
          >
            <VideoConference />
          </LiveKitRoom>
          <aside className="flex max-h-[min(72vh,760px)] flex-col border-t border-white/10 p-4 lg:border-l lg:border-t-0">
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
