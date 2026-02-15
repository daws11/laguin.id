import { Outlet } from 'react-router-dom'
import { MetaPixel } from './MetaPixel'

// Pixel ID is not secret; keep it configurable via env if needed.
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID ?? '928174156542569'
const META_PIXEL_WISHLIST_ID = import.meta.env.VITE_META_PIXEL_WISHLIST_ID ?? '1234505681452683'

export function PublicRoot() {
  return (
    <>
      <MetaPixel pixelId={META_PIXEL_ID} />
      <MetaPixel pixelId={META_PIXEL_WISHLIST_ID} />
      <Outlet />
    </>
  )
}

