import { useEffect, useState } from 'react'
import { Check, X, ExternalLink, RefreshCw, Video, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  adminGetTestimonialVideos,
  adminApproveTestimonialVideo,
  adminRejectTestimonialVideo,
  adminDeleteTestimonialVideo,
  type TestimonialVideoItem,
} from '@/features/admin/api'

interface Props {
  token: string
  t: any
}

function statusBadge(status: string) {
  if (status === 'approved')
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Approved</Badge>
  if (status === 'rejected')
    return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Rejected</Badge>
  return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">Pending</Badge>
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  )
}

export function AdminTestimonialsTab({ token, t: _t }: Props) {
  const [videos, setVideos] = useState<TestimonialVideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await adminGetTestimonialVideos(token)
      setVideos(data ?? [])
    } catch {
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [token])

  async function approve(id: string) {
    setActionLoading(id + '-approve')
    try {
      await adminApproveTestimonialVideo(token, id)
      setVideos((vs) => vs.map((v) => (v.id === id ? { ...v, status: 'approved' } : v)))
    } finally {
      setActionLoading(null)
    }
  }

  async function reject(id: string) {
    setActionLoading(id + '-reject')
    try {
      await adminRejectTestimonialVideo(token, id)
      setVideos((vs) => vs.map((v) => (v.id === id ? { ...v, status: 'rejected' } : v)))
    } finally {
      setActionLoading(null)
    }
  }

  async function deleteVideo(id: string) {
    setActionLoading(id + '-delete')
    try {
      await adminDeleteTestimonialVideo(token, id)
      setVideos((vs) => vs.filter((v) => v.id !== id))
      setConfirmDeleteId(null)
    } finally {
      setActionLoading(null)
    }
  }

  const q = search.trim().toLowerCase()
  const byStatus = filter === 'all' ? videos : videos.filter((v) => v.status === filter)
  const filtered = q
    ? byStatus.filter(
        (v) =>
          v.customerName.toLowerCase().includes(q) ||
          v.customerPhone.includes(q) ||
          v.recipientName.toLowerCase().includes(q),
      )
    : byStatus

  const counts = {
    all: videos.length,
    pending: videos.filter((v) => v.status === 'pending').length,
    approved: videos.filter((v) => v.status === 'approved').length,
    rejected: videos.filter((v) => v.status === 'rejected').length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Video Testimonial</span>
          <span className="text-xs text-muted-foreground">({videos.length} total)</span>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          className="h-8 text-xs pl-8"
          placeholder="Cari nama pelanggan, nomor HP, atau nama penerima..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearch('')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors ${
              filter === f
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f === 'all'
              ? 'Semua'
              : f === 'pending'
                ? 'Pending'
                : f === 'approved'
                  ? 'Disetujui'
                  : 'Ditolak'}
            <span className="ml-1 opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-xs text-muted-foreground py-8 text-center">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-xs text-muted-foreground py-8 text-center">
          {q
            ? `Tidak ada hasil untuk "${search}".`
            : `Tidak ada video testimonial${filter !== 'all' ? ` dengan status "${filter}"` : ''}.`}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <div key={v.id} className="border rounded-lg overflow-hidden bg-card">
              <div className="flex flex-col sm:flex-row gap-3 p-3">
                {/* Video player */}
                <div className="sm:w-64 shrink-0">
                  {playingId === v.id ? (
                    <video
                      src={v.videoUrl}
                      controls
                      autoPlay
                      className="w-full rounded aspect-video bg-black object-contain"
                    />
                  ) : (
                    <button
                      className="w-full aspect-video bg-muted rounded flex items-center justify-center hover:bg-muted/80 transition-colors group"
                      onClick={() => setPlayingId(v.id)}
                    >
                      <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center group-hover:bg-foreground/20 transition-colors">
                        <Video className="w-5 h-5 text-foreground/60" />
                      </div>
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold truncate">{v.customerName || '—'}</div>
                      <div className="text-[11px] text-muted-foreground">{v.customerPhone}</div>
                    </div>
                    {statusBadge(v.status)}
                  </div>

                  {v.recipientName && (
                    <div className="text-xs text-muted-foreground">
                      Untuk: <span className="text-foreground">{v.recipientName}</span>
                    </div>
                  )}

                  <div className="text-[11px] text-muted-foreground">{formatDate(v.createdAt)}</div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {v.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                          disabled={actionLoading !== null}
                          onClick={() => void approve(v.id)}
                        >
                          {actionLoading === v.id + '-approve' ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                          disabled={actionLoading !== null}
                          onClick={() => void reject(v.id)}
                        >
                          {actionLoading === v.id + '-reject' ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          Tolak
                        </Button>
                      </>
                    )}
                    {v.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                        disabled={actionLoading !== null}
                        onClick={() => void reject(v.id)}
                      >
                        <X className="w-3 h-3" />
                        Tolak
                      </Button>
                    )}
                    {v.status === 'rejected' && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                        disabled={actionLoading !== null}
                        onClick={() => void approve(v.id)}
                      >
                        <Check className="w-3 h-3" />
                        Setujui
                      </Button>
                    )}
                    <a
                      href={v.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded-md border hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Buka
                    </a>
                    <a
                      href={`/order/${v.orderId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded-md border hover:bg-muted transition-colors text-muted-foreground"
                    >
                      Order
                    </a>

                    {/* Delete — two-step confirm */}
                    {confirmDeleteId === v.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white gap-1"
                          disabled={actionLoading !== null}
                          onClick={() => void deleteVideo(v.id)}
                        >
                          {actionLoading === v.id + '-delete' ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Yakin hapus?
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Batal
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-muted-foreground hover:text-red-600 hover:border-red-200 gap-1"
                        disabled={actionLoading !== null}
                        onClick={() => setConfirmDeleteId(v.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                        Hapus
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
