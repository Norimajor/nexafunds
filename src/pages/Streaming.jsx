import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  Coins,
  Heart,
  MessageCircle,
  Radio,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react'
import { PortalPageLayout } from '../components/PortalSidebar'

const LiveRoom = lazy(() => import('../components/StreamingLiveRoom'))
const API_URL = import.meta.env.VITE_API_BASE || 'https://nexafunds-app.onrender.com'

async function api(path, options = {}) {
  const isForm = options.body instanceof FormData
  const response = await fetch(`${API_URL}/api/streaming${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'The streaming service could not complete your request.')
  }
  return data
}

function VerifiedBadge({ className = '' }) {
  return (
    <BadgeCheck
      aria-label="NexaFunds verified"
      title="NexaFunds verified"
      className={`inline-block h-4 w-4 shrink-0 text-[#eac16e] ${className}`}
    />
  )
}

function CreatorUsername({ profile, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>@{profile.username}</span>
      {profile.is_verified && <VerifiedBadge />}
    </span>
  )
}

function CreatorName({ profile, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-w-0 items-center gap-1.5 text-left font-semibold text-[#f3f1e9] hover:text-[#eac16e]"
    >
      <span className="truncate">{profile.display_name}</span>
    </button>
  )
}

function CommentList({ comments, draft, setDraft, onSubmit, busy, compact = false }) {
  return (
    <div className={`mt-4 flex min-h-0 flex-col border-t border-white/[0.07] pt-4 ${compact ? 'flex-1' : ''}`}>
      <div className={`space-y-3 overflow-y-auto ${compact ? 'min-h-0 flex-1' : 'max-h-52'}`}>
        {comments.length === 0 ? (
          <p className="text-sm text-[#a8b0a9]">Start the conversation.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d7a83f] to-[#436b62] text-[10px] font-bold text-[#111]">
                (comment.username || 'C').slice(0, 1).toUpperCase()
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-xs font-semibold text-white/85">
                  <span className="truncate">{comment.username || 'creator'}</span>
                  {comment.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                </p>
                <p className="mt-0.5 break-words text-sm text-[#d1d5cc]">{comment.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={500}
          placeholder={compact ? 'Type a message...' : 'Add a comment...'}
          aria-label={compact ? 'Send a live chat message' : 'Add a comment'}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b1512] px-3 py-2 text-sm text-white outline-none focus:border-[#eac16e]/50"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="rounded-xl bg-[#eac16e] px-3 text-[#0b100e] disabled:opacity-50"
          aria-label="Post comment"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}

export default function Streaming() {
  const navigate = useNavigate()
  const { username } = useParams()
  const [searchParams] = useSearchParams()
  const sharedLiveId = searchParams.get('live')
  const [profile, setProfile] = useState(null)
  const [viewProfile, setViewProfile] = useState(null)
  const [wallet, setWallet] = useState({ balance_coins: 0, gift_earnings_coins: 0 })
  const [gifts, setGifts] = useState([])
  const [bundles, setBundles] = useState([])
  const [posts, setPosts] = useState([])
  const [live, setLive] = useState([])
  const [creators, setCreators] = useState([])
  const [creatorSearch, setCreatorSearch] = useState('')
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({ username: '', display_name: '', bio: '' })
  const [verificationRequest, setVerificationRequest] = useState(null)
  const [verificationMessage, setVerificationMessage] = useState('')
  const [verificationBusy, setVerificationBusy] = useState(false)
  const [postCaption, setPostCaption] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [posting, setPosting] = useState(false)
  const [startTitle, setStartTitle] = useState('')
  const [activeStream, setActiveStream] = useState(null)
  const [commentTarget, setCommentTarget] = useState(null)
  const [commentLists, setCommentLists] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [commentBusy, setCommentBusy] = useState(false)
  const [giftTarget, setGiftTarget] = useState(null)
  const [connectionsPanel, setConnectionsPanel] = useState(null)
  const [connections, setConnections] = useState([])
  const [connectionsLoading, setConnectionsLoading] = useState(false)
  const [liveLikes, setLiveLikes] = useState(0)
  const [cohostInviteNotice, setCohostInviteNotice] = useState('')
  const [hasCohostInvitation, setHasCohostInvitation] = useState(false)
  const [cohostBusy, setCohostBusy] = useState(false)
  const [liveFollowBusy, setLiveFollowBusy] = useState(false)
  const postFormRef = useRef(null)
  const closingStreamRef = useRef(false)
  const sharedLiveAttemptRef = useRef('')
  const profileLoaded = Boolean(profile)
  const profileVerified = Boolean(profile?.is_verified)

  const loadFeed = useCallback(async ({ preservePosts = false } = {}) => {
    const data = await api('/feed')
    if (!preservePosts) setPosts(data.posts || [])
    setLive(data.live || [])
    setConfig({
      media_configured: data.media_configured,
      livekit_configured: data.livekit_configured,
      stripe_configured: data.stripe_configured,
    })
  }, [])

  const loadProfile = useCallback(async () => {
    const [data, verificationData] = await Promise.all([
      api('/profile/me'),
      api('/profile/me/verification-request'),
    ])
    setProfile(data.profile)
    setProfileEditorOpen(Boolean(data.profile.username_is_default))
    setVerificationRequest(verificationData.request)
    setWallet(data.wallet || { balance_coins: 0, gift_earnings_coins: 0 })
    setGifts(data.gifts || [])
    setBundles(data.coin_bundles || [])
    setProfileForm({
      username: data.profile.username,
      display_name: data.profile.display_name,
      bio: data.profile.bio || '',
    })
  }, [])

  const loadCreators = useCallback(async (query = '') => {
    const data = await api(`/creators?q=${encodeURIComponent(query)}`)
    setCreators(data.creators || [])
  }, [])

  const loadCreator = useCallback(async (handle) => {
    const [profileData, postsData] = await Promise.all([
      api(`/profiles/${encodeURIComponent(handle)}`),
      api(`/profiles/${encodeURIComponent(handle)}/posts`),
    ])
    setViewProfile(profileData.profile)
    setPosts(postsData.posts || [])
  }, [])

  const refresh = useCallback(async () => {
    setError('')
    try {
      await loadProfile()
      await Promise.all([
        username ? Promise.all([loadCreator(username), loadFeed()]) : loadFeed(),
        loadCreators(),
      ])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [loadCreator, loadCreators, loadFeed, loadProfile, username])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => {
      void loadFeed({ preservePosts: Boolean(username) })
        .catch((requestError) => setError(requestError.message))
    }, 10000)
    return () => window.clearInterval(timer)
  }, [loadFeed, refresh, username])

  useEffect(() => {
    if (!activeStream || !commentTarget?.live_session_id) return undefined
    const loadLiveComments = async () => {
      try {
        const data = await api(`/live/${activeStream.id}/comments`)
        setCommentLists((current) => ({ ...current, [`live:${activeStream.id}`]: data.comments || [] }))
      } catch (requestError) {
        setError(requestError.message)
      }
    }
    void loadLiveComments()
    const timer = window.setInterval(loadLiveComments, 4000)
    return () => window.clearInterval(timer)
  }, [activeStream, commentTarget])

  useEffect(() => {
    if (!activeStream) return undefined

    const refreshLiveState = async () => {
      try {
        const likesData = await api(`/live/${activeStream.id}/likes`)
        setLiveLikes(Number(likesData.likes || 0))
        if (!activeStream.isHost && !activeStream.isCohost) {
          const invitationData = await api(`/live/${activeStream.id}/cohost-invitation`)
          setHasCohostInvitation(Boolean(invitationData.invited))
        }
      } catch (requestError) {
        setError(requestError.message)
      }
    }

    void refreshLiveState()
    const timer = window.setInterval(() => void refreshLiveState(), 5000)
    return () => window.clearInterval(timer)
  }, [activeStream])

  useEffect(() => {
    if (!profileLoaded || profileVerified) return undefined

    const refreshVerificationStatus = async () => {
      try {
        const [profileData, requestData] = await Promise.all([
          api('/profile/me'),
          api('/profile/me/verification-request'),
        ])
        if (!profileVerified && profileData.profile.is_verified) {
          setNotice('Your NexaFunds golden verification tick is now active.')
        }
        setProfile(profileData.profile)
        setVerificationRequest(requestData.request)
      } catch (requestError) {
        setError(requestError.message)
      }
    }

    const timer = window.setInterval(() => void refreshVerificationStatus(), 15000)
    return () => window.clearInterval(timer)
  }, [profileLoaded, profileVerified])

  const isOwnProfile = !username || profile?.username === username
  const displayedProfile = isOwnProfile ? profile : viewProfile

  const updateCommentList = (key, comments) =>
    setCommentLists((current) => ({ ...current, [key]: comments }))

  const openCreator = (handle) => {
    if (handle) navigate(`/streaming/${encodeURIComponent(handle)}`)
  }

  const followCreator = async (handle) => {
    setError('')
    try {
      const result = await api(`/profiles/${encodeURIComponent(handle)}/follow`, { method: 'POST' })
      setConnections((current) =>
        current.map((creator) =>
          creator.username === handle
            ? { ...creator, is_following: result.following }
            : creator
        )
      )
      setNotice(result.following ? `Following @${handle}.` : `Unfollowed @${handle}.`)
      if (username) await loadCreator(username)
      await Promise.all([
        loadProfile(),
        loadFeed({ preservePosts: Boolean(username) }),
        loadCreators(creatorSearch.trim()),
      ])
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const data = await api('/profile/me', {
        method: 'PATCH',
        body: JSON.stringify({
          username: profileForm.username,
          display_name: profileForm.display_name,
          bio: profileForm.bio,
        }),
      })
      setProfile(data.profile)
      setViewProfile(data.profile)
      setNotice('Creator profile updated.')
      setProfileEditorOpen(false)
      if (username && username !== data.profile.username) {
        navigate(`/streaming/${encodeURIComponent(data.profile.username)}`, { replace: true })
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const submitVerificationRequest = async (event) => {
    event.preventDefault()
    setVerificationBusy(true)
    setError('')
    try {
      const data = await api('/profile/me/verification-request', {
        method: 'POST',
        body: JSON.stringify({ request_message: verificationMessage }),
      })
      setVerificationRequest(data.request)
      setVerificationMessage('')
      setNotice('Your golden tick request was submitted for review.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setVerificationBusy(false)
    }
  }

  const submitPost = async (event) => {
    event.preventDefault()
    if (!videoFile) {
      setError('Choose an MP4, WebM, or MOV video before posting.')
      return
    }
    setPosting(true)
    setError('')
    const form = new FormData()
    form.append('video', videoFile)
    form.append('caption', postCaption)
    try {
      await api('/posts', { method: 'POST', body: form })
      setVideoFile(null)
      setPostCaption('')
      postFormRef.current?.reset()
      setNotice('Your trading video is now in the community feed.')
      await loadFeed()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPosting(false)
    }
  }

  const toggleLike = async (post) => {
    setError('')
    try {
      await api(`/posts/${post.id}/like`, { method: 'POST' })
      await loadFeed()
      if (username) await loadCreator(username)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const loadPostComments = async (postId) => {
    const key = `post:${postId}`
    setCommentTarget((current) => current === key ? null : key)
    if (commentLists[key]) return
    try {
      const data = await api(`/posts/${postId}/comments`)
      updateCommentList(key, data.comments || [])
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const submitComment = async (event, target) => {
    event.preventDefault()
    const body = String(commentDrafts[target.key] || '').trim()
    if (!body) return
    setCommentBusy(true)
    setError('')
    try {
      const data = await api(target.path, {
        method: 'POST',
        body: JSON.stringify({ body }),
      })
      updateCommentList(target.key, [...(commentLists[target.key] || []), data.comment])
      setCommentDrafts((current) => ({ ...current, [target.key]: '' }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCommentBusy(false)
    }
  }

  const startLive = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const data = await api('/live', {
        method: 'POST',
        body: JSON.stringify({ title: startTitle }),
      })
      setStartTitle('')
      setActiveStream({
        ...data.stream,
        followers: Number(profile?.followers || 0),
        is_following: false,
        livekitUrl: data.livekit_url,
        token: data.token,
        isHost: true,
        isCohost: false,
      })
      setLiveLikes(Number(data.stream.likes || 0))
      setCohostInviteNotice('')
      setHasCohostInvitation(false)
      closingStreamRef.current = false
      setCommentTarget({ live_session_id: data.stream.id })
      await loadFeed()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const joinLive = useCallback(async (stream) => {
    setError('')
    try {
      const data = await api(`/live/${stream.id}/token`, { method: 'POST' })
      setActiveStream({
        ...data.stream,
        id: stream.id,
        followers: Number(stream.followers || 0),
        is_following: Boolean(stream.is_following),
        livekitUrl: data.livekit_url,
        token: data.token,
        isHost: data.is_host,
        isCohost: data.is_cohost,
      })
      setLiveLikes(Number(data.stream.likes || 0))
      setCohostInviteNotice('')
      setHasCohostInvitation(false)
      closingStreamRef.current = false
      setCommentTarget({ live_session_id: stream.id })
      if (!data.is_host && !data.is_cohost) {
        try {
          const joinData = await api(`/live/${stream.id}/comments`, {
            method: 'POST',
            body: JSON.stringify({ body: 'joined the live' }),
          })
          const key = `live:${stream.id}`
          setCommentLists((current) => ({
            ...current,
            [key]: current[key]?.some((comment) => comment.id === joinData.comment.id)
              ? current[key]
              : [...(current[key] || []), joinData.comment],
          }))
        } catch (requestError) {
          setError(requestError.message)
        }
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => {
    if (loading || !sharedLiveId || activeStream || sharedLiveAttemptRef.current === sharedLiveId) return

    const stream = live.find((entry) => String(entry.id) === sharedLiveId)
    sharedLiveAttemptRef.current = sharedLiveId
    if (!stream) {
      setError('This shared live stream is no longer available.')
      return
    }
    void joinLive(stream)
  }, [activeStream, joinLive, live, loading, sharedLiveId])

  const followLiveCreator = async () => {
    if (!activeStream?.username || activeStream.isHost) return
    setLiveFollowBusy(true)
    setError('')
    try {
      const result = await api(`/profiles/${encodeURIComponent(activeStream.username)}/follow`, {
        method: 'POST',
      })
      setActiveStream((current) => {
        if (!current) return current
        const wasFollowing = Boolean(current.is_following)
        const followerChange = result.following === wasFollowing
          ? 0
          : result.following ? 1 : -1
        return {
          ...current,
          is_following: result.following,
          followers: Math.max(0, Number(current.followers || 0) + followerChange),
        }
      })
      await loadFeed({ preservePosts: Boolean(username) })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLiveFollowBusy(false)
    }
  }

  const closeLive = async () => {
    if (closingStreamRef.current) return
    closingStreamRef.current = true
    if (activeStream?.isHost) {
      try {
        await api(`/live/${activeStream.id}/end`, { method: 'POST' })
      } catch (requestError) {
        setError(requestError.message)
      }
    }
    setActiveStream(null)
    setCommentTarget(null)
    setHasCohostInvitation(false)
    setCohostInviteNotice('')
    await loadFeed().catch((requestError) => setError(requestError.message))
  }

  const inviteCohost = async (cohostUsername) => {
    if (!activeStream?.isHost) return
    setCohostBusy(true)
    setError('')
    try {
      const result = await api(`/live/${activeStream.id}/cohosts`, {
        method: 'POST',
        body: JSON.stringify({ username: cohostUsername }),
      })
      setCohostInviteNotice(`Invitation sent to @${result.invitee.username}.`)
      setNotice(`@${result.invitee.username} was invited to cohost.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCohostBusy(false)
    }
  }

  const acceptCohostInvite = async () => {
    if (!activeStream || !hasCohostInvitation) return
    setCohostBusy(true)
    setError('')
    try {
      const data = await api(`/live/${activeStream.id}/cohost-accept`, { method: 'POST' })
      setActiveStream((current) => ({
        ...current,
        ...data.stream,
        livekitUrl: data.livekit_url,
        token: data.token,
        isCohost: true,
      }))
      setLiveLikes(Number(data.stream.likes || 0))
      setHasCohostInvitation(false)
      setNotice('You joined as a cohost. Your camera and microphone are now enabled.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCohostBusy(false)
    }
  }

  const doubleTapLiveLike = async () => {
    if (!activeStream) return
    try {
      const data = await api(`/live/${activeStream.id}/likes`, { method: 'POST' })
      setLiveLikes(Number(data.likes || 0))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const showConnections = async (type) => {
    if (!displayedProfile) return
    setConnectionsPanel({ type, username: displayedProfile.username })
    setConnections([])
    setConnectionsLoading(true)
    setError('')
    try {
      const data = await api(
        `/profiles/${encodeURIComponent(displayedProfile.username)}/connections/${type}`
      )
      setConnections(data.connections || [])
    } catch (requestError) {
      setConnectionsPanel(null)
      setError(requestError.message)
    } finally {
      setConnectionsLoading(false)
    }
  }

  const searchCreators = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await loadCreators(creatorSearch.trim())
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const buyCoins = async (bundleId) => {
    setError('')
    try {
      const data = await api('/coins/checkout', {
        method: 'POST',
        body: JSON.stringify({ bundle_id: bundleId }),
      })
      window.location.assign(data.checkout_url)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const sendGift = async (gift, target) => {
    setError('')
    try {
      await api('/gifts', {
        method: 'POST',
        body: JSON.stringify({
          gift_id: gift.gift_id,
          ...(target.post_id ? { post_id: target.post_id } : {}),
          ...(target.live_session_id ? { live_session_id: target.live_session_id } : {}),
        }),
      })
      setGiftTarget(null)
      await loadProfile()
      setNotice(`${gift.name} sent. Creator earnings are tracked in gift coins.`)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const shownComments = (key) => commentLists[key] || []

  return (
    <PortalPageLayout activeLabel="Streaming">
      <main className="mx-auto min-h-screen max-w-7xl space-y-6 p-4 text-[#f3f1e9] sm:p-6 lg:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="h-6 w-6 text-[#eac16e]" />
              <h1 className="text-3xl font-bold tracking-tight">Nexa Stream</h1>
            </div>
            <p className="mt-1 text-sm text-[#a8b0a9]">
              Trade ideas, live setups, and a community built around markets.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#eac16e]/20 bg-[#111a17] px-4 py-3">
            <Coins className="h-5 w-5 text-[#eac16e]" />
            <div>
              <p className="text-xs text-[#a8b0a9]">Your coins</p>
              <p className="font-bold">{Number(wallet.balance_coins || 0).toLocaleString()}</p>
            </div>
          </div>
        </header>

        {(error || notice) && (
          <div
            role={error ? 'alert' : 'status'}
            className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                : 'border-[#5bd1a7]/30 bg-[#5bd1a7]/10 text-[#b9f1dd]'
            }`}
          >
            <span>{error || notice}</span>
            <button
              type="button"
              onClick={() => { setError(''); setNotice('') }}
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="h-72 animate-pulse rounded-3xl bg-[#111a17]" />
            <div className="h-72 animate-pulse rounded-3xl bg-[#111a17]" />
          </div>
        ) : !profile ? (
          <section className="rounded-3xl border border-[#eac16e]/20 bg-[#111a17] p-8">
            <h2 className="text-xl font-semibold">Sign in to join Nexa Stream</h2>
            <p className="mt-2 text-sm text-[#a8b0a9]">{error || 'Creator profiles and community features are available to NexaFunds members.'}</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-5 rounded-xl bg-gradient-to-r from-[#eac16e] to-[#5bd1a7] px-5 py-3 font-semibold text-[#0b100e]"
            >
              Sign in
            </button>
          </section>
        ) : (
          <>
            {displayedProfile && (
              <section className="rounded-3xl border border-[#eac16e]/20 bg-gradient-to-br from-[#12221d] to-[#111a17] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#eac16e] to-[#5bd1a7] text-xl font-black text-[#0b100e]">
                      {(displayedProfile.display_name || 'N').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold">{displayedProfile.display_name}</h2>
                        {displayedProfile.is_admin && (
                          <span className="rounded-full border border-[#eac16e]/30 bg-[#eac16e]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#eac16e]">
                            Admin
                          </span>
                        )}
                      </div>
                      <CreatorUsername profile={displayedProfile} className="text-sm text-[#a8b0a9]" />
                      {displayedProfile.bio && <p className="mt-2 max-w-2xl text-sm text-[#d1d5cc]">{displayedProfile.bio}</p>}
                      <div className="mt-3 flex gap-4 text-xs text-[#a8b0a9]">
                        <button type="button" onClick={() => void showConnections('followers')} className="hover:text-[#eac16e]">
                          <strong className="text-[#f3f1e9]">{Number(displayedProfile.followers || 0).toLocaleString()}</strong> followers
                        </button>
                        <button type="button" onClick={() => void showConnections('following')} className="hover:text-[#eac16e]">
                          <strong className="text-[#f3f1e9]">{Number(displayedProfile.following || 0).toLocaleString()}</strong> following
                        </button>
                        {isOwnProfile && <span><strong className="text-[#eac16e]">{Number(wallet.gift_earnings_coins || 0).toLocaleString()}</strong> gift coins earned</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isOwnProfile ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setProfileEditorOpen((open) => !open)}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/[0.06]"
                        >
                          <Settings2 size={16} /> {displayedProfile.username_is_default ? 'Create username' : 'Edit profile'}
                        </button>
                        {profile.is_admin && (
                          <button
                            type="button"
                            onClick={() => navigate('/admin/licenses')}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#eac16e]/30 px-3 py-2 text-sm text-[#eac16e] hover:bg-[#eac16e]/10"
                          >
                            <ShieldCheck size={16} /> Review requests
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void followCreator(displayedProfile.username)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#eac16e] to-[#5bd1a7] px-4 py-2 text-sm font-bold text-[#0b100e]"
                      >
                        <UserPlus size={16} /> {displayedProfile.is_following ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>

                {profileEditorOpen && isOwnProfile && (
                  <form onSubmit={saveProfile} className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
                    <label className="text-xs text-[#a8b0a9]">
                      Create your viewer username
                      <span className="mt-1 block text-[11px]">Viewers see this username in your live stream and beside your golden tick.</span>
                      <input
                        required
                        minLength={3}
                        maxLength={40}
                        pattern="[a-zA-Z0-9_]+"
                        value={profileForm.username}
                        onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1512] px-3 py-2 text-sm text-white outline-none focus:border-[#eac16e]/50"
                      />
                    </label>
                    <label className="text-xs text-[#a8b0a9]">
                      Display name
                      <input
                        required
                        maxLength={60}
                        value={profileForm.display_name}
                        onChange={(event) => setProfileForm({ ...profileForm, display_name: event.target.value })}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1512] px-3 py-2 text-sm text-white outline-none focus:border-[#eac16e]/50"
                      />
                    </label>
                    <label className="text-xs text-[#a8b0a9] sm:col-span-2">
                      Trading bio
                      <textarea
                        maxLength={240}
                        rows={2}
                        value={profileForm.bio}
                        onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
                        className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-[#0b1512] px-3 py-2 text-sm text-white outline-none focus:border-[#eac16e]/50"
                      />
                    </label>
                    <button type="submit" className="w-fit rounded-xl bg-[#eac16e] px-4 py-2 text-sm font-semibold text-[#0b100e]">
                      Save profile
                    </button>
                  </form>
                )}
              </section>
            )}

            {isOwnProfile && (
              <section className="rounded-3xl border border-[#eac16e]/20 bg-[#111a17] p-5">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#eac16e]" />
                  <div>
                    <h2 className="font-semibold">Golden tick verification</h2>
                    <p className="text-xs text-[#a8b0a9]">Submit a request for the NexaFunds team to review.</p>
                  </div>
                </div>
                {profile.is_verified ? (
                  <p className="text-sm text-[#5bd1a7]">
                    Your username <CreatorUsername profile={profile} className="font-semibold" /> is verified.
                  </p>
                ) : verificationRequest?.status === 'pending' ? (
                  <p className="text-sm text-[#eac16e]">
                    Your request is awaiting review, submitted {new Date(verificationRequest.created_at).toLocaleDateString()}.
                  </p>
                ) : (
                  <>
                    {verificationRequest?.status === 'rejected' && (
                      <p className="mb-3 text-sm text-rose-200">
                        Your previous request was not approved. You may submit an updated request.
                      </p>
                    )}
                    <form onSubmit={submitVerificationRequest} className="space-y-3">
                      <label className="block text-xs text-[#a8b0a9]">
                        Why should this creator account be verified?
                        <textarea
                          required
                          minLength={20}
                          maxLength={1000}
                          rows={3}
                          value={verificationMessage}
                          onChange={(event) => setVerificationMessage(event.target.value)}
                          placeholder="Share information that helps us confirm your creator identity and presence."
                          className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-[#0b1512] px-3 py-2 text-sm text-white outline-none focus:border-[#eac16e]/50"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={verificationBusy}
                        className="rounded-xl bg-[#eac16e] px-4 py-2 text-sm font-semibold text-[#0b100e] disabled:opacity-50"
                      >
                        {verificationBusy ? 'Submitting…' : 'Submit verification request'}
                      </button>
                    </form>
                  </>
                )}
              </section>
            )}

            {connectionsPanel && (
              <section className="rounded-3xl border border-[#eac16e]/20 bg-[#111a17] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      @{connectionsPanel.username} {connectionsPanel.type}
                    </h2>
                    <p className="text-xs text-[#a8b0a9]">Select a creator to view their profile.</p>
                  </div>
                  <button type="button" onClick={() => setConnectionsPanel(null)} aria-label="Close connections list">
                    <X size={18} />
                  </button>
                </div>
                {connectionsLoading ? (
                  <p className="text-sm text-[#a8b0a9]">Loading {connectionsPanel.type}…</p>
                ) : connections.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {connections.map((creator) => (
                      <div key={creator.user_id} className="flex items-center justify-between gap-3 rounded-xl bg-[#0b1512] p-3">
                        <button type="button" onClick={() => openCreator(creator.username)} className="min-w-0 text-left">
                          <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                            {creator.display_name}
                          </span>
                          <CreatorUsername profile={creator} className="block truncate text-xs text-[#a8b0a9]" />
                        </button>
                        {profile.username !== creator.username && (
                          <button
                            type="button"
                            onClick={() => void followCreator(creator.username)}
                            className="shrink-0 rounded-lg border border-[#eac16e]/20 px-2.5 py-1.5 text-xs text-[#eac16e]"
                          >
                            {creator.is_following ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#a8b0a9]">No {connectionsPanel.type} yet.</p>
                )}
              </section>
            )}

            {isOwnProfile && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-6">
                  <section className="rounded-3xl border border-[#eac16e]/20 bg-[#111a17] p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Radio className="h-5 w-5 text-rose-400" />
                      <h2 className="font-semibold">Live now</h2>
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-300">
                        Live
                      </span>
                    </div>
                    {live.length ? (
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {live.map((stream) => (
                          <button
                            type="button"
                            key={stream.id}
                            onClick={() => void joinLive(stream)}
                            className="min-w-56 rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-950/40 to-[#13201b] p-4 text-left hover:border-[#eac16e]/50"
                          >
                            <span className="mb-3 inline-flex rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold uppercase">Join live</span>
                            <p className="line-clamp-2 text-sm font-semibold">{stream.title}</p>
                            <span className="mt-2 flex items-center gap-1 text-xs text-[#a8b0a9]">
                              {stream.display_name}
                            </span>
                            <CreatorUsername profile={stream} className="mt-1 text-xs text-[#a8b0a9]" />
                            <span className="mt-2 flex items-center gap-1 text-xs text-rose-300">
                              <Heart size={13} fill="currentColor" /> {Number(stream.likes || 0).toLocaleString()} likes
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#a8b0a9]">No one is live right now. Start a stream and share your setup.</p>
                    )}
                  </section>

                  <section className="rounded-3xl border border-[#eac16e]/20 bg-[#111a17] p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Video className="h-5 w-5 text-[#5bd1a7]" />
                      <h2 className="font-semibold">Go live</h2>
                    </div>
                    <form onSubmit={startLive} className="flex flex-col gap-3 sm:flex-row">
                      <input
                        required
                        maxLength={100}
                        value={startTitle}
                        onChange={(event) => setStartTitle(event.target.value)}
                        placeholder="What are you trading or teaching?"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b1512] px-4 py-3 text-sm text-white outline-none focus:border-[#eac16e]/50"
                      />
                      <button
                        type="submit"
                        disabled={!config.livekit_configured}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#eac16e] to-[#5bd1a7] px-5 py-3 text-sm font-bold text-[#0b100e] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Radio size={17} /> Start live
                      </button>
                    </form>
                    <p className="mt-2 text-xs text-[#a8b0a9]">
                      LiveKit supports camera, microphone, and screen sharing. {config.livekit_configured ? '' : 'Live streaming credentials are not configured yet.'}
                    </p>
                  </section>

                  <section className="rounded-3xl border border-[#eac16e]/20 bg-[#111a17] p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Upload className="h-5 w-5 text-[#eac16e]" />
                      <h2 className="font-semibold">Share a trading setup</h2>
                    </div>
                    <form ref={postFormRef} onSubmit={submitPost} className="space-y-3">
                      <textarea
                        maxLength={1000}
                        rows={2}
                        value={postCaption}
                        onChange={(event) => setPostCaption(event.target.value)}
                        placeholder="Explain your setup, risk plan, or lesson..."
                        className="w-full resize-y rounded-xl border border-white/10 bg-[#0b1512] px-4 py-3 text-sm text-white outline-none focus:border-[#eac16e]/50"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-sm text-[#d1d5cc] hover:bg-white/[0.05]">
                          <span>{videoFile ? videoFile.name : 'Choose video (MP4, WebM, MOV; max 100 MB)'}</span>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="sr-only"
                            onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={posting || !config.media_configured}
                          className="rounded-xl bg-[#eac16e] px-5 py-2.5 text-sm font-bold text-[#0b100e] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {posting ? 'Uploading…' : 'Publish video'}
                        </button>
                      </div>
                      {!config.media_configured && (
                        <p className="text-xs text-amber-200">
                          Video storage is not configured. Set up the private Neon Object Storage bucket before uploads are enabled.
                        </p>
                      )}
                    </form>
                  </section>
                </div>

                <aside className="space-y-6">
                  <section className="rounded-3xl border border-[#eac16e]/20 bg-[#111a17] p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Coins className="h-5 w-5 text-[#eac16e]" />
                      <h2 className="font-semibold">Get trading coins</h2>
                    </div>
                    <p className="mb-4 text-xs leading-relaxed text-[#a8b0a9]">
                      Buy coins through Stripe and send gifts to creators. Gift earnings are tracked as coins; cash conversion and payouts are not enabled yet.
                    </p>
                    <div className="space-y-2">
                      {bundles.map((bundle) => (
                        <button
                          type="button"
                          key={bundle.bundle_id}
                          onClick={() => void buyCoins(bundle.bundle_id)}
                          disabled={!config.stripe_configured}
                          className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-3 text-sm hover:border-[#eac16e]/40 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="font-semibold">{Number(bundle.coins).toLocaleString()} coins</span>
                          <span className="text-[#eac16e]">KSh {(Number(bundle.amount_minor) / 100).toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                    {!config.stripe_configured && (
                      <p className="mt-3 text-xs text-amber-200">Stripe checkout is not configured yet.</p>
                    )}
                  </section>
                  <section className="rounded-3xl border border-[#5bd1a7]/20 bg-[#10201b] p-5">
                    <div className="flex items-center gap-2 text-[#5bd1a7]">
                      <Sparkles size={18} />
                      <h2 className="font-semibold">Creator earnings</h2>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{Number(wallet.gift_earnings_coins || 0).toLocaleString()} <span className="text-sm font-medium text-[#a8b0a9]">gift coins</span></p>
                    <p className="mt-2 text-xs text-[#a8b0a9]">This is a coin tally, not a cash balance. Revenue share and payouts will be configured in a later release.</p>
                  </section>
                  <section className="rounded-3xl border border-white/[0.07] bg-[#111a17] p-5">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#eac16e]" />
                      <h2 className="font-semibold">Community standards</h2>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[#a8b0a9]">
                      Share educational content and risk disclosures. Trading content is not a guarantee of returns or personal financial advice.
                    </p>
                  </section>
                  <section className="rounded-3xl border border-[#eac16e]/15 bg-[#111a17] p-5">
                    <h2 className="font-semibold">Discover creators</h2>
                    <form onSubmit={(event) => void searchCreators(event)} className="mt-3 flex gap-2">
                      <input
                        value={creatorSearch}
                        onChange={(event) => setCreatorSearch(event.target.value)}
                        maxLength={60}
                        placeholder="Search traders..."
                        aria-label="Search creators"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b1512] px-3 py-2 text-sm text-white outline-none focus:border-[#eac16e]/50"
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-[#eac16e]/25 px-3 text-sm text-[#eac16e] hover:bg-[#eac16e]/10"
                      >
                        Search
                      </button>
                    </form>
                    <div className="mt-3 space-y-2">
                      {creators.map((creator) => (
                        <div key={creator.user_id} className="flex items-center justify-between gap-2 rounded-xl bg-[#0b1512] p-2.5">
                          <div className="min-w-0">
                            <CreatorName
                              profile={creator}
                              onClick={() => openCreator(creator.username)}
                            />
                            <p className="text-xs text-[#a8b0a9]">
                              <CreatorUsername profile={creator} /> · {Number(creator.followers).toLocaleString()} followers
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void followCreator(creator.username)}
                            className="shrink-0 rounded-lg border border-[#eac16e]/20 px-2 py-1 text-[11px] text-[#eac16e] hover:bg-[#eac16e]/10"
                          >
                            {creator.is_following ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      ))}
                      {creators.length === 0 && (
                        <p className="text-xs text-[#a8b0a9]">No other creators yet. Check back as the community grows.</p>
                      )}
                    </div>
                  </section>
                </aside>
              </div>
            )}

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{isOwnProfile ? 'Trading community' : `${displayedProfile?.display_name || username}'s videos`}</h2>
                  <p className="text-sm text-[#a8b0a9]">{isOwnProfile ? 'Setups and market lessons from NexaFunds creators.' : 'Videos shared by this creator.'}</p>
                </div>
                {!isOwnProfile && displayedProfile && (
                  <button type="button" onClick={() => void followCreator(displayedProfile.username)} className="rounded-xl border border-[#eac16e]/30 px-3 py-2 text-sm text-[#eac16e]">
                    {displayedProfile.is_following ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
              {posts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#eac16e]/20 bg-[#111a17]/70 p-10 text-center">
                  <Video className="mx-auto h-8 w-8 text-[#eac16e]" />
                  <p className="mt-3 font-semibold">No videos yet</p>
                  <p className="mt-1 text-sm text-[#a8b0a9]">Be the first to share a trading setup with the community.</p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {posts.map((post) => {
                    const commentKey = `post:${post.id}`
                    const isCommentsOpen = commentTarget === commentKey
                    return (
                      <article key={post.id} className="overflow-hidden rounded-3xl border border-[#eac16e]/15 bg-[#111a17]">
                        <div className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <CreatorName
                              profile={post}
                              onClick={() => openCreator(post.username)}
                            />
                            <CreatorUsername profile={post} className="text-xs text-[#a8b0a9]" />
                          </div>
                          {profile.username !== post.username && (
                            <button
                              type="button"
                              onClick={() => void followCreator(post.username)}
                              className="rounded-lg border border-[#eac16e]/20 px-2.5 py-1.5 text-xs text-[#eac16e] hover:bg-[#eac16e]/10"
                            >
                              {post.is_following ? 'Following' : 'Follow'}
                            </button>
                          )}
                        </div>
                        {post.media_url ? (
                          <video
                            className="aspect-[4/5] max-h-[520px] w-full bg-black object-contain"
                            src={post.media_url}
                            controls
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <div className="flex aspect-[4/5] max-h-[520px] items-center justify-center bg-black/40 text-sm text-[#a8b0a9]">
                            Video preview unavailable
                          </div>
                        )}
                        <div className="p-4">
                          {post.caption && <p className="whitespace-pre-wrap text-sm text-[#d1d5cc]">{post.caption}</p>}
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void toggleLike(post)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${post.liked ? 'bg-rose-500/10 text-rose-300' : 'bg-white/[0.04] text-[#d1d5cc]'}`}
                            >
                              <Heart size={15} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes}
                            </button>
                            <button
                              type="button"
                              onClick={() => void loadPostComments(post.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs text-[#d1d5cc]"
                            >
                              <MessageCircle size={15} /> Comments
                            </button>
                            <button
                              type="button"
                              onClick={() => setGiftTarget((current) => current === post.id ? null : post.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#eac16e]/10 px-2.5 py-1.5 text-xs text-[#eac16e]"
                            >
                              <Sparkles size={15} /> Send gift
                            </button>
                          </div>
                          {giftTarget === post.id && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {gifts.map((gift) => (
                                <button
                                  type="button"
                                  key={gift.gift_id}
                                  onClick={() => void sendGift(gift, { post_id: post.id })}
                                  className="rounded-xl border border-[#eac16e]/15 px-2 py-2 text-left text-xs hover:bg-[#eac16e]/10"
                                >
                                  <span className="mr-1">{gift.icon}</span>{gift.name}
                                  <span className="ml-1 text-[#eac16e]">{gift.coins} coins</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {isCommentsOpen && (
                            <CommentList
                              comments={shownComments(commentKey)}
                              draft={commentDrafts[commentKey] || ''}
                              setDraft={(value) => setCommentDrafts((current) => ({ ...current, [commentKey]: value }))}
                              busy={commentBusy}
                              onSubmit={(event) => void submitComment(event, {
                                key: commentKey,
                                path: `/posts/${post.id}/comments`,
                              })}
                            />
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {activeStream && (
        <Suspense
          fallback={(
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 text-sm text-[#d1d5cc]">
              Connecting to live stream…
            </div>
          )}
        >
          <LiveRoom
            stream={activeStream}
            onClose={() => void closeLive()}
            likes={liveLikes}
            onDoubleTapLike={() => void doubleTapLiveLike()}
            onInviteCohost={(cohostUsername) => void inviteCohost(cohostUsername)}
            cohostInvitation={activeStream.isHost ? cohostInviteNotice : hasCohostInvitation}
            onAcceptCohost={() => void acceptCohostInvite()}
            invitationBusy={cohostBusy}
            onFollow={() => void followLiveCreator()}
            followingBusy={liveFollowBusy}
          >
            <CommentList
              comments={shownComments(`live:${activeStream.id}`)}
              draft={commentDrafts[`live:${activeStream.id}`] || ''}
              setDraft={(value) => setCommentDrafts((current) => ({ ...current, [`live:${activeStream.id}`]: value }))}
              onSubmit={(event) => void submitComment(event, {
                key: `live:${activeStream.id}`,
                path: `/live/${activeStream.id}/comments`,
              })}
              busy={commentBusy}
              compact
            />
            <div className="max-h-[38%] shrink-0 overflow-y-auto border-t border-white/10 py-3">
              <p className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-[#d1d5cc]">
                <Sparkles size={14} className="text-[#eac16e]" /> Send a gift
              </p>
              <div className="grid grid-cols-2 gap-2">
                {gifts.map((gift) => (
                  <button
                    type="button"
                    key={gift.gift_id}
                    onClick={() => void sendGift(gift, { live_session_id: activeStream.id })}
                    className="rounded-xl border border-[#eac16e]/15 bg-white/[0.02] px-2 py-2 text-left text-xs hover:bg-[#eac16e]/10"
                  >
                    <span className="mr-1">{gift.icon}</span>{gift.name}
                    <span className="mt-1 block text-[#eac16e]">◉ {gift.coins}</span>
                  </button>
                ))}
              </div>
            </div>
          </LiveRoom>
        </Suspense>
      )}
    </PortalPageLayout>
  )
}
