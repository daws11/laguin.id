import * as React from "react"
import { cn } from "@/lib/utils"

interface SelectionChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  label: string
  icon?: React.ReactNode
}

export function SelectionChip({ selected, label, icon, className, ...props }: SelectionChipProps) {
  const hasIcon = icon && typeof icon === 'string' ? icon.trim().length > 0 : Boolean(icon)
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-medium transition-all",
        selected
          ? "border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white shadow-md shadow-[var(--theme-accent-soft)] hover:opacity-90"
          : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300",
        className
      )}
      {...props}
    >
      {hasIcon && <span className="text-base">{icon}</span>}
      {label}
    </button>
  )
}
