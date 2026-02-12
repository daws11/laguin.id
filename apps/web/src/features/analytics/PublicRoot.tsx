import { Outlet } from 'react-router-dom'
import { MetaPixel } from './MetaPixel'

// Pixel ID is not secret; keep it configurable via env if needed.
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID ?? '928174156542569'

export function PublicRoot() {
  return (
    <>
      <MetaPixel pixelId={META_PIXEL_ID} />
      <Outlet />
    </>
  )
}

