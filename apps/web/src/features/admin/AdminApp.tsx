import type { ReactNode } from 'react'

// NOTE: Phase 1 refactor scaffold.
// `routes/AdminRoute.tsx` wraps its legacy implementation with this component,
// so we can progressively extract logic into `features/admin/` without changing
// the router path or external behavior.
export function AdminApp({ children }: { children: ReactNode }) {
  return children
}

