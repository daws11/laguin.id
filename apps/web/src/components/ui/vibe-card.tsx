import * as React from "react"
import { cn } from "@/lib/utils"

interface VibeCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  label: string
  description: string
  icon: React.ReactNode
  badge?: string
}

export function VibeCard({ selected, label, description, icon, badge, className, ...props }: VibeCardProps) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all hover:shadow-sm",
        selected
          ? "border-rose-500 bg-rose-500 text-white shadow-md ring-2 ring-rose-200 ring-offset-2"
          : "bg-white text-gray-700 hover:border-gray-300",
        className
      )}
      {...props}
    >
      {badge && (
        <span className="absolute -right-2 -top-2 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-black shadow-sm">
          {badge}
        </span>
      )}
      <div className="mb-2 text-2xl">{icon}</div>
      <div className="font-bold">{label}</div>
      <div className={cn("text-xs", selected ? "text-rose-100" : "text-gray-500")}>{description}</div>
    </button>
  )
}
