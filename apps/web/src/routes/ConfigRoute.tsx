import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { OrderInputSchema, type OrderInput } from 'shared'
import { apiPost } from '@/lib/http'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { SelectionChip } from '@/components/ui/selection-chip' // Adjust import path if needed
import { VibeCard } from '@/components/ui/vibe-card' // Adjust import path
import { PromptChip } from '@/components/ui/prompt-chip' // Adjust import path
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import {
  Heart,
  Music,
  PenLine,
  ShieldCheck,
  Clock,
  ChevronLeft,
  Timer,
  Sparkles,
  Zap,
  PartyPopper,
  Mail,
  Loader2,
  Check
} from 'lucide-react'

export function ConfigRoute() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [relationship, setRelationship] = useState('Pasangan')

  // Countdown timer logic (mocked for now to match screenshot "6 days until Valentine's")
  const timeLeft = { days: 6, hours: 14, mins: 32 }

  // Email verification (OTP) state for checkout step
  const [emailVerificationId, setEmailVerificationId] = useState<string | null>(null)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', ''])
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [resendCooldownSec, setResendCooldownSec] = useState(0)

  const getErrorMessage = (e: unknown, fallback: string) => {
    if (e instanceof Error && e.message) return e.message
    return fallback
  }

  const form = useForm<OrderInput>({
    resolver: zodResolver(OrderInputSchema),
    mode: 'onTouched',
    defaultValues: {
      recipientName: '',
      occasion: 'Valentine',
      story: '',
      musicPreferences: { genre: 'Pop Ballad', mood: '', vibe: '', tempo: '', voiceStyle: '', language: 'Indonesian' },
      whatsappNumber: '', // Main contact method
      email: '',
      emailVerificationId: '',
      extraNotes: '',
    },
  })

  const { watch, setValue, register, formState: { errors } } = form
  const recipientName = watch('recipientName')
  const genre = watch('musicPreferences.genre')
  const language = watch('musicPreferences.language')
  const storyText = watch('story') ?? ''
  const email = (watch('email') ?? '').trim()

  // Derived state for dynamic titles
  const currentRecipient = recipientName || 'the lucky person'

  // Map "yourName" to the name typed in recipientName (per request)
  useEffect(() => {
    const trimmed = (recipientName ?? '').trim()
    // RHF type for setValue expects string here; we intentionally clear to `undefined` when empty
    setValue('yourName', trimmed || undefined)
  }, [recipientName, setValue])

  const storyLen = storyText.trim().length
  const storyQuality =
    storyLen === 0
      ? { label: 'Teruslah mengetik...', pct: 10, color: 'bg-gray-300', text: 'text-gray-500' }
      : storyLen < 80
        ? { label: 'Dikit lagi...', pct: 40, color: 'bg-amber-400', text: 'text-amber-700' }
        : storyLen < 160
          ? { label: 'Mantap!', pct: 75, color: 'bg-green-500', text: 'text-green-600' }
          : { label: 'Sempurna!', pct: 100, color: 'bg-green-600', text: 'text-green-700' }

  const handleNext = async () => {
    let fieldsToValidate: string[] = []
    if (step === 0) fieldsToValidate = ['recipientName']
    if (step === 1) fieldsToValidate = ['musicPreferences.genre', 'musicPreferences.voiceStyle']
    if (step === 2) fieldsToValidate = ['story']

    const isStepValid = await form.trigger(fieldsToValidate)
    if (isStepValid) {
      setStep((prev) => Math.min(prev + 1, 3))
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0))
    window.scrollTo(0, 0)
  }

  // Reset OTP state if email changes
  useEffect(() => {
    setEmailVerified(false)
    setOtpDigits(['', '', '', ''])
    setEmailVerificationId(null)
    setValue('emailVerificationId', '')
    setOtpError(null)
    setResendCooldownSec(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  useEffect(() => {
    if (resendCooldownSec <= 0) return
    const t = window.setInterval(() => {
      setResendCooldownSec((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [resendCooldownSec])

  async function sendEmailOtp() {
    setOtpError(null)
    if (!email) {
      setOtpError('Email wajib diisi.')
      return
    }
    if (errors.email) {
      setOtpError('Format email tidak valid.')
      return
    }
    if (resendCooldownSec > 0) return

    setOtpSending(true)
    try {
      const res = await apiPost<{ verificationId: string; expiresAt: string }>('/api/email-verification/start', { email })
      setEmailVerificationId(res.verificationId)
      setOtpDigits(['', '', '', ''])
      setEmailVerified(false)
      setValue('emailVerificationId', '')
      setResendCooldownSec(60)
      window.setTimeout(() => otpRefs.current?.[0]?.focus?.(), 50)
    } catch (e: unknown) {
      setOtpError(getErrorMessage(e, 'Gagal mengirim OTP. Coba lagi.'))
    } finally {
      setOtpSending(false)
    }
  }

  async function verifyEmailOtp() {
    setOtpError(null)
    if (!emailVerificationId) {
      setOtpError('Klik "Kirim kode verifikasi" terlebih dulu.')
      return
    }
    const code = otpDigits.join('')
    if (code.length !== 4 || otpDigits.some((d) => !d)) {
      setOtpError('Masukkan 4 digit kode OTP.')
      return
    }
    setOtpVerifying(true)
    try {
      await apiPost<{ ok: true }>('/api/email-verification/verify', { verificationId: emailVerificationId, code })
      setEmailVerified(true)
      setValue('emailVerificationId', emailVerificationId)
    } catch (e: unknown) {
      setEmailVerified(false)
      setValue('emailVerificationId', '')
      setOtpError(getErrorMessage(e, 'Kode OTP salah / kadaluarsa.'))
    } finally {
      setOtpVerifying(false)
    }
  }

  function handleOtpChange(idx: number, nextRaw: string) {
    const next = (nextRaw ?? '').replace(/\D/g, '').slice(-1)
    setOtpDigits((prev) => {
      const copy = [...prev]
      copy[idx] = next
      return copy
    })
    if (next && idx < 3) {
      window.setTimeout(() => otpRefs.current?.[idx + 1]?.focus?.(), 0)
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (otpDigits[idx]) {
        // clear current digit
        e.preventDefault()
        setOtpDigits((prev) => {
          const copy = [...prev]
          copy[idx] = ''
          return copy
        })
        return
      }
      if (idx > 0) {
        e.preventDefault()
        otpRefs.current?.[idx - 1]?.focus?.()
      }
    }
    if (e.key === 'ArrowLeft' && idx > 0) otpRefs.current?.[idx - 1]?.focus?.()
    if (e.key === 'ArrowRight' && idx < 3) otpRefs.current?.[idx + 1]?.focus?.()
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text') ?? ''
    const digits = text.replace(/\D/g, '').slice(0, 4).split('')
    if (digits.length === 0) return
    e.preventDefault()
    setOtpDigits([digits[0] ?? '', digits[1] ?? '', digits[2] ?? '', digits[3] ?? ''])
    const nextFocus = Math.min(digits.length, 4) - 1
    window.setTimeout(() => otpRefs.current?.[Math.max(0, nextFocus)]?.focus?.(), 0)
  }

  const onSubmit = async (data: OrderInput) => {
    // Email must be verified before we create draft order (per flow)
    if (!emailVerified || !data.emailVerificationId) {
      setError('Verifikasi email dulu sebelum lanjut ke checkout.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // API call to create draft order
      const res = await apiPost<{ orderId: string }>('/api/orders/draft', {
        ...data,
        whatsappNumber: data.whatsappNumber,
      })
      navigate(`/checkout?orderId=${encodeURIComponent(res.orderId)}`)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF5F7] font-sans text-gray-900 pb-32">
      {/* Top Banner */}
      <div className="bg-[#E11D48] px-4 py-2 text-center text-xs font-bold text-white uppercase tracking-wide">
        🎁 {timeLeft.days} hari menuju Valentine • Dikirim dalam 24 jam
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-rose-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-serif text-xl font-bold text-[#E11D48]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E11D48] text-white">L</div>
            Laguin.id
          </div>
          <div className="text-right">
             <span className="text-xs text-gray-400 line-through">Rp 200.000</span>{' '}
             <span className="text-lg font-bold text-[#E11D48]">GRATIS</span>{' '}
             <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0 h-5">11 sisa</Badge>
          </div>
        </div>
        {/* Progress Bar inside Header */}
        <div className="px-4 pb-2">
           <div className="flex gap-1 h-1">
             {[0, 1, 2, 3].map((i) => (
               <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i < step ? 'bg-green-500' : i === step ? 'bg-[#E11D48]' : 'bg-gray-200'}`} />
             ))}
           </div>
           {step > 0 && <div className="mt-1 text-center text-[10px] font-medium text-gray-400">Lagu untuk {currentRecipient}</div>}
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          
          {/* STEP 0: WHO IS IT FOR? */}
          {step === 0 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <Heart className="mx-auto h-8 w-8 text-rose-400 fill-rose-100" />
                <h1 className="text-3xl font-serif font-bold text-gray-900">Siapa orang beruntung itu?</h1>
                <p className="text-gray-500">Kami akan memasukkan <strong className="text-gray-900">namanya</strong> ke dalam lirik lagu</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {['Pasangan', 'Suami', 'Pacar', 'Tunangan', 'Istri', 'Lainnya'].map((rel) => (
                  <SelectionChip
                    key={rel}
                    label={rel}
                    icon={rel === 'Pasangan' ? '💕' : rel === 'Suami' ? '💍' : rel === 'Pacar' ? '❤️' : rel === 'Tunangan' ? '💎' : rel === 'Istri' ? '👰' : '✨'}
                    selected={relationship === rel}
                    onClick={() => {
                      setRelationship(rel)
                      setValue('extraNotes', `Relasi dengan penerima: ${rel}`)
                    }}
                    className={relationship === rel ? "bg-[#E11D48] border-[#E11D48] text-white" : ""}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nama Panggilannya</label>
                <Input 
                  {...register('recipientName')} 
                  placeholder="cth. Salsa" 
                  className="h-14 rounded-xl border-gray-300 text-lg shadow-sm focus-visible:ring-[#E11D48]"
                />
                {errors.recipientName && <p className="text-xs text-[#E11D48]">{errors.recipientName.message}</p>}
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                  <Sparkles className="h-3 w-3" />
                  Nama ini akan dinyanyikan dalam lirik!
                </div>
              </div>

              <div className="text-center text-xs text-gray-400">
                Bergabung dengan 2,847 wanita yang membuat pasangannya menangis bahagia
              </div>
            </div>
          )}

          {/* STEP 1: VIBE */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <Music className="mx-auto h-8 w-8 text-rose-400" />
                <h1 className="text-3xl font-serif font-bold text-gray-900">Pilih vibe untuk {currentRecipient}</h1>
                <p className="text-gray-500">Gaya musik apa yang dia suka?</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'Country', label: 'Country', desc: 'Bercerita & tulus', icon: '🤠' },
                  { id: 'Acoustic', label: 'Acoustic', desc: 'Hangat & intim', icon: '🎸' },
                  { id: 'Pop Ballad', label: 'Pop Ballad', desc: 'Modern & emosional', icon: '🎹', badge: 'Pilihan terbaik' },
                  { id: 'R&B Soul', label: 'R&B Soul', desc: 'Halus & romantis', icon: '🌙' },
                  { id: 'Rock', label: 'Rock', desc: 'Kuat & penuh gairah', icon: '⚡' },
                  { id: 'Piano Ballad', label: 'Piano Ballad', desc: 'Elegan & abadi', icon: '🎻' },
                ].map((g) => (
                  <VibeCard
                    key={g.id}
                    label={g.label}
                    description={g.desc}
                    icon={<span className="text-2xl">{g.icon}</span>}
                    badge={g.badge}
                    selected={genre === g.id}
                    onClick={() => setValue('musicPreferences.genre', g.id)}
                    className={genre === g.id ? "bg-[#E11D48] border-[#E11D48] text-white ring-2 ring-rose-200" : ""}
                  />
                ))}
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Suara Penyanyi</label>
                <div className="flex justify-center gap-6">
                  {['Female', 'Male', 'Surprise me'].map((v) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        value={v} 
                        {...register('musicPreferences.voiceStyle')}
                        className="text-[#E11D48] focus:ring-[#E11D48]" 
                      />
                      <span className="text-sm font-medium">{v === 'Female' ? 'Wanita' : v === 'Male' ? 'Pria' : 'Kejutkan saya'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Bahasa lirik</label>
                <select
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
                  value={language || 'Indonesian'}
                  onChange={(e) => setValue('musicPreferences.language', e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Indonesian">Bahasa Indonesia</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: STORY */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <PenLine className="mx-auto h-8 w-8 text-rose-400" />
                <h1 className="text-3xl font-serif font-bold text-gray-900">Ceritakan kisahmu</h1>
                <p className="text-gray-500">Ini akan menjadi lirik. <span className="text-[#E11D48] font-medium">Beberapa kalimat saja sudah cukup!</span></p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> Ketuk untuk menambah:
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Awal bertemu', 'Yang aku suka darinya', 'Jokes internal kami', 'Mimpi masa depan'].map((prompt) => (
                    <PromptChip 
                      key={prompt} 
                      label={prompt} 
                      icon={prompt.includes('bertemu') ? '💞' : prompt.includes('suka') ? '😍' : prompt.includes('Jokes') ? '😂' : '🔮'}
                      onClick={() => setValue('story', (watch('story') || '') + (watch('story') ? ' ' : '') + prompt + ': ')}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-rose-50 p-4 text-xs text-gray-600 italic border border-rose-100">
                <span className="font-bold not-italic text-rose-600">Contoh:</span> "Kami bertemu di pernikahan teman 3 tahun lalu. Dia selalu membuatku tertawa setiap hari. Aku suka bagaimana dia selalu membawakanku kopi di tempat tidur."
              </div>

              <div className="space-y-2">
                <Textarea 
                  {...register('story')} 
                  rows={6} 
                  placeholder="Mulai ketik ceritamu di sini..." 
                  className="rounded-xl border-gray-300 text-base shadow-sm focus-visible:ring-[#E11D48] resize-none p-4"
                />
                <div className="flex justify-between text-xs">
                  <div className={["flex items-center gap-2 font-medium", storyQuality.text].join(' ')}>
                    <div className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={["h-full transition-all duration-300", storyQuality.color].join(' ')}
                        style={{ width: `${storyQuality.pct}%` }}
                      />
                    </div>
                    {storyQuality.label}
                  </div>
                  <span className="text-gray-400">{storyText.length} chars</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW / CHECKOUT */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <PartyPopper className="mx-auto h-8 w-8 text-yellow-500" />
                <h1 className="text-3xl font-serif font-bold text-gray-900">Semua siap!</h1>
                <p className="text-gray-500">Kemana kami harus mengirim lagu {currentRecipient}?</p>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nomor WhatsApp</label>
                   <Controller
                     name="whatsappNumber"
                     control={form.control}
                     render={({ field }) => {
                       const digits = String(field.value ?? '').replace(/\D/g, '')
                       const local = digits.startsWith('62') ? digits.slice(2) : digits
                       return (
                         <div className="relative">
                           <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-gray-500">
                             +62
                           </div>
                           <Input
                             value={local}
                             onChange={(e) => {
                               const raw = e.target.value.replace(/\D/g, '')
                               const normalizedLocal = raw.replace(/^0+/, '')
                               field.onChange(`62${normalizedLocal}`)
                             }}
                             placeholder="8123456789"
                             inputMode="numeric"
                             pattern="[0-9]*"
                             type="tel"
                             className="h-12 rounded-xl border-gray-300 shadow-sm focus-visible:ring-[#E11D48] pl-12"
                           />
                         </div>
                       )
                     }}
                   />
                    {errors.whatsappNumber && <p className="text-xs text-[#E11D48]">{errors.whatsappNumber.message}</p>}
                 </div>

                 <div className="space-y-1">
                   <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Alamat Email</label>
                   <div className="relative">
                     <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                       <Mail className="h-5 w-5" />
                     </div>
                     <Input
                       {...register('email')}
                       placeholder="nama@email.com"
                       type="email"
                       className="h-12 rounded-xl border-gray-300 shadow-sm focus-visible:ring-[#E11D48] pl-10"
                     />
                   </div>
                    {errors.email && <p className="text-xs text-[#E11D48]">{errors.email.message}</p>}
                 </div>

                 <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                   <div className="flex items-center justify-between gap-3">
                     <div className="text-sm font-bold text-gray-900">Verifikasi Email</div>
                     {emailVerified ? (
                       <div className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-full">
                         <Check className="h-3.5 w-3.5" /> Terverifikasi
                       </div>
                     ) : null}
                   </div>

                   <div className="flex gap-3">
                     <Button
                       type="button"
                       variant="outline"
                       className="h-11 rounded-xl border-gray-200"
                       onClick={() => void sendEmailOtp()}
                       disabled={otpSending || otpVerifying || !email || Boolean(errors.email) || resendCooldownSec > 0}
                     >
                       {otpSending ? (
                         <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</span>
                       ) : resendCooldownSec > 0 ? (
                         `Kirim ulang (${resendCooldownSec}s)`
                       ) : (
                         'Kirim kode verifikasi'
                       )}
                     </Button>
                   </div>

                   {emailVerificationId && !emailVerified ? (
                     <div className="space-y-3">
                       <div className="text-xs text-gray-500">
                         Masukkan 4 digit kode OTP yang kami kirim ke <span className="font-semibold text-gray-800">{email}</span>
                       </div>
                       <div className="flex gap-2 justify-center">
                         {[0, 1, 2, 3].map((i) => (
                           <Input
                             key={i}
                             ref={(el) => { otpRefs.current[i] = el }}
                             value={otpDigits[i] ?? ''}
                             onChange={(e) => handleOtpChange(i, e.target.value)}
                             onKeyDown={(e) => handleOtpKeyDown(i, e)}
                             onPaste={i === 0 ? handleOtpPaste : undefined}
                             inputMode="numeric"
                             pattern="[0-9]*"
                             type="tel"
                             maxLength={1}
                             className="h-12 w-12 text-center text-lg font-bold rounded-xl border-gray-300 shadow-sm focus-visible:ring-[#E11D48]"
                           />
                         ))}
                       </div>
                       <Button
                         type="button"
                         className="h-11 w-full rounded-xl bg-gray-900 text-white hover:bg-gray-800"
                         onClick={() => void verifyEmailOtp()}
                         disabled={otpVerifying || otpDigits.some((d) => !d)}
                       >
                         {otpVerifying ? (
                           <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi...</span>
                         ) : (
                           'Verifikasi kode'
                         )}
                       </Button>
                     </div>
                   ) : null}

                   {otpError ? <p className="text-xs text-[#E11D48]">{otpError}</p> : null}
                 </div>

                 <Card className="overflow-hidden border-gray-200 shadow-sm">
                   <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                     <span className="text-lg">💝</span> <span className="text-sm font-bold text-gray-700">Pesanan Lagumu</span>
                   </div>
                   <CardContent className="p-4 text-sm space-y-3">
                     <div className="flex justify-between">
                       <span className="text-gray-500">Untuk</span>
                       <span className="font-bold text-gray-900">{recipientName}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-500">Gaya</span>
                       <span className="font-bold text-gray-900">{genre}</span>
                     </div>
                   <div className="flex justify-between">
                     <span className="text-gray-500">Bahasa</span>
                     <span className="font-bold text-gray-900">{language || 'Indonesian'}</span>
                   </div>
                     <div className="flex justify-between">
                       <span className="text-gray-500">Pengiriman</span>
                       <span className="font-bold text-green-600 flex items-center gap-1"><Zap className="h-3 w-3" /> Dalam 24 jam</span>
                     </div>
                     <Separator />
                     <div className="flex justify-between items-center pt-1">
                       <span className="text-gray-500">Total</span>
                       <div className="flex items-center gap-2">
                         <span className="text-gray-400 line-through text-xs">Rp 200.000</span>
                         <span className="font-bold text-[#E11D48] text-xl">GRATIS</span>
                       </div>
                     </div>
                   </CardContent>
                 </Card>

                 <div className="rounded-xl bg-green-50 p-4 border border-green-100 space-y-3">
                   <div className="text-xs font-bold text-green-800 uppercase tracking-wider">Apa selanjutnya?</div>
                   <div className="space-y-2 text-sm text-green-900">
                     <div className="flex gap-2">
                       <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-[10px] font-bold text-green-700">1</div>
                       <span>Kami membuat lagu personalmu</span>
                     </div>
                     <div className="flex gap-2">
                       <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-[10px] font-bold text-green-700">2</div>
                       <span>Kamu menerimanya via WhatsApp <span className="font-bold">dalam 24 jam</span></span>
                     </div>
                     <div className="flex gap-2">
                       <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-[10px] font-bold text-green-700">3</div>
                       <span>Putar untuknya dan lihat dia menangis 😭</span>
                     </div>
                   </div>
                 </div>

                 <div className="flex justify-center gap-4 text-[10px] text-gray-400">
                   <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Checkout aman</div>
                   <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pengiriman 24 jam</div>
                 </div>
              </div>
            </div>
          )}

          {/* BOTTOM NAV / CTA */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             <div className="mx-auto max-w-md flex flex-col gap-2">
               {step === 3 && (
                 <div className="text-center text-[10px] text-gray-500 flex justify-center items-center gap-1">
                   <Timer className="h-3 w-3" /> Cerita tersimpan selama 9:56 — selesaikan checkout untuk menyimpannya
                 </div>
               )}
               
               <div className="flex gap-3">
                 {step > 0 && (
                   <Button 
                     type="button" 
                     variant="outline" 
                     size="icon" 
                     className="shrink-0 h-12 w-12 rounded-xl border-gray-200"
                     onClick={handleBack}
                     disabled={loading}
                   >
                     <ChevronLeft className="h-5 w-5" />
                   </Button>
                 )}
                 
                 <Button 
                   type="submit" 
                   className="h-12 w-full rounded-xl bg-[#E11D48] text-base font-bold text-white shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all"
                   onClick={step < 3 ? (e) => { e.preventDefault(); handleNext(); } : undefined}
                  disabled={loading || (step === 3 && !emailVerified)}
                 >
                   {step === 0 ? 'Pilih vibenya ->' : 
                    step === 1 ? 'Tambahkan ceritamu ->' : 
                    step === 2 ? 'Hampir selesai! ->' : 
                    loading ? 'Memproses...' : emailVerified ? 'Ke checkout — GRATIS' : 'Verifikasi email dulu'}
                 </Button>
               </div>
             </div>
          </div>

          {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        </form>
      </main>
    </div>
  )
}
