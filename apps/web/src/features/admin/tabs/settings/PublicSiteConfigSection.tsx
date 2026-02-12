import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { resolveApiUrl } from '@/lib/http'
import * as adminApi from '@/features/admin/api'
import { moveItem, parseToastItemsJson } from '@/features/admin/publicSiteDraft'
import type { PublicSiteDraft, Settings } from '@/features/admin/types'
import { 
  LayoutTemplate, 
  Music, 
  MessageSquare, 
  Image as ImageIcon, 
  Type, 
  PlayCircle,
  Zap,
  Smartphone,
  Key
} from 'lucide-react'
import { CreationDeliveryCard } from './CreationDeliveryCard'
import { WhatsappGatewayCard } from './WhatsappGatewayCard'
import { ApiKeysCard } from './ApiKeysCard'

interface Props {
  draft: PublicSiteDraft
  setDraft: React.Dispatch<React.SetStateAction<PublicSiteDraft>>
  onSave: () => Promise<void>
  isDirty: boolean
  savedAt: string | null
  error: string | null
  setError: (s: string | null) => void
  loading: boolean
  token: string | null
  t: any
  // Extra Props for integrated sections
  settings: Settings
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>
  saveSettings: (
    partial: Partial<Settings> & { openaiApiKey?: string; kaiAiApiKey?: string; ycloudApiKey?: string },
  ) => Promise<Settings | null>
}

const TOAST_ITEMS_PAGE_SIZE = 10

export function PublicSiteConfigSection({
  draft,
  setDraft,
  onSave,
  isDirty,
  savedAt,
  error,
  setError,
  loading,
  token,
  t,
  settings,
  setSettings,
  saveSettings
}: Props) {
  const [activeTab, setActiveTab] = useState('landing-media')
  const [toastItemsJson, setToastItemsJson] = useState('')
  const [toastItemsJsonError, setToastItemsJsonError] = useState<string | null>(null)
  const [toastItemsPage, setToastItemsPage] = useState(1)

  const toastItemsTotal = draft.activityToast.items.length
  const toastItemsTotalPages = Math.ceil(toastItemsTotal / TOAST_ITEMS_PAGE_SIZE) || 1
  const toastItemsPageSafe = Math.min(Math.max(1, toastItemsPage), toastItemsTotalPages)
  const toastItemsStartIdx = (toastItemsPageSafe - 1) * TOAST_ITEMS_PAGE_SIZE
  const toastItemsEndIdx = Math.min(toastItemsStartIdx + TOAST_ITEMS_PAGE_SIZE, toastItemsTotal)

  const menuItems = [
    { id: 'landing-media', label: 'Hero Media', icon: ImageIcon, group: 'Landing Page' },
    { id: 'landing-overlay', label: 'Hero Overlay', icon: Type, group: 'Landing Page' },
    { id: 'landing-player', label: 'Hero Player', icon: PlayCircle, group: 'Landing Page' },
    { id: 'music', label: 'Music Playlist', icon: Music, group: 'Content' },
    { id: 'toast', label: 'Activity Toast', icon: MessageSquare, group: 'Content' },
    { id: 'creation-delivery', label: 'Creation & Delivery', icon: Zap, group: 'System' },
    { id: 'whatsapp-gateway', label: 'WhatsApp Gateway', icon: Smartphone, group: 'System' },
    { id: 'api-keys', label: 'API Keys', icon: Key, group: 'System' },
  ]

  const SidebarItem = ({ item }: { item: typeof menuItems[0] }) => (
    <Button
      variant={activeTab === item.id ? 'secondary' : 'ghost'}
      className={cn(
        "w-full justify-start gap-2 h-9 px-2 text-sm", 
        activeTab === item.id ? "font-medium" : "text-muted-foreground"
      )}
      onClick={() => setActiveTab(item.id)}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Button>
  )

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio', onSuccess: (path: string) => void) => {
    const f = e.target.files?.[0]
    if (!f || !token) return
    try {
      setError(null)
      const fd = new FormData()
      fd.append('file', f)
      const res = await adminApi.adminUpload(token, type, fd)
      onSuccess(res.path)
    } catch (err: any) {
      setError(err?.message ?? 'Upload gagal.')
    } finally {
      e.target.value = ''
    }
  }

  // Get unique groups
  const groups = Array.from(new Set(menuItems.map(item => item.group)))

  return (
    <Card className="h-full shadow-sm md:col-span-2 lg:col-span-3 flex flex-col overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-muted/5 shrink-0 border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{t.settings}</CardTitle>
            <CardDescription className="text-[10px]">Konfigurasi sistem, landing page, dan integrasi.</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isDirty && (
              <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full animate-pulse">
                landing/toast belum disimpan
              </div>
            )}
            {savedAt && (
              <div className="text-[10px] text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-full">
                landing tersimpan {savedAt}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Secondary Sidebar */}
        <aside className="w-full md:w-[220px] bg-muted/10 border-b md:border-b-0 md:border-r flex flex-col gap-1 p-2 overflow-y-auto">
            {groups.map(group => (
              <div key={group} className="mb-2">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {group}
                </div>
                {menuItems.filter(m => m.group === group).map(item => <SidebarItem key={item.id} item={item} />)}
              </div>
            ))}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
            
            {/* --- HERO MEDIA --- */}
            {activeTab === 'landing-media' && (
                <div className="space-y-4 w-full animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Hero Media</h3>
                        <p className="text-xs text-muted-foreground">Visual utama pada landing page (Gambar/Video).</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 items-start">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Media Type</label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={draft.landing.heroMedia.mode === 'image' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setDraft(d => ({ ...d, landing: { ...d.landing, heroMedia: { ...d.landing.heroMedia, mode: 'image' } } }))}
                                        className="w-full"
                                    >
                                        <ImageIcon className="mr-2 h-3 w-3" /> Image
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={draft.landing.heroMedia.mode === 'video' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setDraft(d => ({ ...d, landing: { ...d.landing, heroMedia: { ...d.landing.heroMedia, mode: 'video' } } }))}
                                        className="w-full"
                                    >
                                        <PlayCircle className="mr-2 h-3 w-3" /> Video
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium">Image URL</label>
                                <Input
                                    value={draft.landing.heroMedia.imageUrl}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroMedia: { ...d.landing.heroMedia, imageUrl: e.target.value } } }))}
                                    placeholder="https://..."
                                    className="h-9"
                                />
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="h-9 text-xs cursor-pointer"
                                        onChange={(e) => handleUpload(e, 'image', (path) => setDraft(d => ({ ...d, landing: { ...d.landing, heroMedia: { ...d.landing.heroMedia, mode: 'image', imageUrl: path } } })))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium">Video URL (MP4)</label>
                                <Input
                                    value={draft.landing.heroMedia.videoUrl}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroMedia: { ...d.landing.heroMedia, videoUrl: e.target.value } } }))}
                                    placeholder="https://..."
                                    className="h-9"
                                />
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept="video/*"
                                        className="h-9 text-xs cursor-pointer"
                                        onChange={(e) => handleUpload(e, 'video', (path) => setDraft(d => ({ ...d, landing: { ...d.landing, heroMedia: { ...d.landing.heroMedia, mode: 'video', videoUrl: path } } })))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="rounded-xl border bg-muted/10 p-3 space-y-2">
                            <div className="text-xs font-bold text-foreground">Preview</div>
                            <div className="relative aspect-video w-full mx-auto overflow-hidden rounded-lg shadow-sm border bg-black">
                                {draft.landing.heroMedia.mode === 'video' && draft.landing.heroMedia.videoUrl.trim() ? (
                                    <video
                                        className="h-full w-full object-cover opacity-80"
                                        src={resolveApiUrl(draft.landing.heroMedia.videoUrl.trim())}
                                        autoPlay loop muted playsInline
                                    />
                                ) : (
                                    <img
                                        src={resolveApiUrl(draft.landing.heroMedia.imageUrl.trim())}
                                        alt="Hero preview"
                                        className="h-full w-full object-cover opacity-80"
                                    />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <p className="text-white text-xs font-bold drop-shadow-md">Hero Content</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- HERO OVERLAY --- */}
            {activeTab === 'landing-overlay' && (
                 <div className="space-y-4 w-full animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Hero Overlay</h3>
                        <p className="text-xs text-muted-foreground">Teks testimonial yang muncul di atas Hero Media.</p>
                    </div>

                    <div className="space-y-3">
                         <div className="space-y-1">
                            <label className="text-xs font-medium">Quote</label>
                            <Textarea
                                value={draft.landing.heroOverlay.quote}
                                onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroOverlay: { ...d.landing.heroOverlay, quote: e.target.value } } }))}
                                placeholder="Example: Dia menangis bahagia..."
                                className="h-20"
                            />
                        </div>
                        
                        <div className="grid gap-3 sm:grid-cols-2">
                             <div className="space-y-1">
                                <label className="text-xs font-medium">Author Name</label>
                                <Input
                                    value={draft.landing.heroOverlay.authorName}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroOverlay: { ...d.landing.heroOverlay, authorName: e.target.value } } }))}
                                    placeholder="Name"
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-xs font-medium">Author Location</label>
                                <Input
                                    value={draft.landing.heroOverlay.authorLocation}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroOverlay: { ...d.landing.heroOverlay, authorLocation: e.target.value } } }))}
                                    placeholder="City"
                                />
                             </div>
                        </div>

                         <div className="space-y-1">
                            <label className="text-xs font-medium">Avatar URL</label>
                            <Input
                                value={draft.landing.heroOverlay.authorAvatarUrl}
                                onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroOverlay: { ...d.landing.heroOverlay, authorAvatarUrl: e.target.value } } }))}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                 </div>
            )}

            {/* --- HERO PLAYER --- */}
            {activeTab === 'landing-player' && (
                <div className="space-y-4 w-full animate-in fade-in duration-300">
                    <div className="pb-2 border-b flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Hero Player</h3>
                            <p className="text-xs text-muted-foreground">Music player mini yang melayang di hero section.</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs border rounded px-2 py-1 bg-muted/20 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={draft.landing.heroPlayer.enabled}
                                onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, enabled: e.target.checked } } }))}
                            />
                            Enabled
                        </label>
                    </div>

                    <div className={cn("space-y-4 transition-opacity", !draft.landing.heroPlayer.enabled && "opacity-50 pointer-events-none")}>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Audio Source (MP3)</label>
                             <Input
                                value={draft.landing.heroPlayer.audioUrl}
                                onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, audioUrl: e.target.value } } }))}
                                placeholder="/uploads/audios/... or https://..."
                            />
                             <Input
                                type="file"
                                accept="audio/*"
                                className="h-9 text-xs cursor-pointer"
                                onChange={(e) => handleUpload(e, 'audio', (path) => setDraft(d => ({ ...d, landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, enabled: true, audioUrl: path } } })))}
                            />
                            {draft.landing.heroPlayer.audioUrl.trim() && (
                                <audio className="w-full mt-2 h-8" controls src={resolveApiUrl(draft.landing.heroPlayer.audioUrl.trim())} />
                            )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Playing Badge</label>
                                <Input
                                    value={draft.landing.heroPlayer.playingBadgeText}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, playingBadgeText: e.target.value } } }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Corner Badge</label>
                                <Input
                                    value={draft.landing.heroPlayer.cornerBadgeText}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, cornerBadgeText: e.target.value } } }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium">Quote (Inside Player)</label>
                            <Input
                                value={draft.landing.heroPlayer.quote}
                                onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, quote: e.target.value } } }))}
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Author Name</label>
                                <Input
                                    value={draft.landing.heroPlayer.authorName}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, authorName: e.target.value } } }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Author Subline</label>
                                <Input
                                    value={draft.landing.heroPlayer.authorSubline}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, authorSubline: e.target.value } } }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MUSIC PLAYLIST --- */}
            {activeTab === 'music' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                         <h3 className="text-base font-semibold">Music Samples</h3>
                         <p className="text-xs text-muted-foreground">Daftar lagu contoh dan lagu yang "Sedang Diputar" di section Music.</p>
                    </div>

                    <div className="space-y-4">
                         <h4 className="text-sm font-bold flex items-center gap-2"><Music className="h-4 w-4" /> Now Playing (Featured)</h4>
                         <div className="grid gap-3 md:grid-cols-2 p-4 bg-muted/10 rounded-xl border">
                             <div className="space-y-1">
                                <label className="text-xs font-medium">Track Name</label>
                                <Input
                                    value={draft.landing.audioSamples.nowPlaying.name}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, audioSamples: { ...d.landing.audioSamples, nowPlaying: { ...d.landing.audioSamples.nowPlaying, name: e.target.value } } } }))}
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-xs font-medium">Duration</label>
                                <Input
                                    value={draft.landing.audioSamples.nowPlaying.time}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, audioSamples: { ...d.landing.audioSamples, nowPlaying: { ...d.landing.audioSamples.nowPlaying, time: e.target.value } } } }))}
                                    placeholder="3:45"
                                />
                             </div>
                             <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium">Description / Quote</label>
                                <Textarea
                                    value={draft.landing.audioSamples.nowPlaying.quote}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, audioSamples: { ...d.landing.audioSamples, nowPlaying: { ...d.landing.audioSamples.nowPlaying, quote: e.target.value } } } }))}
                                    className="h-16"
                                />
                             </div>
                              <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium">Audio URL</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={draft.landing.audioSamples.nowPlaying.audioUrl}
                                        onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, audioSamples: { ...d.landing.audioSamples, nowPlaying: { ...d.landing.audioSamples.nowPlaying, audioUrl: e.target.value } } } }))}
                                    />
                                    <Input
                                        type="file"
                                        accept="audio/*"
                                        className="w-1/3 text-xs cursor-pointer"
                                        onChange={(e) => handleUpload(e, 'audio', (path) => setDraft(d => ({ ...d, landing: { ...d.landing, audioSamples: { ...d.landing.audioSamples, nowPlaying: { ...d.landing.audioSamples.nowPlaying, audioUrl: path } } } })))}
                                    />
                                </div>
                             </div>
                         </div>
                    </div>

                    <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold flex items-center gap-2"><LayoutTemplate className="h-4 w-4" /> Playlist Items</h4>
                            <Button 
                                size="sm" variant="outline"
                                onClick={() => setDraft(d => ({ ...d, landing: { ...d.landing, audioSamples: { ...d.landing.audioSamples, playlist: [...d.landing.audioSamples.playlist, { title: 'New Track', subtitle: '', ctaLabel: 'PLAY', audioUrl: '' }] } } }))}
                            >
                                + Add Track
                            </Button>
                         </div>

                         <div className="space-y-3">
                             {draft.landing.audioSamples.playlist.map((item, i) => (
                                 <div key={i} className="p-3 border rounded-lg bg-card shadow-sm space-y-3">
                                     <div className="flex items-center justify-between">
                                         <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                                         <div className="flex gap-1">
                                             <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i===0} onClick={() => setDraft(d => ({...d, landing: {...d.landing, audioSamples: {...d.landing.audioSamples, playlist: moveItem(d.landing.audioSamples.playlist, i, i-1)}} }))}>↑</Button>
                                             <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i===draft.landing.audioSamples.playlist.length-1} onClick={() => setDraft(d => ({...d, landing: {...d.landing, audioSamples: {...d.landing.audioSamples, playlist: moveItem(d.landing.audioSamples.playlist, i, i+1)}} }))}>↓</Button>
                                             <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDraft(d => ({...d, landing: {...d.landing, audioSamples: {...d.landing.audioSamples, playlist: d.landing.audioSamples.playlist.filter((_, idx) => idx !== i)}} }))}>×</Button>
                                         </div>
                                     </div>
                                     <div className="grid gap-2 md:grid-cols-3">
                                         <Input 
                                            placeholder="Title" value={item.title} className="h-8 text-xs"
                                            onChange={(e) => setDraft(d => ({...d, landing: {...d.landing, audioSamples: {...d.landing.audioSamples, playlist: d.landing.audioSamples.playlist.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x)}} }))}
                                         />
                                         <Input 
                                            placeholder="Subtitle" value={item.subtitle} className="h-8 text-xs"
                                            onChange={(e) => setDraft(d => ({...d, landing: {...d.landing, audioSamples: {...d.landing.audioSamples, playlist: d.landing.audioSamples.playlist.map((x, idx) => idx === i ? { ...x, subtitle: e.target.value } : x)}} }))}
                                         />
                                         <div className="flex gap-1">
                                            <Input 
                                                placeholder="Audio URL" value={item.audioUrl} className="h-8 text-xs"
                                                onChange={(e) => setDraft(d => ({...d, landing: {...d.landing, audioSamples: {...d.landing.audioSamples, playlist: d.landing.audioSamples.playlist.map((x, idx) => idx === i ? { ...x, audioUrl: e.target.value } : x)}} }))}
                                            />
                                             <Input
                                                type="file"
                                                accept="audio/*"
                                                className="w-8 px-0 text-transparent h-8 cursor-pointer"
                                                title="Upload"
                                                onChange={(e) => handleUpload(e, 'audio', (path) => setDraft(d => ({...d, landing: {...d.landing, audioSamples: {...d.landing.audioSamples, playlist: d.landing.audioSamples.playlist.map((x, idx) => idx === i ? { ...x, audioUrl: path } : x)}} })))}
                                            />
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
            )}

            {/* --- TOAST --- */}
            {activeTab === 'toast' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b flex items-center justify-between">
                         <h3 className="text-base font-semibold">Activity Toast</h3>
                         <label className="flex items-center gap-2 text-xs border rounded px-2 py-1 bg-muted/20 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={draft.activityToast.enabled}
                                onChange={(e) => setDraft(d => ({ ...d, activityToast: { ...d.activityToast, enabled: e.target.checked } }))}
                            />
                            Enabled
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Interval (ms)</label>
                            <Input
                                type="number"
                                value={draft.activityToast.intervalMs}
                                onChange={(e) => setDraft(d => ({ ...d, activityToast: { ...d.activityToast, intervalMs: Number(e.target.value) } }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Duration (ms)</label>
                            <Input
                                type="number"
                                value={draft.activityToast.durationMs}
                                onChange={(e) => setDraft(d => ({ ...d, activityToast: { ...d.activityToast, durationMs: Number(e.target.value) } }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                             <h4 className="text-sm font-bold">Toast Items ({toastItemsTotal})</h4>
                             <div className="flex gap-2">
                                 <Button size="sm" variant="outline" onClick={() => setToastItemsJson(JSON.stringify(draft.activityToast.items, null, 2))}>
                                     Export JSON
                                 </Button>
                                 <Button size="sm" onClick={() => setDraft(d => ({ ...d, activityToast: { ...d.activityToast, items: [...d.activityToast.items, { fullName: 'New User', city: 'Jakarta', recipientName: 'Someone' }] } }))}>
                                     + Add Item
                                 </Button>
                             </div>
                        </div>

                         <div className="p-3 bg-muted/10 rounded-lg space-y-3">
                             <div className="space-y-2">
                                 <label className="text-xs font-medium text-muted-foreground">Bulk JSON Edit</label>
                                 <Textarea
                                     value={toastItemsJson}
                                     onChange={(e) => {
                                         setToastItemsJson(e.target.value)
                                         setToastItemsJsonError(null)
                                     }}
                                     placeholder='[{"fullName": "...", "city": "...", "recipientName": "..."}]'
                                     className="font-mono text-xs h-24"
                                 />
                                 {toastItemsJsonError && <p className="text-xs text-destructive">{toastItemsJsonError}</p>}
                                 <div className="flex gap-2">
                                     <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => {
                                         try {
                                             const items = parseToastItemsJson(toastItemsJson)
                                             if (!items.length) throw new Error("No items found")
                                             setDraft(d => ({ ...d, activityToast: { ...d.activityToast, items } }))
                                             setToastItemsJsonError(null)
                                         } catch(e: any) { setToastItemsJsonError(e.message) }
                                     }}>Replace All</Button>
                                     <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                                          try {
                                             const items = parseToastItemsJson(toastItemsJson)
                                             if (!items.length) throw new Error("No items found")
                                             setDraft(d => ({ ...d, activityToast: { ...d.activityToast, items: [...d.activityToast.items, ...items] } }))
                                             setToastItemsJsonError(null)
                                         } catch(e: any) { setToastItemsJsonError(e.message) }
                                     }}>Append</Button>
                                 </div>
                             </div>
                         </div>

                        {/* Pagination & List */}
                        <div className="flex items-center justify-between pt-2">
                             <Button size="sm" variant="ghost" disabled={toastItemsPageSafe <= 1} onClick={() => setToastItemsPage(p => p - 1)}>Prev</Button>
                             <span className="text-xs text-muted-foreground">Page {toastItemsPageSafe} of {toastItemsTotalPages}</span>
                             <Button size="sm" variant="ghost" disabled={toastItemsPageSafe >= toastItemsTotalPages} onClick={() => setToastItemsPage(p => p + 1)}>Next</Button>
                        </div>
                        
                        <div className="space-y-2">
                             {draft.activityToast.items.slice(toastItemsStartIdx, toastItemsEndIdx).map((item, relIdx) => {
                                 const i = toastItemsStartIdx + relIdx
                                 return (
                                     <div key={i} className="flex gap-2 items-center p-2 border rounded bg-white text-xs">
                                         <span className="w-6 text-muted-foreground font-mono">#{i+1}</span>
                                         <Input 
                                            value={item.fullName} className="h-7" placeholder="Name"
                                            onChange={(e) => setDraft(d => ({...d, activityToast: {...d.activityToast, items: d.activityToast.items.map((x, idx) => idx===i ? {...x, fullName: e.target.value} : x)}}))}
                                         />
                                         <Input 
                                            value={item.city} className="h-7" placeholder="City"
                                            onChange={(e) => setDraft(d => ({...d, activityToast: {...d.activityToast, items: d.activityToast.items.map((x, idx) => idx===i ? {...x, city: e.target.value} : x)}}))}
                                         />
                                         <Input 
                                            value={item.recipientName} className="h-7" placeholder="Recipient"
                                            onChange={(e) => setDraft(d => ({...d, activityToast: {...d.activityToast, items: d.activityToast.items.map((x, idx) => idx===i ? {...x, recipientName: e.target.value} : x)}}))}
                                         />
                                         <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDraft(d => ({...d, activityToast: {...d.activityToast, items: d.activityToast.items.filter((_, idx) => idx !== i)}}))}>×</Button>
                                     </div>
                                 )
                             })}
                        </div>
                    </div>
                </div>
            )}

            {/* --- SYSTEM SECTIONS --- */}
            {activeTab === 'creation-delivery' && (
              <div className="animate-in fade-in duration-300 h-full">
                <CreationDeliveryCard
                  settings={settings}
                  setSettings={setSettings}
                  saveSettings={saveSettings}
                  loading={loading}
                  t={t}
                />
              </div>
            )}

            {activeTab === 'whatsapp-gateway' && (
              <div className="animate-in fade-in duration-300 h-full">
                <WhatsappGatewayCard
                  settings={settings}
                  setSettings={setSettings}
                  saveSettings={saveSettings}
                  loading={loading}
                  t={t}
                />
              </div>
            )}

            {activeTab === 'api-keys' && (
              <div className="animate-in fade-in duration-300 h-full">
                <ApiKeysCard
                  settings={settings}
                  saveSettings={saveSettings}
                  t={t}
                />
              </div>
            )}

        </div>
      </CardContent>

      <div className="p-4 border-t bg-muted/5 shrink-0 flex justify-end gap-3">
            {error && <p className="text-xs text-destructive self-center">{error}</p>}
            <Button
                size="sm"
                disabled={loading || !isDirty}
                onClick={() => void onSave()}
            >
                {t.updateSettings}
            </Button>
      </div>
    </Card>
  )
}
