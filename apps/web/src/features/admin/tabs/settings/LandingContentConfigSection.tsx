import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { resolveApiUrl } from '@/lib/http'
import * as adminApi from '@/features/admin/api'
import { moveItem, parseToastItemsJson } from '@/features/admin/publicSiteDraft'
import type { PublicSiteDraft } from '@/features/admin/types'
import { LayoutTemplate, Music, MessageSquare, Image as ImageIcon, Type, PlayCircle, Zap, Palette, ImagePlus, ShieldCheck, Megaphone } from 'lucide-react'

interface LandingContentConfigProps {
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
}

const TOAST_ITEMS_PAGE_SIZE = 10

export function LandingContentConfigSection({
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
}: LandingContentConfigProps) {
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
    { id: 'colors', label: 'Colors', icon: Palette, group: 'Appearance' },
    { id: 'logo', label: 'Logo', icon: ImagePlus, group: 'Appearance' },
    { id: 'promo-banner', label: 'Promo Banner', icon: Megaphone, group: 'Landing Page' },
    { id: 'hero-text', label: 'Hero Text', icon: Type, group: 'Landing Page' },
    { id: 'landing-media', label: 'Hero Media', icon: ImageIcon, group: 'Landing Page' },
    { id: 'landing-overlay', label: 'Hero Overlay', icon: Type, group: 'Landing Page' },
    { id: 'landing-player', label: 'Hero Player', icon: PlayCircle, group: 'Landing Page' },
    { id: 'trust-stats', label: 'Trust & Stats', icon: ShieldCheck, group: 'Landing Page' },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare, group: 'Landing Page' },
    { id: 'music', label: 'Music Playlist', icon: Music, group: 'Content' },
    { id: 'toast', label: 'Activity Toast', icon: MessageSquare, group: 'Content' },
    { id: 'creation-delivery', label: t.creationDelivery ?? 'Creation & Delivery', icon: Zap, group: 'System' },
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
      setError(err?.message ?? (t.uploadFailed ?? 'Upload failed.'))
    } finally {
      e.target.value = ''
    }
  }

  const groups = Array.from(new Set(menuItems.map(item => item.group)))

  return (
    <Card className="h-full shadow-sm flex flex-col overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-muted/5 shrink-0 border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{t.publicSite ?? 'Landing & Content'}</CardTitle>
            <CardDescription className="text-[10px]">{t.publicSiteDesc ?? ''}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isDirty && (
              <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full animate-pulse">
                {t.landingToastUnsaved ?? ''}
              </div>
            )}
            {savedAt && (
              <div className="text-[10px] text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-full">
                {(t.landingSavedAt ?? 'Saved {time}').replace('{time}', savedAt)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 min-h-0 flex flex-col md:flex-row">
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

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
            
            {activeTab === 'landing-media' && (
                <div className="space-y-4 w-full animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Hero Media</h3>
                        <p className="text-xs text-muted-foreground">{t.heroMediaDesc ?? ''}</p>
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

            {activeTab === 'landing-overlay' && (
                 <div className="space-y-4 w-full animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Hero Overlay</h3>
                        <p className="text-xs text-muted-foreground">{t.heroOverlayDesc ?? ''}</p>
                    </div>

                    <div className="space-y-3">
                         <div className="space-y-1">
                            <label className="text-xs font-medium">Quote</label>
                            <Textarea
                                value={draft.landing.heroOverlay.quote}
                                onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroOverlay: { ...d.landing.heroOverlay, quote: e.target.value } } }))}
                                placeholder={t.heroOverlayQuotePlaceholder ?? ''}
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

            {activeTab === 'landing-player' && (
                <div className="space-y-4 w-full animate-in fade-in duration-300">
                    <div className="pb-2 border-b flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Hero Player</h3>
                            <p className="text-xs text-muted-foreground">{t.heroPlayerDesc ?? ''}</p>
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

            {activeTab === 'colors' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Colors</h3>
                        <p className="text-xs text-muted-foreground mt-1">Set the main accent and background colors for this theme.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Accent Color</label>
                            <p className="text-[10px] text-muted-foreground">Main brand color used for buttons, links, and highlights.</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    className="h-10 w-14 rounded border cursor-pointer"
                                    value={draft.colors.accentColor}
                                    onChange={(e) => setDraft(d => ({ ...d, colors: { ...d.colors, accentColor: e.target.value } }))}
                                />
                                <Input
                                    className="flex-1 font-mono text-sm"
                                    value={draft.colors.accentColor}
                                    onChange={(e) => setDraft(d => ({ ...d, colors: { ...d.colors, accentColor: e.target.value } }))}
                                    placeholder="#E11D48"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Background Color 1</label>
                            <p className="text-[10px] text-muted-foreground">Soft background for header, sections, and badges.</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    className="h-10 w-14 rounded border cursor-pointer"
                                    value={draft.colors.bgColor1}
                                    onChange={(e) => setDraft(d => ({ ...d, colors: { ...d.colors, bgColor1: e.target.value } }))}
                                />
                                <Input
                                    className="flex-1 font-mono text-sm"
                                    value={draft.colors.bgColor1}
                                    onChange={(e) => setDraft(d => ({ ...d, colors: { ...d.colors, bgColor1: e.target.value } }))}
                                    placeholder="#FFF5F7"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Background Color 2</label>
                            <p className="text-[10px] text-muted-foreground">Main page background color.</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    className="h-10 w-14 rounded border cursor-pointer"
                                    value={draft.colors.bgColor2}
                                    onChange={(e) => setDraft(d => ({ ...d, colors: { ...d.colors, bgColor2: e.target.value } }))}
                                />
                                <Input
                                    className="flex-1 font-mono text-sm"
                                    value={draft.colors.bgColor2}
                                    onChange={(e) => setDraft(d => ({ ...d, colors: { ...d.colors, bgColor2: e.target.value } }))}
                                    placeholder="#FFFFFF"
                                />
                            </div>
                        </div>
                        <div className="rounded-lg border p-3 space-y-2">
                            <p className="text-xs font-medium">Preview</p>
                            <div className="flex gap-3 items-center">
                                <div className="h-10 w-10 rounded-lg border shadow-sm" style={{ backgroundColor: draft.colors.accentColor }} title="Accent" />
                                <div className="h-10 w-10 rounded-lg border shadow-sm" style={{ backgroundColor: draft.colors.bgColor1 }} title="BG 1" />
                                <div className="h-10 w-10 rounded-lg border shadow-sm" style={{ backgroundColor: draft.colors.bgColor2 }} title="BG 2" />
                                <div className="ml-2 text-xs text-muted-foreground">
                                    <span className="font-medium" style={{ color: draft.colors.accentColor }}>Sample accent text</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'logo' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Logo</h3>
                        <p className="text-xs text-muted-foreground mt-1">Upload or set a custom logo for this theme. Appears in the header and footer.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Logo URL</label>
                            <Input
                                className="text-sm"
                                value={draft.logoUrl}
                                onChange={(e) => setDraft(d => ({ ...d, logoUrl: e.target.value }))}
                                placeholder="/logo.png"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Upload Logo</label>
                            <Input
                                type="file"
                                accept="image/*"
                                className="text-sm"
                                onChange={(e) => handleUpload(e, 'image', (path) => setDraft(d => ({ ...d, logoUrl: path })))}
                            />
                        </div>
                        {draft.logoUrl && (
                            <div className="rounded-lg border p-4 bg-muted/20">
                                <p className="text-xs font-medium mb-2">Preview</p>
                                <div className="bg-white rounded p-3 inline-block">
                                    <img
                                        src={resolveApiUrl(draft.logoUrl)}
                                        alt="Logo preview"
                                        className="h-10 w-auto object-contain"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'promo-banner' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="pb-2 border-b">
                  <h3 className="text-base font-semibold">Promo Banner</h3>
                  <p className="text-xs text-muted-foreground mt-1">Banner countdown dan promo yang muncul di atas halaman landing.</p>
                </div>
                <div className="grid gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.promoBanner.enabled}
                      onChange={(e) => setDraft(d => ({ ...d, promoBanner: { ...d.promoBanner, enabled: e.target.checked } }))}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">Tampilkan promo banner</span>
                  </label>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Countdown Label</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="💝 Valentine's dalam"
                      value={draft.promoBanner.countdownLabel}
                      onChange={(e) => setDraft(d => ({ ...d, promoBanner: { ...d.promoBanner, countdownLabel: e.target.value } }))}
                    />
                    <p className="text-[10px] text-muted-foreground">Teks sebelum countdown timer. Contoh: "💝 Valentine's dalam"</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Target Date (YYYY-MM-DD)</label>
                    <Input
                      className="h-8 text-sm"
                      type="date"
                      value={draft.promoBanner.countdownTargetDate}
                      onChange={(e) => setDraft(d => ({ ...d, promoBanner: { ...d.promoBanner, countdownTargetDate: e.target.value } }))}
                    />
                    <p className="text-[10px] text-muted-foreground">Tanggal target countdown. Format: 2027-02-14</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Promo Badge Text</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="💝 Spesial Valentine"
                      value={draft.promoBanner.promoBadgeText}
                      onChange={(e) => setDraft(d => ({ ...d, promoBanner: { ...d.promoBanner, promoBadgeText: e.target.value } }))}
                    />
                    <p className="text-[10px] text-muted-foreground">Badge yang muncul di header navigasi.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Quota Badge Text</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="11 kuota!"
                      value={draft.promoBanner.quotaBadgeText}
                      onChange={(e) => setDraft(d => ({ ...d, promoBanner: { ...d.promoBanner, quotaBadgeText: e.target.value } }))}
                    />
                    <p className="text-[10px] text-muted-foreground">Badge kuota di sebelah harga. Kosongkan untuk sembunyikan.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hero-text' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Hero Text</h3>
                        <p className="text-xs text-muted-foreground mt-1">Headline, subtext, and footer call-to-action shown on the landing page.</p>
                    </div>
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold">Hero Headline</h4>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Line 1 (dark text)</label>
                                <Input
                                    value={draft.landing.heroHeadline.line1}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroHeadline: { ...d.landing.heroHeadline, line1: e.target.value } } }))}
                                    placeholder="Valentine kali ini,"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Line 2 (accent color)</label>
                                <Input
                                    value={draft.landing.heroHeadline.line2}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroHeadline: { ...d.landing.heroHeadline, line2: e.target.value } } }))}
                                    placeholder="buat dia menangis."
                                />
                            </div>
                            <div className="rounded-lg border p-3 space-y-1">
                                <p className="text-[10px] font-medium text-muted-foreground">Preview</p>
                                <div className="font-serif text-2xl font-bold leading-tight">
                                    <span className="text-gray-900">{draft.landing.heroHeadline.line1 || 'Valentine kali ini,'}</span>{' '}
                                    <span style={{ color: draft.colors.accentColor }}>{draft.landing.heroHeadline.line2 || 'buat dia menangis.'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Hero Subtext</label>
                            <p className="text-[10px] text-muted-foreground">Short description below the headline. Use &lt;strong&gt; for bold text.</p>
                            <Textarea
                                value={draft.landing.heroSubtext}
                                onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroSubtext: e.target.value } }))}
                                placeholder="Lagu personal dengan <strong>namanya</strong> di lirik. Dikirim dalam 24 jam."
                                className="h-16"
                            />
                        </div>

                        <div className="border-t pt-4 space-y-3">
                            <h4 className="text-sm font-bold">Footer Call-to-Action</h4>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Headline</label>
                                <Input
                                    value={draft.landing.footerCta.headline}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, footerCta: { ...d.landing.footerCta, headline: e.target.value } } }))}
                                    placeholder="Jangan biarkan Valentine berlalu"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Subtitle</label>
                                <p className="text-[10px] text-muted-foreground">Use &lt;strong&gt; for bold text.</p>
                                <Textarea
                                    value={draft.landing.footerCta.subtitle}
                                    onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, footerCta: { ...d.landing.footerCta, subtitle: e.target.value } } }))}
                                    placeholder="Beri dia hadiah yang tak akan pernah dia lupakan."
                                    className="h-16"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'trust-stats' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="pb-2 border-b">
                  <h3 className="text-base font-semibold">Hero Checkmarks</h3>
                  <p className="text-xs text-muted-foreground mt-1">Teks centang di atas tombol CTA (mis. "Kualitas Studio").</p>
                </div>
                <div className="space-y-2">
                  {draft.heroCheckmarks.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        className="h-8 text-sm flex-1"
                        placeholder="Kualitas Studio"
                        value={item}
                        onChange={(e) => setDraft(d => {
                          const items = [...d.heroCheckmarks]
                          items[idx] = e.target.value
                          return { ...d, heroCheckmarks: items }
                        })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setDraft(d => ({
                          ...d,
                          heroCheckmarks: d.heroCheckmarks.filter((_, i) => i !== idx)
                        }))}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDraft(d => ({
                      ...d,
                      heroCheckmarks: [...d.heroCheckmarks, '']
                    }))}
                  >
                    + Tambah Checkmark
                  </Button>
                </div>

                <div className="pb-2 border-b pt-4">
                  <h3 className="text-base font-semibold">Trust Badges</h3>
                  <p className="text-xs text-muted-foreground mt-1">Teks badge kepercayaan di bawah tombol CTA.</p>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Badge 1 (kiri)</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="24h Delivery"
                      value={draft.trustBadges.badge1}
                      onChange={(e) => setDraft(d => ({ ...d, trustBadges: { ...d.trustBadges, badge1: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Badge 2 (tengah)</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Secure"
                      value={draft.trustBadges.badge2}
                      onChange={(e) => setDraft(d => ({ ...d, trustBadges: { ...d.trustBadges, badge2: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Badge 3 (kanan)</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="11 kuota sisa"
                      value={draft.trustBadges.badge3}
                      onChange={(e) => setDraft(d => ({ ...d, trustBadges: { ...d.trustBadges, badge3: e.target.value } }))}
                    />
                  </div>
                </div>

                <div className="pb-2 border-b pt-4">
                  <h3 className="text-base font-semibold">Stats Bar</h3>
                  <p className="text-xs text-muted-foreground mt-1">Angka statistik yang ditampilkan di halaman landing.</p>
                </div>
                <div className="space-y-3">
                  {draft.statsBar.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Nilai {idx + 1}</label>
                        <Input
                          className="h-8 text-sm"
                          placeholder="99%"
                          value={item.val}
                          onChange={(e) => setDraft(d => {
                            const items = [...d.statsBar.items]
                            items[idx] = { ...items[idx], val: e.target.value }
                            return { ...d, statsBar: { ...d.statsBar, items } }
                          })}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Label {idx + 1}</label>
                        <Input
                          className="h-8 text-sm"
                          placeholder="Menangis"
                          value={item.label}
                          onChange={(e) => setDraft(d => {
                            const items = [...d.statsBar.items]
                            items[idx] = { ...items[idx], label: e.target.value }
                            return { ...d, statsBar: { ...d.statsBar, items } }
                          })}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setDraft(d => ({
                          ...d,
                          statsBar: { ...d.statsBar, items: d.statsBar.items.filter((_, i) => i !== idx) }
                        }))}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDraft(d => ({
                      ...d,
                      statsBar: { ...d.statsBar, items: [...d.statsBar.items, { val: '', label: '' }] }
                    }))}
                  >
                    + Tambah Stat
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="pb-2 border-b">
                  <h3 className="text-base font-semibold">Section Header</h3>
                  <p className="text-xs text-muted-foreground mt-1">Judul dan deskripsi bagian review di landing page.</p>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Label</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Reaksi Nyata"
                      value={draft.reviews.sectionLabel}
                      onChange={(e) => setDraft(d => ({ ...d, reviews: { ...d.reviews, sectionLabel: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Headline (HTML ok)</label>
                    <Input
                      className="h-8 text-sm"
                      value={draft.reviews.sectionHeadline}
                      onChange={(e) => setDraft(d => ({ ...d, reviews: { ...d.reviews, sectionHeadline: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Subtext</label>
                    <Input
                      className="h-8 text-sm"
                      value={draft.reviews.sectionSubtext}
                      onChange={(e) => setDraft(d => ({ ...d, reviews: { ...d.reviews, sectionSubtext: e.target.value } }))}
                    />
                  </div>
                </div>

                <div className="pb-2 border-b pt-4">
                  <h3 className="text-base font-semibold">Review Cards</h3>
                  <p className="text-xs text-muted-foreground mt-1">Testimoni yang ditampilkan di landing page. Pilih style: accent (warna tema), dark-chat (WhatsApp), white (putih).</p>
                </div>
                <div className="space-y-4">
                  {draft.reviews.items.map((item, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Review {idx + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDraft(d => ({
                            ...d,
                            reviews: { ...d.reviews, items: d.reviews.items.filter((_, i) => i !== idx) }
                          }))}
                        >
                          &times;
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Style</label>
                        <select
                          className="w-full h-8 text-sm border rounded px-2 bg-background"
                          value={item.style}
                          onChange={(e) => setDraft(d => {
                            const items = [...d.reviews.items]
                            items[idx] = { ...items[idx], style: e.target.value as 'accent' | 'dark-chat' | 'white' }
                            return { ...d, reviews: { ...d.reviews, items } }
                          })}
                        >
                          <option value="accent">Accent (warna tema)</option>
                          <option value="dark-chat">Dark Chat (WhatsApp)</option>
                          <option value="white">White</option>
                        </select>
                      </div>
                      {item.style === 'dark-chat' ? (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Chat Messages</label>
                          {(item.chatMessages || []).map((msg, mi) => (
                            <div key={mi} className="flex gap-2 items-center">
                              <Input
                                className="h-8 text-sm flex-1"
                                value={msg}
                                onChange={(e) => setDraft(d => {
                                  const items = [...d.reviews.items]
                                  const msgs = [...(items[idx].chatMessages || [])]
                                  msgs[mi] = e.target.value
                                  items[idx] = { ...items[idx], chatMessages: msgs }
                                  return { ...d, reviews: { ...d.reviews, items } }
                                })}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                                onClick={() => setDraft(d => {
                                  const items = [...d.reviews.items]
                                  const msgs = (items[idx].chatMessages || []).filter((_, i) => i !== mi)
                                  items[idx] = { ...items[idx], chatMessages: msgs }
                                  return { ...d, reviews: { ...d.reviews, items } }
                                })}
                              >
                                &times;
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setDraft(d => {
                              const items = [...d.reviews.items]
                              items[idx] = { ...items[idx], chatMessages: [...(items[idx].chatMessages || []), ''] }
                              return { ...d, reviews: { ...d.reviews, items } }
                            })}
                          >
                            + Tambah Pesan
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Quote (HTML ok: &lt;strong&gt;)</label>
                          <Textarea
                            className="text-sm min-h-[60px]"
                            value={item.quote}
                            onChange={(e) => setDraft(d => {
                              const items = [...d.reviews.items]
                              items[idx] = { ...items[idx], quote: e.target.value }
                              return { ...d, reviews: { ...d.reviews, items } }
                            })}
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Nama</label>
                          <Input
                            className="h-8 text-sm"
                            value={item.authorName}
                            onChange={(e) => setDraft(d => {
                              const items = [...d.reviews.items]
                              items[idx] = { ...items[idx], authorName: e.target.value }
                              return { ...d, reviews: { ...d.reviews, items } }
                            })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Meta (lokasi/waktu)</label>
                          <Input
                            className="h-8 text-sm"
                            value={item.authorMeta}
                            onChange={(e) => setDraft(d => {
                              const items = [...d.reviews.items]
                              items[idx] = { ...items[idx], authorMeta: e.target.value }
                              return { ...d, reviews: { ...d.reviews, items } }
                            })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Avatar URL</label>
                        <Input
                          className="h-8 text-sm"
                          placeholder="https://..."
                          value={item.authorAvatarUrl}
                          onChange={(e) => setDraft(d => {
                            const items = [...d.reviews.items]
                            items[idx] = { ...items[idx], authorAvatarUrl: e.target.value }
                            return { ...d, reviews: { ...d.reviews, items } }
                          })}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDraft(d => ({
                      ...d,
                      reviews: {
                        ...d.reviews,
                        items: [...d.reviews.items, {
                          style: 'white' as const,
                          quote: '',
                          authorName: '',
                          authorMeta: '',
                          authorAvatarUrl: '',
                        }]
                      }
                    }))}
                  >
                    + Tambah Review
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'creation-delivery' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                         <h3 className="text-base font-semibold">{t.creationDelivery ?? 'Creation & Delivery'}</h3>
                         <p className="text-xs text-muted-foreground mt-1">{t.creationDeliveryDesc ?? 'Controls instant vs delayed WhatsApp delivery.'}</p>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center justify-between gap-2 rounded border p-3 bg-background cursor-pointer hover:bg-muted/40 transition-colors">
                            <span className="text-sm font-medium">{t.instantEnabled ?? 'Instant delivery enabled'}</span>
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={draft.creationDelivery.instantEnabled}
                                onChange={(e) => setDraft(d => ({ ...d, creationDelivery: { ...d.creationDelivery, instantEnabled: e.target.checked } }))}
                            />
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded border p-3 bg-background cursor-pointer hover:bg-muted/40 transition-colors">
                            <span className="text-sm font-medium">{t.emailOtpEnabled ?? 'Email OTP verification'}</span>
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={draft.creationDelivery.emailOtpEnabled}
                                onChange={(e) => setDraft(d => ({ ...d, creationDelivery: { ...d.creationDelivery, emailOtpEnabled: e.target.checked } }))}
                            />
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded border p-3 bg-background cursor-pointer hover:bg-muted/40 transition-colors">
                            <span className="text-sm font-medium">{t.whatsappEnabled ?? 'Show WhatsApp field'}</span>
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={draft.creationDelivery.whatsappEnabled}
                                onChange={(e) => setDraft(d => ({ ...d, creationDelivery: { ...d.creationDelivery, whatsappEnabled: e.target.checked } }))}
                            />
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded border p-3 bg-background cursor-pointer hover:bg-muted/40 transition-colors">
                            <span className="text-sm font-medium">{t.agreementEnabled ?? 'Checkout agreement'}</span>
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={draft.creationDelivery.agreementEnabled}
                                onChange={(e) => setDraft(d => ({ ...d, creationDelivery: { ...d.creationDelivery, agreementEnabled: e.target.checked } }))}
                            />
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded border p-3 bg-background cursor-pointer hover:bg-muted/40 transition-colors">
                            <span className="text-sm font-medium">{t.manualConfirmationEnabled ?? 'Manual confirmation'}</span>
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={draft.creationDelivery.manualConfirmationEnabled}
                                onChange={(e) => setDraft(d => ({ ...d, creationDelivery: { ...d.creationDelivery, manualConfirmationEnabled: e.target.checked } }))}
                            />
                        </label>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">{t.deliveryDelay ?? 'Delivery delay (when instant is OFF)'}</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    min={0}
                                    className="flex-1"
                                    value={(() => {
                                        const h = draft.creationDelivery.deliveryDelayHours
                                        const unit = draft.creationDelivery.deliveryDelayUnit ?? (h >= 24 && h % 24 === 0 ? 'days' : 'hours')
                                        return unit === 'days' ? h / 24 : h
                                    })()}
                                    onChange={(e) => {
                                        const val = Number(e.target.value)
                                        const unit = draft.creationDelivery.deliveryDelayUnit ?? (draft.creationDelivery.deliveryDelayHours >= 24 && draft.creationDelivery.deliveryDelayHours % 24 === 0 ? 'days' : 'hours')
                                        const hours = unit === 'days' ? val * 24 : val
                                        setDraft(d => ({ ...d, creationDelivery: { ...d.creationDelivery, deliveryDelayHours: hours, deliveryDelayUnit: unit as 'hours' | 'days' } }))
                                    }}
                                />
                                <select
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                    value={draft.creationDelivery.deliveryDelayUnit ?? (draft.creationDelivery.deliveryDelayHours >= 24 && draft.creationDelivery.deliveryDelayHours % 24 === 0 ? 'days' : 'hours')}
                                    onChange={(e) => {
                                        const newUnit = e.target.value as 'hours' | 'days'
                                        const curH = draft.creationDelivery.deliveryDelayHours
                                        const curUnit = draft.creationDelivery.deliveryDelayUnit ?? (curH >= 24 && curH % 24 === 0 ? 'days' : 'hours')
                                        let newHours = curH
                                        if (curUnit === 'hours' && newUnit === 'days') newHours = Math.max(24, Math.round(curH / 24) * 24)
                                        if (curUnit === 'days' && newUnit === 'hours') newHours = curH
                                        setDraft(d => ({ ...d, creationDelivery: { ...d.creationDelivery, deliveryDelayHours: newHours, deliveryDelayUnit: newUnit } }))
                                    }}
                                >
                                    <option value="hours">Jam</option>
                                    <option value="days">Hari</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Harga Pembayaran (IDR) — 0 = gratis</label>
                            <Input
                                type="number"
                                value={draft.creationDelivery.paymentAmount}
                                onChange={(e) => setDraft(d => ({ ...d, creationDelivery: { ...d.creationDelivery, paymentAmount: Number(e.target.value) } }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Harga Asli (Coret) (IDR)</label>
                            <Input
                                type="number"
                                value={draft.creationDelivery.originalAmount}
                                onChange={(e) => setDraft(d => ({ ...d, creationDelivery: { ...d.creationDelivery, originalAmount: Number(e.target.value) } }))}
                            />
                        </div>
                    </div>
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
