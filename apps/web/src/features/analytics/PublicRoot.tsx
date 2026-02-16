import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MetaPixel } from './MetaPixel'
import { apiGet } from '@/lib/http'

export function PublicRoot() {
  const [pixelId, setPixelId] = useState<string | null>(null)
  const [wishlistId, setWishlistId] = useState<string | null>(null)

  useEffect(() => {
    apiGet<{ metaPixelId: string | null; metaPixelWishlistId: string | null }>('/api/public/settings')
      .then((data) => {
        setPixelId(data.metaPixelId ?? null)
        setWishlistId(data.metaPixelWishlistId ?? null)
      })
      .catch(() => {})
  }, [])

  return (
    <>
      {pixelId && <MetaPixel pixelId={pixelId} />}
      {wishlistId && <MetaPixel pixelId={wishlistId} />}
      <Outlet />
    </>
  )
}
