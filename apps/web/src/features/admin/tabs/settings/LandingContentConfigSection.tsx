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
import { LayoutTemplate, Music, MessageSquare, Image as ImageIcon, Type, PlayCircle, Zap, Palette, ImagePlus, ShieldCheck, Megaphone, Plus, Trash2, Heart, PenLine, PartyPopper, DollarSign, Gift, Clock } from 'lucide-react'

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
    { id: 'logo', label: 'Logo & Favicon', icon: ImagePlus, group: 'Appearance' },
    { id: 'promo-banner', label: 'Promo Banner', icon: Megaphone, group: 'Landing Page' },
    { id: 'hero-text', label: 'Hero Text', icon: Type, group: 'Landing Page' },
    { id: 'landing-media', label: 'Hero Media', icon: ImageIcon, group: 'Landing Page' },
    { id: 'landing-overlay', label: 'Hero Overlay', icon: Type, group: 'Landing Page' },
    { id: 'landing-player', label: 'Hero Player', icon: PlayCircle, group: 'Landing Page' },
    { id: 'trust-stats', label: 'Trust & Stats', icon: ShieldCheck, group: 'Landing Page' },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare, group: 'Landing Page' },
    { id: 'music', label: 'Music Playlist', icon: Music, group: 'Content' },
    { id: 'toast', label: 'Activity Toast', icon: MessageSquare, group: 'Content' },
    { id: 'audio-samples-section', label: 'Audio Section Text', icon: Music, group: 'Landing Page' },
    { id: 'comparison-section', label: 'Comparison Section', icon: ShieldCheck, group: 'Landing Page' },
    { id: 'how-it-works', label: 'How It Works', icon: Zap, group: 'Landing Page' },
    { id: 'guarantee-section', label: 'Guarantee Section', icon: ShieldCheck, group: 'Landing Page' },
    { id: 'faq-section', label: 'FAQ Section', icon: MessageSquare, group: 'Landing Page' },
    { id: 'footer-section', label: 'Footer', icon: LayoutTemplate, group: 'Landing Page' },
    { id: 'misc-text', label: 'Misc Text', icon: Type, group: 'Landing Page' },
    { id: 'price-visibility', label: 'Price Visibility', icon: DollarSign, group: 'Landing Page' },
    { id: 'creation-delivery', label: t.creationDelivery ?? 'Creation & Delivery', icon: Zap, group: 'System' },
    { id: 'config-step0', label: 'Step 0: Announcement', icon: Megaphone, group: 'Config Steps' },
    { id: 'config-step1', label: 'Step 1: Recipient', icon: Heart, group: 'Config Steps' },
    { id: 'config-step2', label: 'Step 2: Vibe', icon: Music, group: 'Config Steps' },
    { id: 'config-step3', label: 'Step 3: Story', icon: PenLine, group: 'Config Steps' },
    { id: 'config-step4', label: 'Step 4: Checkout', icon: PartyPopper, group: 'Config Steps' },
    { id: 'upsell', label: 'Upsell', icon: Gift, group: 'Config Steps' },
    { id: 'order-processing', label: 'Order Processing', icon: Clock, group: 'Config Steps' },
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
                            <Input
                                type="file"
                                accept="image/*"
                                className="h-9 text-xs cursor-pointer"
                                onChange={(e) => handleUpload(e, 'image', (path) => setDraft(d => ({ ...d, landing: { ...d.landing, heroOverlay: { ...d.landing.heroOverlay, authorAvatarUrl: path } } })))}
                            />
                            {draft.landing.heroOverlay.authorAvatarUrl.trim() && (
                                <img src={resolveApiUrl(draft.landing.heroOverlay.authorAvatarUrl.trim())} alt="Avatar preview" className="h-10 w-10 rounded-full object-cover mt-1" />
                            )}
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

                        <div className="space-y-1">
                            <label className="text-xs font-medium">Author Avatar URL</label>
                            <Input
                                value={draft.landing.heroPlayer.authorAvatarUrl}
                                onChange={(e) => setDraft(d => ({ ...d, landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, authorAvatarUrl: e.target.value } } }))}
                                placeholder="https://..."
                            />
                            <Input
                                type="file"
                                accept="image/*"
                                className="h-9 text-xs cursor-pointer"
                                onChange={(e) => handleUpload(e, 'image', (path) => setDraft(d => ({ ...d, landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, authorAvatarUrl: path } } })))}
                            />
                            {draft.landing.heroPlayer.authorAvatarUrl.trim() && (
                                <img src={resolveApiUrl(draft.landing.heroPlayer.authorAvatarUrl.trim())} alt="Avatar preview" className="h-10 w-10 rounded-full object-cover mt-1" />
                            )}
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
                            <label className="text-xs font-medium text-muted-foreground">Button Color</label>
                            <p className="text-[10px] text-muted-foreground">Color for CTA buttons. Leave empty to use accent color.</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    className="h-10 w-14 rounded border cursor-pointer"
                                    value={draft.colors.buttonColor || draft.colors.accentColor}
                                    onChange={(e) => setDraft(d => ({ ...d, colors: { ...d.colors, buttonColor: e.target.value } }))}
                                />
                                <Input
                                    className="flex-1 font-mono text-sm"
                                    value={draft.colors.buttonColor}
                                    onChange={(e) => setDraft(d => ({ ...d, colors: { ...d.colors, buttonColor: e.target.value } }))}
                                    placeholder="(same as accent)"
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
                                placeholder="/logo.webp"
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

                    <div className="border-t pt-4 space-y-3">
                        <div className="pb-2">
                            <h3 className="text-base font-semibold">Favicon</h3>
                            <p className="text-xs text-muted-foreground mt-1">The small icon shown in browser tabs. Recommended: SVG, PNG, or ICO format, 32x32 or 64x64 pixels.</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Favicon URL</label>
                            <Input
                                className="text-sm"
                                value={draft.faviconUrl}
                                onChange={(e) => setDraft(d => ({ ...d, faviconUrl: e.target.value }))}
                                placeholder="/favicon.svg"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Upload Favicon</label>
                            <Input
                                type="file"
                                accept="image/svg+xml,image/png,image/x-icon,image/vnd.microsoft.icon"
                                className="text-sm cursor-pointer"
                                onChange={(e) => handleUpload(e, 'image', (path) => setDraft(d => ({ ...d, faviconUrl: path })))}
                            />
                        </div>
                        {draft.faviconUrl && (
                            <div className="rounded-lg border p-4 bg-muted/20">
                                <p className="text-xs font-medium mb-2">Preview</p>
                                <div className="bg-white rounded p-3 inline-flex items-center gap-3">
                                    <img
                                        src={resolveApiUrl(draft.faviconUrl)}
                                        alt="Favicon preview"
                                        className="h-8 w-8 object-contain"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                    <span className="text-xs text-muted-foreground">32×32 preview</span>
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
                  <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.promoBanner.evergreenEnabled}
                        onChange={(e) => setDraft(d => ({ ...d, promoBanner: { ...d.promoBanner, evergreenEnabled: e.target.checked } }))}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">Evergreen Timer</span>
                    </label>
                    <p className="text-[10px] text-muted-foreground">Timer yang reset otomatis setiap X jam berdasarkan waktu Singapore (GMT+8). Cocok untuk promo yang selalu aktif.</p>
                    {draft.promoBanner.evergreenEnabled && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Cycle Hours (reset setiap X jam)</label>
                        <Input
                          className="h-8 text-sm"
                          type="number"
                          min={1}
                          max={168}
                          value={draft.promoBanner.evergreenCycleHours}
                          onChange={(e) => setDraft(d => ({ ...d, promoBanner: { ...d.promoBanner, evergreenCycleHours: Math.max(1, Number(e.target.value) || 1) } }))}
                        />
                        <p className="text-[10px] text-muted-foreground">Contoh: 24 = reset setiap 24 jam, 6 = reset setiap 6 jam. Timezone: GMT+8 Singapore.</p>
                      </div>
                    )}
                  </div>
                  {!draft.promoBanner.evergreenEnabled && (
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
                  )}
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
                        <Input
                          type="file"
                          accept="image/*"
                          className="h-8 text-xs cursor-pointer"
                          onChange={(e) => handleUpload(e, 'image', (path) => setDraft(d => {
                            const items = [...d.reviews.items]
                            items[idx] = { ...items[idx], authorAvatarUrl: path }
                            return { ...d, reviews: { ...d.reviews, items } }
                          }))}
                        />
                        {item.authorAvatarUrl?.trim() && (
                          <img src={resolveApiUrl(item.authorAvatarUrl.trim())} alt="Avatar preview" className="h-10 w-10 rounded-full object-cover mt-1" />
                        )}
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
                            <label className="text-xs font-medium text-muted-foreground">Max revisions (0 = no revisions allowed)</label>
                            <Input
                                type="number"
                                min={0}
                                max={10}
                                value={draft.creationDelivery.maxRegenerations}
                                onChange={(e) => setDraft(d => ({ ...d, creationDelivery: { ...d.creationDelivery, maxRegenerations: Math.max(0, Math.min(10, Number(e.target.value))) } }))}
                            />
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

            {activeTab === 'config-step0' && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Step 0: Announcement Page</h3>
                    <p className="text-xs text-muted-foreground">Configure the announcement/promo page that appears before the configurator starts.</p>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={draft.configSteps.step0.enabled}
                            onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step0: { ...d.configSteps.step0, enabled: e.target.checked } } }))}
                            className="rounded"
                        />
                        <label className="text-sm">Enable Step 0</label>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Banner Headline</label>
                        <Input value={draft.configSteps.step0.bannerHeadline} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step0: { ...d.configSteps.step0, bannerHeadline: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Main Headline (HTML OK)</label>
                        <Textarea rows={3} value={draft.configSteps.step0.mainHeadline} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step0: { ...d.configSteps.step0, mainHeadline: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Guarantee Title</label>
                        <Input value={draft.configSteps.step0.guaranteeTitle} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step0: { ...d.configSteps.step0, guaranteeTitle: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Guarantee Text (HTML OK)</label>
                        <Textarea rows={2} value={draft.configSteps.step0.guaranteeText} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step0: { ...d.configSteps.step0, guaranteeText: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">How It Works Title</label>
                        <Input value={draft.configSteps.step0.howItWorksTitle} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step0: { ...d.configSteps.step0, howItWorksTitle: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">How It Works Steps</label>
                        {draft.configSteps.step0.howItWorksSteps.map((s, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input className="flex-1" placeholder="Title" value={s.title} onChange={(e) => {
                                    const arr = [...draft.configSteps.step0.howItWorksSteps]
                                    arr[i] = { ...arr[i], title: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step0: { ...d.configSteps.step0, howItWorksSteps: arr } } }))
                                }} />
                                <Input className="flex-1" placeholder="Subtitle" value={s.subtitle} onChange={(e) => {
                                    const arr = [...draft.configSteps.step0.howItWorksSteps]
                                    arr[i] = { ...arr[i], subtitle: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step0: { ...d.configSteps.step0, howItWorksSteps: arr } } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.configSteps.step0.howItWorksSteps.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step0: { ...d.configSteps.step0, howItWorksSteps: arr } } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step0: { ...d.configSteps.step0, howItWorksSteps: [...d.configSteps.step0.howItWorksSteps, { title: '', subtitle: '' }] } } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Step</Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Bottom CTA Text</label>
                        <Input value={draft.configSteps.step0.bottomCtaText} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step0: { ...d.configSteps.step0, bottomCtaText: e.target.value } } }))} />
                    </div>
                </div>
            )}

            {activeTab === 'config-step1' && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Step 1: Recipient Details</h3>
                    <p className="text-xs text-muted-foreground">Configure the "Who is it for?" step with relationship options and field labels.</p>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Headline</label>
                        <Input value={draft.configSteps.step1.headline} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, headline: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Subtitle</label>
                        <Input value={draft.configSteps.step1.subtitle} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, subtitle: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Relationship Chips</label>
                        <p className="text-[10px] text-muted-foreground">"Lainnya" (Other) is always shown as the last option automatically.</p>
                        {draft.configSteps.step1.relationshipChips.map((chip, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input className="w-12 shrink-0 text-center" placeholder="Icon" value={chip.icon} onChange={(e) => {
                                    const arr = [...draft.configSteps.step1.relationshipChips]
                                    arr[i] = { ...arr[i], icon: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, relationshipChips: arr } } }))
                                }} />
                                <Input className="flex-1" placeholder="Label" value={chip.label} onChange={(e) => {
                                    const arr = [...draft.configSteps.step1.relationshipChips]
                                    arr[i] = { ...arr[i], label: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, relationshipChips: arr } } }))
                                }} />
                                <Input className="flex-1" placeholder="Value (sent to API)" value={chip.value} onChange={(e) => {
                                    const arr = [...draft.configSteps.step1.relationshipChips]
                                    arr[i] = { ...arr[i], value: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, relationshipChips: arr } } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.configSteps.step1.relationshipChips.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, relationshipChips: arr } } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, relationshipChips: [...d.configSteps.step1.relationshipChips, { label: '', icon: '✨', value: '' }] } } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Chip</Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Name Field Label</label>
                            <Input value={draft.configSteps.step1.nameFieldLabel} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, nameFieldLabel: e.target.value } } }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Name Field Placeholder</label>
                            <Input value={draft.configSteps.step1.nameFieldPlaceholder} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, nameFieldPlaceholder: e.target.value } } }))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Occasion Field Label (for "Lainnya")</label>
                            <Input value={draft.configSteps.step1.occasionFieldLabel} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, occasionFieldLabel: e.target.value } } }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Occasion Field Placeholder</label>
                            <Input value={draft.configSteps.step1.occasionFieldPlaceholder} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, occasionFieldPlaceholder: e.target.value } } }))} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Social Proof Text</label>
                        <Input value={draft.configSteps.step1.socialProofText} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step1: { ...d.configSteps.step1, socialProofText: e.target.value } } }))} />
                    </div>
                </div>
            )}

            {activeTab === 'config-step2' && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Step 2: Vibe / Music Style</h3>
                    <p className="text-xs text-muted-foreground">Configure the music genre selection, voice style options, and language choices.</p>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Headline</label>
                        <Input value={draft.configSteps.step2.headline} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, headline: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Subtitle</label>
                        <Input value={draft.configSteps.step2.subtitle} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, subtitle: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Genre / Vibe Chips</label>
                        <p className="text-[10px] text-muted-foreground">Each chip has an ID (sent to API), label, description, icon emoji, and optional badge text.</p>
                        {draft.configSteps.step2.vibeChips.map((chip, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input className="w-12 shrink-0 text-center" placeholder="Icon" value={chip.icon} onChange={(e) => {
                                    const arr = [...draft.configSteps.step2.vibeChips]
                                    arr[i] = { ...arr[i], icon: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, vibeChips: arr } } }))
                                }} />
                                <Input className="w-24 shrink-0" placeholder="ID" value={chip.id} onChange={(e) => {
                                    const arr = [...draft.configSteps.step2.vibeChips]
                                    arr[i] = { ...arr[i], id: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, vibeChips: arr } } }))
                                }} />
                                <Input className="flex-1" placeholder="Label" value={chip.label} onChange={(e) => {
                                    const arr = [...draft.configSteps.step2.vibeChips]
                                    arr[i] = { ...arr[i], label: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, vibeChips: arr } } }))
                                }} />
                                <Input className="flex-1" placeholder="Description" value={chip.desc} onChange={(e) => {
                                    const arr = [...draft.configSteps.step2.vibeChips]
                                    arr[i] = { ...arr[i], desc: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, vibeChips: arr } } }))
                                }} />
                                <Input className="w-16 shrink-0" placeholder="Badge" value={chip.badge || ''} onChange={(e) => {
                                    const arr = [...draft.configSteps.step2.vibeChips]
                                    arr[i] = { ...arr[i], badge: e.target.value || undefined }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, vibeChips: arr } } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.configSteps.step2.vibeChips.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, vibeChips: arr } } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, vibeChips: [...d.configSteps.step2.vibeChips, { id: '', label: '', desc: '', icon: '🎵' }] } } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Genre</Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Voice Section Label</label>
                        <Input value={draft.configSteps.step2.voiceLabel} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, voiceLabel: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Voice Options</label>
                        <p className="text-[10px] text-muted-foreground">Value is sent to API, Label is shown to user.</p>
                        {draft.configSteps.step2.voiceOptions.map((opt, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input className="flex-1" placeholder="Value (e.g. Female)" value={opt.value} onChange={(e) => {
                                    const arr = [...draft.configSteps.step2.voiceOptions]
                                    arr[i] = { ...arr[i], value: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, voiceOptions: arr } } }))
                                }} />
                                <Input className="flex-1" placeholder="Label (e.g. Wanita)" value={opt.label} onChange={(e) => {
                                    const arr = [...draft.configSteps.step2.voiceOptions]
                                    arr[i] = { ...arr[i], label: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, voiceOptions: arr } } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.configSteps.step2.voiceOptions.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, voiceOptions: arr } } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, voiceOptions: [...d.configSteps.step2.voiceOptions, { value: '', label: '' }] } } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Voice Option</Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Language Section Label</label>
                        <Input value={draft.configSteps.step2.languageLabel} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, languageLabel: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Language Options</label>
                        {draft.configSteps.step2.languageOptions.map((opt, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input className="flex-1" placeholder="Value (e.g. English)" value={opt.value} onChange={(e) => {
                                    const arr = [...draft.configSteps.step2.languageOptions]
                                    arr[i] = { ...arr[i], value: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, languageOptions: arr } } }))
                                }} />
                                <Input className="flex-1" placeholder="Label (e.g. Bahasa Indonesia)" value={opt.label} onChange={(e) => {
                                    const arr = [...draft.configSteps.step2.languageOptions]
                                    arr[i] = { ...arr[i], label: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, languageOptions: arr } } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.configSteps.step2.languageOptions.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, languageOptions: arr } } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step2: { ...d.configSteps.step2, languageOptions: [...d.configSteps.step2.languageOptions, { value: '', label: '' }] } } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Language</Button>
                    </div>
                </div>
            )}

            {activeTab === 'config-step3' && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Step 3: Story</h3>
                    <p className="text-xs text-muted-foreground">Configure the story-telling step where users write their personal story for the song lyrics.</p>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Headline</label>
                        <Input value={draft.configSteps.step3.headline} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step3: { ...d.configSteps.step3, headline: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Subtitle (HTML OK)</label>
                        <Input value={draft.configSteps.step3.subtitle} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step3: { ...d.configSteps.step3, subtitle: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Tip Bullets</label>
                        {draft.configSteps.step3.tipBullets.map((bullet, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input className="flex-1" value={bullet} onChange={(e) => {
                                    const arr = [...draft.configSteps.step3.tipBullets]
                                    arr[i] = e.target.value
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step3: { ...d.configSteps.step3, tipBullets: arr } } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.configSteps.step3.tipBullets.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step3: { ...d.configSteps.step3, tipBullets: arr } } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step3: { ...d.configSteps.step3, tipBullets: [...d.configSteps.step3.tipBullets, ''] } } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Bullet</Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Story Prompts (Ide Topik)</label>
                        {draft.configSteps.step3.storyPrompts.map((prompt, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input className="w-12 shrink-0 text-center" placeholder="Icon" value={prompt.icon} onChange={(e) => {
                                    const arr = [...draft.configSteps.step3.storyPrompts]
                                    arr[i] = { ...arr[i], icon: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step3: { ...d.configSteps.step3, storyPrompts: arr } } }))
                                }} />
                                <Input className="flex-1" placeholder="Label" value={prompt.label} onChange={(e) => {
                                    const arr = [...draft.configSteps.step3.storyPrompts]
                                    arr[i] = { ...arr[i], label: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step3: { ...d.configSteps.step3, storyPrompts: arr } } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.configSteps.step3.storyPrompts.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step3: { ...d.configSteps.step3, storyPrompts: arr } } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step3: { ...d.configSteps.step3, storyPrompts: [...d.configSteps.step3.storyPrompts, { label: '', icon: '💡' }] } } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Prompt</Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Textarea Placeholder</label>
                        <Input value={draft.configSteps.step3.textareaPlaceholder} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step3: { ...d.configSteps.step3, textareaPlaceholder: e.target.value } } }))} />
                    </div>
                </div>
            )}

            {activeTab === 'config-step4' && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Step 4: Review / Checkout</h3>
                    <p className="text-xs text-muted-foreground">Configure the final checkout step texts. Use {'{recipient}'} for the recipient's name and {'{delivery}'} for delivery estimate.</p>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Headline</label>
                        <Input value={draft.configSteps.step4.headline} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, headline: e.target.value } } }))} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Subtitle (normal mode)</label>
                            <Input value={draft.configSteps.step4.subtitleTemplate} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, subtitleTemplate: e.target.value } } }))} />
                            <p className="text-[10px] text-muted-foreground">Use {'{recipient}'} for recipient name</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Subtitle (manual confirmation)</label>
                            <Input value={draft.configSteps.step4.manualSubtitle} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, manualSubtitle: e.target.value } } }))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-[1fr_80px] gap-3">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Order Summary Label</label>
                            <Input value={draft.configSteps.step4.orderSummaryLabel} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, orderSummaryLabel: e.target.value } } }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Emoji</label>
                            <Input value={draft.configSteps.step4.orderSummaryEmoji} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, orderSummaryEmoji: e.target.value } } }))} className="text-center" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">WhatsApp Field Label</label>
                            <Input value={draft.configSteps.step4.whatsappLabel} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, whatsappLabel: e.target.value } } }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">WhatsApp Placeholder</label>
                            <Input value={draft.configSteps.step4.whatsappPlaceholder} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, whatsappPlaceholder: e.target.value } } }))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Email Field Label</label>
                            <Input value={draft.configSteps.step4.emailLabel} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, emailLabel: e.target.value } } }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Email Placeholder</label>
                            <Input value={draft.configSteps.step4.emailPlaceholder} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, emailPlaceholder: e.target.value } } }))} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Next Steps Title</label>
                        <Input value={draft.configSteps.step4.nextStepsTitle} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, nextStepsTitle: e.target.value } } }))} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Next Steps (normal mode)</label>
                        <p className="text-[10px] text-muted-foreground">Use {'{delivery}'} for delivery estimate text</p>
                        {draft.configSteps.step4.nextSteps.map((s, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-[9px] font-bold text-green-700">{i + 1}</div>
                                <Input className="flex-1" value={s.text} onChange={(e) => {
                                    const arr = [...draft.configSteps.step4.nextSteps]
                                    arr[i] = { text: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, nextSteps: arr } } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.configSteps.step4.nextSteps.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, nextSteps: arr } } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, nextSteps: [...d.configSteps.step4.nextSteps, { text: '' }] } } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Step</Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Next Steps (manual confirmation mode)</label>
                        {draft.configSteps.step4.manualNextSteps.map((s, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-[9px] font-bold text-green-700">{i + 1}</div>
                                <Input className="flex-1" value={s.text} onChange={(e) => {
                                    const arr = [...draft.configSteps.step4.manualNextSteps]
                                    arr[i] = { text: e.target.value }
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, manualNextSteps: arr } } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.configSteps.step4.manualNextSteps.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, manualNextSteps: arr } } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, manualNextSteps: [...d.configSteps.step4.manualNextSteps, { text: '' }] } } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Step</Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Security Badges</label>
                        <p className="text-[10px] text-muted-foreground">Use {'{delivery}'} for delivery estimate</p>
                        {draft.configSteps.step4.securityBadges.map((badge, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input className="flex-1" value={badge} onChange={(e) => {
                                    const arr = [...draft.configSteps.step4.securityBadges]
                                    arr[i] = e.target.value
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, securityBadges: arr } } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.configSteps.step4.securityBadges.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, securityBadges: arr } } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, securityBadges: [...d.configSteps.step4.securityBadges, ''] } } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Badge</Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Draft Timer Text</label>
                        <Input value={draft.configSteps.step4.draftTimerText} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, draftTimerText: e.target.value } } }))} />
                        <p className="text-[10px] text-muted-foreground">Use {'{timer}'} for countdown timer</p>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checkout Image</h4>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Image URL</label>
                            <Input value={draft.configSteps.step4.checkoutImageUrl} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, checkoutImageUrl: e.target.value } } }))} />
                            <Input
                                type="file"
                                accept="image/*"
                                className="h-9 text-xs cursor-pointer"
                                onChange={(e) => handleUpload(e, 'image', (path) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, checkoutImageUrl: path } } })))}
                            />
                        </div>
                        <label className="flex items-center justify-between gap-2 rounded border p-3 bg-background cursor-pointer hover:bg-muted/40 transition-colors">
                            <span className="text-sm font-medium">Show image in checkout</span>
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={draft.configSteps.step4.showCheckoutImage}
                                onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, showCheckoutImage: e.target.checked } } }))}
                            />
                        </label>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checkout Button</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Button Text (normal)</label>
                                <Input value={draft.configSteps.step4.checkoutButtonText} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, checkoutButtonText: e.target.value } } }))} />
                                <p className="text-[10px] text-muted-foreground">e.g. "Ke checkout", "Buat Lagu Sekarang"</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Button Text (manual confirmation)</label>
                                <Input value={draft.configSteps.step4.manualCheckoutButtonText} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, manualCheckoutButtonText: e.target.value } } }))} />
                                <p className="text-[10px] text-muted-foreground">e.g. "Konfirmasi via WhatsApp"</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Subtext under button</label>
                            <Input value={draft.configSteps.step4.checkoutSubtext} onChange={(e) => setDraft(d => ({ ...d, configSteps: { ...d.configSteps, step4: { ...d.configSteps.step4, checkoutSubtext: e.target.value } } }))} />
                            <p className="text-[10px] text-muted-foreground">Use {'{recipient}'} for recipient name. e.g. "Siap bikin sesuatu yang spesial untuk {'{recipient}'}?"</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">Price visibility is now controlled from the "Price Visibility" tab.</p>
                    </div>
                </div>
            )}

            {activeTab === 'audio-samples-section' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Audio Section Text</h3>
                        <p className="text-xs text-muted-foreground">Configure the audio samples section headings and labels.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Section Badge</label>
                            <Input value={draft.audioSamplesSection.badge} onChange={(e) => setDraft(d => ({ ...d, audioSamplesSection: { ...d.audioSamplesSection, badge: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Section Headline (HTML allowed)</label>
                            <Input value={draft.audioSamplesSection.headline} onChange={(e) => setDraft(d => ({ ...d, audioSamplesSection: { ...d.audioSamplesSection, headline: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Section Subtext</label>
                            <Input value={draft.audioSamplesSection.subtext} onChange={(e) => setDraft(d => ({ ...d, audioSamplesSection: { ...d.audioSamplesSection, subtext: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">'Other samples' Label</label>
                            <Input value={draft.audioSamplesSection.otherLabel} onChange={(e) => setDraft(d => ({ ...d, audioSamplesSection: { ...d.audioSamplesSection, otherLabel: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">CTA Line (HTML allowed)</label>
                            <Input value={draft.audioSamplesSection.ctaLine} onChange={(e) => setDraft(d => ({ ...d, audioSamplesSection: { ...d.audioSamplesSection, ctaLine: e.target.value } }))} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'comparison-section' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Comparison Section</h3>
                        <p className="text-xs text-muted-foreground">Configure the comparison section content.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Section Headline (HTML)</label>
                            <Input value={draft.comparisonSection.headline} onChange={(e) => setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, headline: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">'Forgotten' Label</label>
                            <Input value={draft.comparisonSection.forgottenLabel} onChange={(e) => setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, forgottenLabel: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">'Forever' Label</label>
                            <Input value={draft.comparisonSection.foreverLabel} onChange={(e) => setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, foreverLabel: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Best Price Badge Text</label>
                            <Input value={draft.comparisonSection.bestPriceBadge} onChange={(e) => setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, bestPriceBadge: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Product Title</label>
                            <Input value={draft.comparisonSection.productTitle} onChange={(e) => setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, productTitle: e.target.value } }))} />
                        </div>
                    </div>

                    <div className="space-y-2 border-t pt-4">
                        <label className="text-xs font-medium text-muted-foreground">Gift Items</label>
                        {draft.comparisonSection.giftItems.map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input className="w-16 shrink-0" placeholder="Icon" value={item.icon} onChange={(e) => {
                                    const arr = [...draft.comparisonSection.giftItems]
                                    arr[i] = { ...arr[i], icon: e.target.value }
                                    setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, giftItems: arr } }))
                                }} />
                                <Input className="flex-1" placeholder="Name" value={item.name} onChange={(e) => {
                                    const arr = [...draft.comparisonSection.giftItems]
                                    arr[i] = { ...arr[i], name: e.target.value }
                                    setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, giftItems: arr } }))
                                }} />
                                <Input className="w-24 shrink-0" placeholder="Price" value={item.price} onChange={(e) => {
                                    const arr = [...draft.comparisonSection.giftItems]
                                    arr[i] = { ...arr[i], price: e.target.value }
                                    setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, giftItems: arr } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.comparisonSection.giftItems.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, giftItems: arr } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, giftItems: [...d.comparisonSection.giftItems, { icon: '🎁', name: '', price: '' }] } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Gift</Button>
                    </div>

                    <div className="space-y-2 border-t pt-4">
                        <label className="text-xs font-medium text-muted-foreground">Checklist Items</label>
                        {draft.comparisonSection.checklistItems.map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input className="flex-1" placeholder="Checklist item (HTML allowed)" value={item.text} onChange={(e) => {
                                    const arr = [...draft.comparisonSection.checklistItems]
                                    arr[i] = { text: e.target.value }
                                    setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, checklistItems: arr } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.comparisonSection.checklistItems.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, checklistItems: arr } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, comparisonSection: { ...d.comparisonSection, checklistItems: [...d.comparisonSection.checklistItems, { text: '' }] } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Checklist Item</Button>
                    </div>
                </div>
            )}

            {activeTab === 'how-it-works' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">How It Works</h3>
                        <p className="text-xs text-muted-foreground">Configure the "How It Works" section on the landing page.</p>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input type="checkbox" checked={!draft.howItWorksSection.hidden} onChange={(e) => setDraft(d => ({ ...d, howItWorksSection: { ...d.howItWorksSection, hidden: !e.target.checked } }))} className="rounded" />
                            <span className="text-sm">Show this section on landing page</span>
                        </label>
                    </div>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Section Label</label>
                            <Input value={draft.howItWorksSection.label} onChange={(e) => setDraft(d => ({ ...d, howItWorksSection: { ...d.howItWorksSection, label: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Section Headline (HTML)</label>
                            <Input value={draft.howItWorksSection.headline} onChange={(e) => setDraft(d => ({ ...d, howItWorksSection: { ...d.howItWorksSection, headline: e.target.value } }))} />
                        </div>
                    </div>

                    <div className="space-y-2 border-t pt-4">
                        <label className="text-xs font-medium text-muted-foreground">Steps</label>
                        {draft.howItWorksSection.steps.map((step, i) => (
                            <div key={i} className="border rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-muted-foreground">Step {i + 1}</span>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => setDraft(d => ({ ...d, howItWorksSection: { ...d.howItWorksSection, steps: moveItem(d.howItWorksSection.steps, i, i - 1) } }))}>↑</Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === draft.howItWorksSection.steps.length - 1} onClick={() => setDraft(d => ({ ...d, howItWorksSection: { ...d.howItWorksSection, steps: moveItem(d.howItWorksSection.steps, i, i + 1) } }))}>↓</Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => {
                                            const arr = draft.howItWorksSection.steps.filter((_, j) => j !== i)
                                            setDraft(d => ({ ...d, howItWorksSection: { ...d.howItWorksSection, steps: arr } }))
                                        }}><Trash2 className="h-3 w-3" /></Button>
                                    </div>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-muted-foreground">Icon</label>
                                        <Input value={step.icon} onChange={(e) => {
                                            const arr = [...draft.howItWorksSection.steps]
                                            arr[i] = { ...arr[i], icon: e.target.value }
                                            setDraft(d => ({ ...d, howItWorksSection: { ...d.howItWorksSection, steps: arr } }))
                                        }} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-muted-foreground">Title</label>
                                        <Input value={step.title} onChange={(e) => {
                                            const arr = [...draft.howItWorksSection.steps]
                                            arr[i] = { ...arr[i], title: e.target.value }
                                            setDraft(d => ({ ...d, howItWorksSection: { ...d.howItWorksSection, steps: arr } }))
                                        }} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-muted-foreground">Description</label>
                                    <Textarea className="min-h-[50px]" value={step.desc} onChange={(e) => {
                                        const arr = [...draft.howItWorksSection.steps]
                                        arr[i] = { ...arr[i], desc: e.target.value }
                                        setDraft(d => ({ ...d, howItWorksSection: { ...d.howItWorksSection, steps: arr } }))
                                    }} />
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, howItWorksSection: { ...d.howItWorksSection, steps: [...d.howItWorksSection.steps, { icon: '🎵', title: '', desc: '' }] } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Step</Button>
                    </div>
                </div>
            )}

            {activeTab === 'guarantee-section' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Guarantee Section</h3>
                        <p className="text-xs text-muted-foreground">Configure the guarantee section content.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Badge Text</label>
                            <Input value={draft.guaranteeSection.badge} onChange={(e) => setDraft(d => ({ ...d, guaranteeSection: { ...d.guaranteeSection, badge: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Headline</label>
                            <Input value={draft.guaranteeSection.headline} onChange={(e) => setDraft(d => ({ ...d, guaranteeSection: { ...d.guaranteeSection, headline: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Description (HTML allowed)</label>
                            <Textarea className="min-h-[80px]" value={draft.guaranteeSection.description} onChange={(e) => setDraft(d => ({ ...d, guaranteeSection: { ...d.guaranteeSection, description: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Video URL</label>
                            <Input value={draft.guaranteeSection.videoUrl} onChange={(e) => setDraft(d => ({ ...d, guaranteeSection: { ...d.guaranteeSection, videoUrl: e.target.value } }))} />
                            <Input
                                type="file"
                                accept="video/*"
                                className="h-9 text-xs cursor-pointer"
                                onChange={(e) => handleUpload(e, 'video', (path) => setDraft(d => ({ ...d, guaranteeSection: { ...d.guaranteeSection, videoUrl: path } })))}
                            />
                            {draft.guaranteeSection.videoUrl.trim() && (
                                <video src={resolveApiUrl(draft.guaranteeSection.videoUrl.trim())} className="w-full max-w-xs rounded mt-1" controls muted />
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 border-t pt-4">
                        <label className="text-xs font-medium text-muted-foreground">Badges</label>
                        {draft.guaranteeSection.badges.map((badge, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input className="flex-1" value={badge} onChange={(e) => {
                                    const arr = [...draft.guaranteeSection.badges]
                                    arr[i] = e.target.value
                                    setDraft(d => ({ ...d, guaranteeSection: { ...d.guaranteeSection, badges: arr } }))
                                }} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const arr = draft.guaranteeSection.badges.filter((_, j) => j !== i)
                                    setDraft(d => ({ ...d, guaranteeSection: { ...d.guaranteeSection, badges: arr } }))
                                }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, guaranteeSection: { ...d.guaranteeSection, badges: [...d.guaranteeSection.badges, ''] } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add Badge</Button>
                    </div>
                </div>
            )}

            {activeTab === 'faq-section' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">FAQ Section</h3>
                        <p className="text-xs text-muted-foreground">Configure the FAQ section on the landing page.</p>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input type="checkbox" checked={!draft.faqSection.hidden} onChange={(e) => setDraft(d => ({ ...d, faqSection: { ...d.faqSection, hidden: !e.target.checked } }))} className="rounded" />
                            <span className="text-sm">Show this section on landing page</span>
                        </label>
                    </div>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Section Headline (HTML)</label>
                            <Input value={draft.faqSection.headline} onChange={(e) => setDraft(d => ({ ...d, faqSection: { ...d.faqSection, headline: e.target.value } }))} />
                        </div>
                    </div>

                    <div className="space-y-2 border-t pt-4">
                        <label className="text-xs font-medium text-muted-foreground">FAQ Items</label>
                        {draft.faqSection.items.map((item, i) => (
                            <div key={i} className="border rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-muted-foreground">FAQ {i + 1}</span>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => {
                                        const arr = draft.faqSection.items.filter((_, j) => j !== i)
                                        setDraft(d => ({ ...d, faqSection: { ...d.faqSection, items: arr } }))
                                    }}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-muted-foreground">Question</label>
                                    <Input value={item.q} onChange={(e) => {
                                        const arr = [...draft.faqSection.items]
                                        arr[i] = { ...arr[i], q: e.target.value }
                                        setDraft(d => ({ ...d, faqSection: { ...d.faqSection, items: arr } }))
                                    }} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-muted-foreground">Answer</label>
                                    <Textarea className="min-h-[60px]" value={item.a} onChange={(e) => {
                                        const arr = [...draft.faqSection.items]
                                        arr[i] = { ...arr[i], a: e.target.value }
                                        setDraft(d => ({ ...d, faqSection: { ...d.faqSection, items: arr } }))
                                    }} />
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            setDraft(d => ({ ...d, faqSection: { ...d.faqSection, items: [...d.faqSection.items, { q: '', a: '' }] } }))
                        }}><Plus className="h-3 w-3 mr-1" /> Add FAQ Item</Button>
                    </div>
                </div>
            )}

            {activeTab === 'footer-section' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Footer</h3>
                        <p className="text-xs text-muted-foreground">Configure the footer content.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Tagline</label>
                            <Input value={draft.footer.tagline} onChange={(e) => setDraft(d => ({ ...d, footer: { ...d.footer, tagline: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Company Name</label>
                            <Input value={draft.footer.companyName} onChange={(e) => setDraft(d => ({ ...d, footer: { ...d.footer, companyName: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Email</label>
                            <Input value={draft.footer.email} onChange={(e) => setDraft(d => ({ ...d, footer: { ...d.footer, email: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                            <Input value={draft.footer.phone ?? ''} onChange={(e) => setDraft(d => ({ ...d, footer: { ...d.footer, phone: e.target.value } }))} placeholder="e.g. +62 895 3702 31680" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Disclaimer</label>
                            <Textarea className="min-h-[80px]" value={draft.footer.disclaimer} onChange={(e) => setDraft(d => ({ ...d, footer: { ...d.footer, disclaimer: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Copyright Line</label>
                            <Input value={draft.footer.copyrightLine} onChange={(e) => setDraft(d => ({ ...d, footer: { ...d.footer, copyrightLine: e.target.value } }))} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'misc-text' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Misc Text</h3>
                        <p className="text-xs text-muted-foreground">Miscellaneous text strings used across the landing page.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Hero Tagline</label>
                            <Input value={draft.miscText.heroTagline} onChange={(e) => setDraft(d => ({ ...d, miscText: { ...d.miscText, heroTagline: e.target.value } }))} />
                            <p className="text-[10px] text-muted-foreground">Small text above the headline. e.g. "THE #1 CUSTOM SONG GIFT"</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Headline Font</label>
                            <select
                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                                value={draft.miscText.headlineFont}
                                onChange={(e) => setDraft(d => ({ ...d, miscText: { ...d.miscText, headlineFont: e.target.value } }))}
                            >
                                <option value="serif">Serif (system)</option>
                                <option value="sans-serif">Sans-serif (system)</option>
                                <option value="Playfair Display">Playfair Display (elegant serif)</option>
                                <option value="Merriweather">Merriweather (readable serif)</option>
                                <option value="Lora">Lora (contemporary serif)</option>
                                <option value="Cormorant Garamond">Cormorant Garamond (refined classic)</option>
                                <option value="DM Serif Display">DM Serif Display (high-impact)</option>
                                <option value="Poppins">Poppins (geometric sans)</option>
                                <option value="Montserrat">Montserrat (bold modern sans)</option>
                                <option value="Raleway">Raleway (elegant sans)</option>
                            </select>
                            <p className="text-[10px] text-muted-foreground">Font family for the hero headline.</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Hero Star Line</label>
                            <Input value={draft.miscText.heroStarLine} onChange={(e) => setDraft(d => ({ ...d, miscText: { ...d.miscText, heroStarLine: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Mobile CTA Button Text</label>
                            <Input value={draft.miscText.ctaButtonText} onChange={(e) => setDraft(d => ({ ...d, miscText: { ...d.miscText, ctaButtonText: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Hero CTA Button Text</label>
                            <Input value={draft.miscText.heroCtaButtonText} onChange={(e) => setDraft(d => ({ ...d, miscText: { ...d.miscText, heroCtaButtonText: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Hero Chips Headline</label>
                            <Input value={draft.miscText.heroChipsHeadline} onChange={(e) => setDraft(d => ({ ...d, miscText: { ...d.miscText, heroChipsHeadline: e.target.value } }))} />
                            <p className="text-[10px] text-muted-foreground">Headline above relationship chips. e.g. "Lagu ini untuk siapa?"</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Mobile CTA Quota Badge</label>
                            <Input value={draft.miscText.mobileCtaQuotaBadge} onChange={(e) => setDraft(d => ({ ...d, miscText: { ...d.miscText, mobileCtaQuotaBadge: e.target.value } }))} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'price-visibility' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Price Visibility</h3>
                        <p className="text-xs text-muted-foreground">Control where prices are shown across the landing page and config funnel.</p>
                    </div>

                    <div className="space-y-1 pb-2 border-b">
                        <h4 className="text-sm font-medium">Landing Page</h4>
                    </div>
                    <div className="space-y-3">
                        {([
                            { key: 'promoBanner' as const, label: 'Promo Banner', desc: 'Price shown in the top countdown banner' },
                            { key: 'header' as const, label: 'Header Bar', desc: 'Strikethrough + current price in the sticky header' },
                            { key: 'heroCtaButton' as const, label: 'Hero CTA Button', desc: 'Price in the main hero call-to-action button' },
                            { key: 'audioSamplesButton' as const, label: 'Audio Samples Button', desc: 'Price in the audio samples section CTA' },
                            { key: 'comparisonSection' as const, label: 'Comparison Section', desc: 'Price shown in the comparison table' },
                            { key: 'howItWorksButton' as const, label: 'How It Works Button', desc: 'Price in the how-it-works section CTA' },
                            { key: 'footerCtaButton' as const, label: 'Footer CTA Button', desc: 'Price in the bottom call-to-action section' },
                            { key: 'mobileStickyButton' as const, label: 'Mobile Sticky Button', desc: 'Price in the mobile bottom sticky bar' },
                        ]).map(({ key, label, desc }) => (
                            <label key={key} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={draft.priceVisibility[key]}
                                    onChange={(e) => setDraft(d => ({ ...d, priceVisibility: { ...d.priceVisibility, [key]: e.target.checked } }))}
                                    className="mt-0.5 accent-[var(--theme-accent,#E11D48)]"
                                />
                                <div>
                                    <span className="text-sm font-medium">{label}</span>
                                    <p className="text-xs text-muted-foreground">{desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="space-y-1 pb-2 border-b pt-4">
                        <h4 className="text-sm font-medium">Config Funnel</h4>
                    </div>
                    <div className="space-y-3">
                        {([
                            { key: 'funnelHeader' as const, label: 'Funnel Header', desc: 'Price shown in the config flow top bar' },
                            { key: 'orderSummary' as const, label: 'Order Summary', desc: 'Price in the Step 4 order summary' },
                            { key: 'checkoutButton' as const, label: 'Checkout Button', desc: 'Price appended to the checkout button text' },
                        ]).map(({ key, label, desc }) => (
                            <label key={key} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={draft.priceVisibility[key]}
                                    onChange={(e) => setDraft(d => ({ ...d, priceVisibility: { ...d.priceVisibility, [key]: e.target.checked } }))}
                                    className="mt-0.5 accent-[var(--theme-accent,#E11D48)]"
                                />
                                <div>
                                    <span className="text-sm font-medium">{label}</span>
                                    <p className="text-xs text-muted-foreground">{desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'upsell' && (
                <div className="space-y-4 w-full animate-in fade-in duration-300">
                    <div className="pb-2 border-b flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Upsell</h3>
                            <p className="text-xs text-muted-foreground">Post-checkout upsell offers shown before payment.</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs border rounded px-2 py-1 bg-muted/20 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={draft.upsell.enabled}
                                onChange={(e) => setDraft(d => ({ ...d, upsell: { ...d.upsell, enabled: e.target.checked } }))}
                            />
                            Enabled
                        </label>
                    </div>

                    <div className={cn("space-y-4 transition-opacity", !draft.upsell.enabled && "opacity-50 pointer-events-none")}>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Headline</label>
                            <Input
                                value={draft.upsell.headline}
                                onChange={(e) => setDraft(d => ({ ...d, upsell: { ...d.upsell, headline: e.target.value } }))}
                                placeholder="e.g. Tunggu, ada penawaran spesial untukmu!"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Footer Note</label>
                            <Input
                                value={draft.upsell.footerNote}
                                onChange={(e) => setDraft(d => ({ ...d, upsell: { ...d.upsell, footerNote: e.target.value } }))}
                                placeholder="e.g. support@laguin.id"
                            />
                        </div>

                        <div className="space-y-3 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">Upsell Items ({draft.upsell.items.length}/3)</h4>
                                {draft.upsell.items.length < 3 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1"
                                        onClick={() => setDraft(d => ({
                                            ...d,
                                            upsell: {
                                                ...d.upsell,
                                                items: [...d.upsell.items, {
                                                    id: `upsell_${Date.now()}`,
                                                    icon: '',
                                                    title: '',
                                                    headline: 'Tunggu, ada penawaran spesial untukmu!',
                                                    description: '',
                                                    price: 0,
                                                    priceLabel: 'One-time upgrade',
                                                    ctaText: 'Yes, Add This',
                                                    declineText: 'No Thanks, Continue',
                                                }],
                                            },
                                        }))}
                                    >
                                        <Plus className="h-3 w-3" /> Add Item
                                    </Button>
                                )}
                            </div>

                            {draft.upsell.items.map((item, idx) => (
                                <div key={item.id} className="rounded-lg border p-4 space-y-3 bg-muted/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item {idx + 1}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                                            onClick={() => setDraft(d => ({
                                                ...d,
                                                upsell: {
                                                    ...d.upsell,
                                                    items: d.upsell.items.filter((_, i) => i !== idx),
                                                },
                                            }))}
                                        >
                                            <Trash2 className="h-3 w-3" /> Remove
                                        </Button>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Headline (shown above card)</label>
                                        <Input
                                            value={item.headline ?? ''}
                                            onChange={(e) => setDraft(d => ({
                                                ...d,
                                                upsell: {
                                                    ...d.upsell,
                                                    items: d.upsell.items.map((it, i) => i === idx ? { ...it, headline: e.target.value } : it),
                                                },
                                            }))}
                                            placeholder="e.g. Tunggu, ada penawaran spesial untukmu!"
                                        />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Icon (emoji)</label>
                                            <Input
                                                value={item.icon}
                                                onChange={(e) => setDraft(d => ({
                                                    ...d,
                                                    upsell: { ...d.upsell, items: d.upsell.items.map((it, i) => i === idx ? { ...it, icon: e.target.value } : it) },
                                                }))}
                                                placeholder="e.g. 🎵"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Title</label>
                                            <Input
                                                value={item.title}
                                                onChange={(e) => setDraft(d => ({
                                                    ...d,
                                                    upsell: { ...d.upsell, items: d.upsell.items.map((it, i) => i === idx ? { ...it, title: e.target.value } : it) },
                                                }))}
                                                placeholder="e.g. Unlimited Edits"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Description</label>
                                        <Textarea
                                            value={item.description}
                                            onChange={(e) => setDraft(d => ({
                                                ...d,
                                                upsell: { ...d.upsell, items: d.upsell.items.map((it, i) => i === idx ? { ...it, description: e.target.value } : it) },
                                            }))}
                                            placeholder="Describe the offer..."
                                            className="h-16"
                                        />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Price (IDR)</label>
                                            <Input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => setDraft(d => ({
                                                    ...d,
                                                    upsell: { ...d.upsell, items: d.upsell.items.map((it, i) => i === idx ? { ...it, price: parseInt(e.target.value) || 0 } : it) },
                                                }))}
                                                min={0}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Price Label</label>
                                            <Input
                                                value={item.priceLabel}
                                                onChange={(e) => setDraft(d => ({
                                                    ...d,
                                                    upsell: { ...d.upsell, items: d.upsell.items.map((it, i) => i === idx ? { ...it, priceLabel: e.target.value } : it) },
                                                }))}
                                                placeholder="e.g. One-time upgrade"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">CTA Button Text</label>
                                            <Input
                                                value={item.ctaText}
                                                onChange={(e) => setDraft(d => ({
                                                    ...d,
                                                    upsell: { ...d.upsell, items: d.upsell.items.map((it, i) => i === idx ? { ...it, ctaText: e.target.value } : it) },
                                                }))}
                                                placeholder="e.g. Yes, Add Unlimited Edits"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Decline Button Text</label>
                                            <Input
                                                value={item.declineText}
                                                onChange={(e) => setDraft(d => ({
                                                    ...d,
                                                    upsell: { ...d.upsell, items: d.upsell.items.map((it, i) => i === idx ? { ...it, declineText: e.target.value } : it) },
                                                }))}
                                                placeholder="e.g. No Thanks, Continue"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-2 border-t">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Action (optional)</label>
                                            <select
                                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                                value={item.action ?? 'none'}
                                                onChange={(e) => {
                                                    const action = e.target.value as 'none' | 'express_delivery' | 'third_verse'
                                                    setDraft(d => ({
                                                        ...d,
                                                        upsell: {
                                                            ...d.upsell,
                                                            items: d.upsell.items.map((it, i) => i === idx ? {
                                                                ...it,
                                                                action,
                                                                actionConfig: action === 'express_delivery' ? (it.actionConfig ?? { deliveryTimeMinutes: 0 }) : undefined,
                                                            } : it),
                                                        },
                                                    }))
                                                }}
                                            >
                                                <option value="none">No action</option>
                                                <option value="express_delivery">Express Delivery</option>
                                                <option value="third_verse">Third Verse</option>
                                            </select>
                                        </div>
                                        {item.action === 'express_delivery' && (
                                            <div className="space-y-1 pl-2 border-l-2 border-primary/20">
                                                <label className="text-xs font-medium">Delivery Time</label>
                                                <p className="text-[10px] text-muted-foreground">Set to 0 minutes for instant delivery.</p>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={(() => {
                                                            const cfg = item.actionConfig ?? {}
                                                            const raw = cfg.deliveryTimeMinutes ?? 0
                                                            return raw >= 60 ? 168 : 59
                                                        })()}
                                                        className="flex-1"
                                                        value={(() => {
                                                            const mins = item.actionConfig?.deliveryTimeMinutes ?? 0
                                                            return mins >= 60 ? mins / 60 : mins
                                                        })()}
                                                        onChange={(e) => {
                                                            const val = Math.max(0, Number(e.target.value) || 0)
                                                            const currentMins = item.actionConfig?.deliveryTimeMinutes ?? 0
                                                            const isHours = currentMins >= 60
                                                            const newMinutes = isHours ? val * 60 : val
                                                            setDraft(d => ({
                                                                ...d,
                                                                upsell: {
                                                                    ...d.upsell,
                                                                    items: d.upsell.items.map((it, i) => i === idx ? {
                                                                        ...it,
                                                                        actionConfig: { ...it.actionConfig, deliveryTimeMinutes: newMinutes },
                                                                    } : it),
                                                                },
                                                            }))
                                                        }}
                                                    />
                                                    <select
                                                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                                                        value={(item.actionConfig?.deliveryTimeMinutes ?? 0) >= 60 ? 'hours' : 'minutes'}
                                                        onChange={(e) => {
                                                            const currentMins = item.actionConfig?.deliveryTimeMinutes ?? 0
                                                            const isCurrentlyHours = currentMins >= 60
                                                            const switchToHours = e.target.value === 'hours'
                                                            let newMinutes = currentMins
                                                            if (!isCurrentlyHours && switchToHours) {
                                                                newMinutes = Math.max(60, currentMins * 60)
                                                            } else if (isCurrentlyHours && !switchToHours) {
                                                                newMinutes = Math.round(currentMins / 60)
                                                            }
                                                            setDraft(d => ({
                                                                ...d,
                                                                upsell: {
                                                                    ...d.upsell,
                                                                    items: d.upsell.items.map((it, i) => i === idx ? {
                                                                        ...it,
                                                                        actionConfig: { ...it.actionConfig, deliveryTimeMinutes: newMinutes },
                                                                    } : it),
                                                                },
                                                            }))
                                                        }}
                                                    >
                                                        <option value="minutes">Minutes</option>
                                                        <option value="hours">Hours</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                        {item.action === 'third_verse' && (
                                            <p className="text-[10px] text-muted-foreground pl-2 border-l-2 border-primary/20">
                                                When purchased, the lyrics prompt will request 3 verses instead of 2.
                                            </p>
                                        )}
                                    </div>
                                    <label className="flex items-center gap-2 text-xs pt-2 border-t cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!item.orderProcessingOnly}
                                            onChange={(e) => setDraft(d => ({
                                                ...d,
                                                upsell: {
                                                    ...d.upsell,
                                                    items: d.upsell.items.map((it, i) => i === idx ? { ...it, orderProcessingOnly: e.target.checked } : it),
                                                },
                                            }))}
                                        />
                                        <span>Order processing only</span>
                                        <span className="text-[10px] text-muted-foreground ml-auto">Skip checkout, show only on processing page</span>
                                    </label>
                                </div>
                            ))}

                            {draft.upsell.items.length === 0 && (
                                <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                                    No upsell items configured. Add up to 3 items.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'order-processing' && (
                <div className="space-y-4 w-full animate-in fade-in duration-300">
                    <div className="pb-2 border-b">
                        <h3 className="text-base font-semibold">Order Processing Page</h3>
                        <p className="text-xs text-muted-foreground">Content shown while the order is being processed.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium">Header Image</label>
                        <p className="text-[10px] text-muted-foreground">Replaces the clock icon. Recommended: square or landscape, transparent background.</p>
                        {draft.orderProcessingPage.imageUrl && (
                            <div className="relative inline-block">
                                <img src={draft.orderProcessingPage.imageUrl} alt="Processing header" className="max-h-24 object-contain" />
                                <button
                                    type="button"
                                    className="absolute -top-1 -right-1 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center text-xs"
                                    onClick={() => setDraft(d => ({ ...d, orderProcessingPage: { ...d.orderProcessingPage, imageUrl: '' } }))}
                                >×</button>
                            </div>
                        )}
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUpload(e, 'image', (path) => setDraft(d => ({ ...d, orderProcessingPage: { ...d.orderProcessingPage, imageUrl: path } })))}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium">Headline</label>
                        <Input
                            value={draft.orderProcessingPage.headline}
                            onChange={(e) => setDraft(d => ({ ...d, orderProcessingPage: { ...d.orderProcessingPage, headline: e.target.value } }))}
                            placeholder="e.g. Lagu Anda Sedang Dibuat!"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Subtitle</label>
                        <Input
                            value={draft.orderProcessingPage.subtitle}
                            onChange={(e) => setDraft(d => ({ ...d, orderProcessingPage: { ...d.orderProcessingPage, subtitle: e.target.value } }))}
                            placeholder="e.g. Tim kami sedang membuat lagu spesial untuk Anda"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Countdown Label</label>
                        <Input
                            value={draft.orderProcessingPage.countdownLabel}
                            onChange={(e) => setDraft(d => ({ ...d, orderProcessingPage: { ...d.orderProcessingPage, countdownLabel: e.target.value } }))}
                            placeholder="e.g. Estimasi selesai dalam"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Bottom Text</label>
                        <Textarea
                            value={draft.orderProcessingPage.bottomText}
                            onChange={(e) => setDraft(d => ({ ...d, orderProcessingPage: { ...d.orderProcessingPage, bottomText: e.target.value } }))}
                            placeholder="e.g. Kami akan mengirimkan notifikasi via WhatsApp..."
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                        <label className="text-xs font-medium">Upsell Items (shown on processing page)</label>
                        <p className="text-[10px] text-muted-foreground">Select which upsell items to display on the order processing page.</p>
                        {draft.upsell.items.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No upsell items configured. Add items in the Upsell tab first.</p>
                        ) : (
                            <div className="space-y-1">
                                {draft.upsell.items.map((item) => (
                                    <label key={item.id} className="flex items-center gap-2 text-sm rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/30">
                                        <input
                                            type="checkbox"
                                            checked={draft.orderProcessingPage.upsellItemIds.includes(item.id)}
                                            onChange={(e) => setDraft(d => ({
                                                ...d,
                                                orderProcessingPage: {
                                                    ...d.orderProcessingPage,
                                                    upsellItemIds: e.target.checked
                                                        ? [...d.orderProcessingPage.upsellItemIds, item.id]
                                                        : d.orderProcessingPage.upsellItemIds.filter(id => id !== item.id),
                                                },
                                            }))}
                                        />
                                        <span>{item.icon} {item.title} — Rp {item.price.toLocaleString()}</span>
                                        {item.orderProcessingOnly && <span className="text-[10px] text-muted-foreground ml-auto">(processing only)</span>}
                                    </label>
                                ))}
                            </div>
                        )}
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
