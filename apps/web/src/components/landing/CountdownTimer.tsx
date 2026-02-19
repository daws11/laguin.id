import { useEffect, useState } from 'react'

function fmtCurrencyGlobal(amt: number | null | undefined) {
  if (amt === 0) return 'GRATIS'
  if (amt === null || amt === undefined) return 'Rp 497rb'
  if (amt >= 100000 && amt < 1000000) {
    return `Rp ${Math.floor(amt / 1000)}rb`
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amt)
}

function getEvergreenTarget(cycleHours: number): Date {
  const SGT_OFFSET = 8 * 60
  const now = new Date()
  const utcMs = now.getTime()
  const sgtMs = utcMs + SGT_OFFSET * 60 * 1000
  const sgtDate = new Date(sgtMs)

  const cycleMs = cycleHours * 60 * 60 * 1000
  const sgtMidnight = new Date(Date.UTC(sgtDate.getUTCFullYear(), sgtDate.getUTCMonth(), sgtDate.getUTCDate()))
  const msSinceMidnight = sgtMs - sgtMidnight.getTime()
  const currentCycleStart = Math.floor(msSinceMidnight / cycleMs) * cycleMs
  const nextCycleEndSgt = sgtMidnight.getTime() + currentCycleStart + cycleMs

  return new Date(nextCycleEndSgt - SGT_OFFSET * 60 * 1000)
}

type Props = {
  paymentAmount: number | null
  originalAmount: number | null
  countdownLabel: string
  countdownTargetDate: string
  evergreenEnabled?: boolean
  evergreenCycleHours?: number
}

export function CountdownTimer({ paymentAmount, originalAmount, countdownLabel, countdownTargetDate, evergreenEnabled, evergreenCycleHours }: Props) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    const getTarget = (): Date => {
      if (evergreenEnabled && evergreenCycleHours && evergreenCycleHours > 0) {
        return getEvergreenTarget(evergreenCycleHours)
      }

      if (countdownTargetDate && /^\d{4}-\d{2}-\d{2}/.test(countdownTargetDate)) {
        return new Date(`${countdownTargetDate}T00:00:00`)
      }

      const now = new Date()
      let targetYear = now.getFullYear()
      if (now.getMonth() > 1 || (now.getMonth() === 1 && now.getDate() > 14)) {
        targetYear++
      }
      return new Date(`${targetYear}-02-14T00:00:00`)
    }

    const updateTimer = () => {
      const targetDate = getTarget()
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()

      if (diff <= 0) {
        if (evergreenEnabled && evergreenCycleHours && evergreenCycleHours > 0) {
          const nextTarget = getEvergreenTarget(evergreenCycleHours)
          const nextDiff = nextTarget.getTime() - now.getTime()
          if (nextDiff > 0) {
            const h = Math.floor(nextDiff / (1000 * 60 * 60))
            const m = Math.floor((nextDiff % (1000 * 60 * 60)) / (1000 * 60))
            const s = Math.floor((nextDiff % (1000 * 60)) / 1000)
            setTime({ d: 0, h, m, s })
            return
          }
        }
        setTime({ d: 0, h: 0, m: 0, s: 0 })
        return
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24))
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)

      setTime({ d, h, m, s })
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [countdownTargetDate, evergreenEnabled, evergreenCycleHours])

  const showDays = !evergreenEnabled || (time.d > 0)

  return (
    <div className="bg-[var(--theme-accent)] px-3 py-1.5 text-center text-[9px] sm:text-xs font-bold text-white uppercase tracking-tight leading-none">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span>{countdownLabel} {showDays ? `${time.d}h ` : ''}{time.h}j {time.m}m {time.s}d lagi</span>
        <span className="opacity-50 text-[8px]">•</span>
        <span className="flex items-center gap-1">
          <span className="line-through opacity-70">{fmtCurrencyGlobal(originalAmount)}</span>
          <span>{fmtCurrencyGlobal(paymentAmount)} {paymentAmount === 0 ? '(100 pertama)' : ''}</span>
        </span>
      </div>
    </div>
  )
}
