import * as React from "react"
import { cn } from "@/lib/utils"

interface VibeCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  label: string
  description?: string
  icon?: React.ReactNode
  badge?: string
}

export function VibeCard({ selected, label, description, icon, badge, className, ...props }: VibeCardProps) {
  const hasIcon = icon && typeof icon === 'string' ? icon.trim().length > 0 : Boolean(icon)
  const hasDesc = description && typeof description === 'string' ? description.trim().length > 0 : Boolean(description)
  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-medium transition-all",
        selected
          ? "border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white shadow-md shadow-[var(--theme-accent-soft)] hover:opacity-90"
          : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300",
        className
      )}
      {...props}
    >
      {badge && (
        <span className="absolute -right-1 -top-2 rounded-full bg-yellow-400 px-1.5 py-0.5 text-[9px] font-bold text-black shadow-sm">
          {badge}
        </span>
      )}
      {hasIcon && <span className="text-base">{icon}</span>}
      <span>{label}</span>
      {hasDesc && <span className={cn("text-xs", selected ? "text-white/80" : "text-gray-400")}>· {description}</span>}
    </button>
  )
}
