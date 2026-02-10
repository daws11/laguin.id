import * as React from "react"
import { cn } from "@/lib/utils"

interface SelectionChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  label: string
  icon?: React.ReactNode
}

export function SelectionChip({ selected, label, icon, className, ...props }: SelectionChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all hover:bg-muted",
        selected
          ? "border-rose-500 bg-rose-500 text-white hover:bg-rose-600"
          : "bg-white text-gray-700 hover:border-gray-300",
        className
      )}
      {...props}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {label}
    </button>
  )
}
