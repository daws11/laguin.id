import type { ComponentType, ReactNode } from 'react'
import { ChevronLeft, ChevronRight, LayoutDashboard, LogOut, Menu } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { AdminLang } from '@/features/admin/i18n'

type NavItem<T extends string> = {
  value: T
  label: string
  icon: ComponentType<{ className?: string }>
}

interface SidebarItemProps<T extends string> {
  item: NavItem<T>
  isActive: boolean
  isCollapsed: boolean
  onSelect: (v: T) => void
}

function SidebarItem<T extends string>({ item, isActive, isCollapsed, onSelect }: SidebarItemProps<T>) {
  const Icon = item.icon
  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className={cn(
        'group relative flex w-full items-center justify-start gap-3 overflow-hidden whitespace-nowrap px-3 py-2 transition-all duration-300',
        isCollapsed ? 'justify-center px-0 h-10 w-10 mx-auto' : 'h-10'
      )}
      onClick={() => onSelect(item.value)}
      title={isCollapsed ? item.label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span
        className={cn(
          'transition-all duration-300 ease-in-out',
          isCollapsed
            ? 'absolute left-full w-0 opacity-0'
            : 'static w-auto opacity-100'
        )}
      >
        {item.label}
      </span>
    </Button>
  )
}

export function AdminLayout<T extends string>({
  brandLabel,
  title,
  isLoading,
  loadingLabel,
  error,
  navItems,
  activeNav,
  onSelectNav,
  lang,
  setLang,
  logoutLabel,
  onLogout,
  isSidebarOpen,
  setIsSidebarOpen,
  isCollapsed,
  setIsCollapsed,
  children,
}: {
  brandLabel: string
  title: string
  isLoading: boolean
  loadingLabel: string
  error: string | null
  navItems: NavItem<T>[]
  activeNav: T
  onSelectNav: (v: T) => void
  lang: AdminLang
  setLang: (v: AdminLang) => void
  logoutLabel: string
  onLogout: () => void
  isSidebarOpen: boolean
  setIsSidebarOpen: (v: boolean) => void
  isCollapsed: boolean
  setIsCollapsed: (v: boolean) => void
  children: ReactNode
}) {
  return (
    <div className="flex h-screen w-full bg-background flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 md:hidden">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-4 font-semibold">{brandLabel}</span>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-background transition-all duration-300 ease-in-out md:static md:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-[70px]' : 'w-64',
          'py-4'
        )}
      >
        {/* Brand / Logo & Toggle */}
        <div className={cn(
          'flex items-center mb-6 transition-all duration-300',
          isCollapsed ? 'justify-center flex-col gap-4 px-0' : 'justify-between px-4'
        )}>
          <div className="flex items-center gap-2 font-bold tracking-tight text-lg overflow-hidden">
            <LayoutDashboard className="h-6 w-6 shrink-0 text-primary" />
            <span className={cn(
              "transition-all duration-300 whitespace-nowrap",
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 ml-1"
            )}>
              {brandLabel}
            </span>
          </div>

          {/* Collapse Toggle (Desktop Only) */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "hidden md:flex h-8 w-8 text-muted-foreground hover:text-foreground", 
              isCollapsed && "mt-2"
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-1 flex-col gap-1 w-full px-3 overflow-y-auto overflow-x-hidden scrollbar-none">
          {navItems.map((item) => (
            <SidebarItem
              key={item.value}
              item={item}
              isActive={activeNav === item.value}
              isCollapsed={isCollapsed}
              onSelect={onSelectNav}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="mt-auto flex flex-col gap-2 w-full px-3 pt-4 border-t">
           {/* Language Switcher */}
          <div className="flex flex-col gap-2">
            {!isCollapsed ? (
              <div className="flex items-center justify-between rounded-md border p-1 bg-muted/30">
                <Button
                  variant={lang === 'id' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 h-7 text-xs shadow-none"
                  onClick={() => setLang('id')}
                >
                  ID
                </Button>
                <Button
                  variant={lang === 'en' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 h-7 text-xs shadow-none"
                  onClick={() => setLang('en')}
                >
                  EN
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 mx-auto rounded-full"
                onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
                title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
              >
                <span className="text-[10px] font-bold">{lang.toUpperCase()}</span>
              </Button>
            )}
          </div>

          {/* Logout */}
          <Button
            variant="ghost"
            className={cn(
              'justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors',
              isCollapsed ? 'justify-center px-0 h-10 w-10 mx-auto' : 'h-10 px-3'
            )}
            onClick={onLogout}
            title={isCollapsed ? logoutLabel : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={cn(
              "transition-all duration-300 whitespace-nowrap",
              isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
            )}>
              {logoutLabel}
            </span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden flex flex-col bg-muted/10 relative">
        {/* Top Bar / Header inside Main Content */}
        <div className="w-full flex-none px-4 md:px-8 py-4 bg-background/50 backdrop-blur border-b flex items-center justify-between z-10 sticky top-0">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight capitalize text-foreground">{title}</h2>
            <div className="flex items-center gap-2">
                {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-full border">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        {loadingLabel}
                    </div>
                )}
            </div>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="mx-auto w-full max-w-7xl space-y-6 pb-20">
                {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                        <span className="font-semibold">Error:</span> {error}
                    </div>
                )}
                {children}
            </div>
        </div>
      </main>
    </div>
  )
}


