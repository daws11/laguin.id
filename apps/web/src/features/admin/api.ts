import { apiGet, apiPost, apiPut, apiUpload, apiDelete } from '@/lib/http'
import type { CustomerDetail, CustomerListItem, DraftDetail, OrderDetail, OrderListItem, PromptTemplate, Settings } from './types'

export async function adminLogin(password: string) {
  return apiPost<{ token: string }>('/api/admin/login', { password })
}

export type TestimonialVideoItem = {
  id: string
  orderId: string
  videoUrl: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  customerName: string
  customerPhone: string
  recipientName: string
}

export async function adminGetTestimonialVideos(token: string) {
  return apiGet<TestimonialVideoItem[]>('/api/admin/testimonial-videos', { token })
}

export async function adminApproveTestimonialVideo(token: string, id: string) {
  return apiPost<{ ok: boolean }>(`/api/admin/testimonial-videos/${encodeURIComponent(id)}/approve`, {}, { token })
}

export async function adminRejectTestimonialVideo(token: string, id: string) {
  return apiPost<{ ok: boolean }>(`/api/admin/testimonial-videos/${encodeURIComponent(id)}/reject`, {}, { token })
}

export async function adminDeleteTestimonialVideo(token: string, id: string) {
  return apiDelete<{ ok: boolean }>(`/api/admin/testimonial-videos/${encodeURIComponent(id)}`, { token })
}

export async function adminGetSettings(token: string) {
  return apiGet<Settings>('/api/admin/settings', { token })
}

export type YCloudTemplate = {
  name: string
  language: string
  status: string
  category: string
  hasButton: boolean
  buttons: { type: string; text: string }[]
  bodyText: string | null
}

export async function adminFetchYCloudTemplates(token: string) {
  return apiGet<{ templates: YCloudTemplate[] }>('/api/admin/settings/whatsapp/templates', { token })
}

export async function adminSaveSettings(
  token: string,
  partial: Partial<Settings> & { openaiApiKey?: string; kaiAiApiKey?: string; ycloudApiKey?: string; ycloudWebhookSecret?: string },
) {
  return apiPut<Settings>('/api/admin/settings', partial, { token })
}

export async function adminGetPromptTemplates(token: string) {
  return apiGet<PromptTemplate[]>('/api/admin/prompt-templates', { token })
}

export async function adminCreatePromptTemplate(
  token: string,
  body: { type: 'lyrics' | 'mood_description' | 'music'; templateText: string; makeActive: boolean },
) {
  return apiPost('/api/admin/prompt-templates', body, { token })
}

export async function adminActivatePromptTemplate(token: string, id: string) {
  return apiPost(`/api/admin/prompt-templates/${encodeURIComponent(id)}/activate`, {}, { token })
}

export async function adminInstallRecommendedTemplates(token: string) {
  return apiPost('/api/admin/prompt-templates/recommended', {}, { token })
}

export async function adminUpdatePromptTemplate(
  token: string,
  id: string,
  body: { templateText?: string; kaiSettings?: unknown },
) {
  return apiPut<PromptTemplate>(`/api/admin/prompt-templates/${encodeURIComponent(id)}`, body, { token })
}

export type CustomersPage = {
  items: CustomerListItem[]
  total: number
  page: number
  pageSize: number
}

export async function adminGetCustomers(token: string, params?: URLSearchParams) {
  const url = params?.toString() ? `/api/admin/customers?${params.toString()}` : '/api/admin/customers'
  return apiGet<CustomersPage>(url, { token })
}

export async function adminGetCustomer(token: string, id: string) {
  return apiGet<CustomerDetail>(`/api/admin/customers/${encodeURIComponent(id)}`, { token })
}

export async function adminGetOrderDraft(token: string, id: string) {
  return apiGet<DraftDetail>(`/api/admin/order-drafts/${encodeURIComponent(id)}`, { token })
}

export type OrdersPage = {
  orders: OrderListItem[]
  total: number
  page: number
  pageSize: number
  statusCounts: Record<string, number>
}

export async function adminGetOrders(token: string, params?: URLSearchParams) {
  const url = params?.toString() ? `/api/admin/orders?${params.toString()}` : '/api/admin/orders'
  return apiGet<OrdersPage>(url, { token })
}

export async function adminGetOrder(token: string, id: string) {
  return apiGet<OrderDetail>(`/api/admin/orders/${encodeURIComponent(id)}`, { token })
}

export async function adminUpdateOrderInput(token: string, id: string, data: Record<string, unknown>) {
  return apiPost(`/api/admin/orders/${encodeURIComponent(id)}/update-input`, data, { token })
}

export async function adminRetryOrder(token: string, id: string) {
  return apiPost(`/api/admin/orders/${encodeURIComponent(id)}/retry`, {}, { token })
}

export async function adminResendEmail(token: string, id: string) {
  return apiPost(`/api/admin/orders/${encodeURIComponent(id)}/resend-email`, {}, { token })
}

export async function adminResendWhatsApp(token: string, id: string) {
  return apiPost(`/api/admin/orders/${encodeURIComponent(id)}/resend-whatsapp`, {}, { token })
}

export async function adminMarkDelivered(token: string, id: string) {
  return apiPost<any>(`/api/admin/orders/${encodeURIComponent(id)}/mark-delivered`, {}, { token })
}

export async function adminBulkDeleteOrders(token: string, ids: string[]) {
  return apiPost<{ ok: true; deleted: number }>('/api/admin/orders/bulk-delete', { ids }, { token })
}

export async function adminBulkResendWhatsApp(token: string, ids: string[]) {
  return apiPost<{ ok: boolean; sent: number; failed: number }>('/api/admin/orders/bulk-resend-whatsapp', { ids }, { token })
}

export async function adminBulkClearTracks(token: string, ids: string[]) {
  return apiPost<{ ok: true; cleared: number; ordersProcessed: number }>('/api/admin/orders/bulk-clear-tracks', { ids }, { token })
}

export async function adminBulkDeleteCustomers(token: string, ids: string[]) {
  return apiPost<{ ok: true; deleted: number }>('/api/admin/customers/bulk-delete', { ids }, { token })
}

export async function adminUpload(token: string, kind: 'image' | 'video' | 'audio', formData: FormData) {
  return apiUpload<{ ok: true; path: string }>(`/api/admin/uploads?kind=${kind}`, formData, { token })
}

export type FunnelStep = { key: string; label: string; count: number }
export type FunnelData = { dateRange: { from: string; to: string }; steps: FunnelStep[] }

export async function adminGetFunnel(token: string, from: string, to: string, themeSlug?: string) {
  const tzOffset = new Date().getTimezoneOffset()
  let url = `/api/admin/funnel?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tzOffset=${tzOffset}`
  if (themeSlug) url += `&themeSlug=${encodeURIComponent(themeSlug)}`
  return apiGet<FunnelData>(url, { token })
}

export type TrendDay = { date: string; homepage: number; step0: number; orderCreated: number; orderConfirmed: number; step0Pct: number; orderCreatedPct: number; orderConfirmedPct: number }
export type TrendData = { days: TrendDay[] }

export async function adminGetFunnelTrend(token: string, from: string, to: string, themeSlug?: string) {
  const tzOffset = new Date().getTimezoneOffset()
  let url = `/api/admin/funnel/trend?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tzOffset=${tzOffset}`
  if (themeSlug) url += `&themeSlug=${encodeURIComponent(themeSlug)}`
  return apiGet<TrendData>(url, { token })
}

export type ThemeItem = {
  id: string
  slug: string
  name: string
  isActive: boolean
  settings: any
  createdAt: string
  updatedAt: string
}

export async function adminGetThemes(token: string) {
  return apiGet<ThemeItem[]>('/api/admin/themes', { token })
}

export async function adminCreateTheme(token: string, body: { slug: string; name: string; isActive?: boolean; settings?: any }) {
  return apiPost<ThemeItem>('/api/admin/themes', body, { token })
}

export async function adminUpdateTheme(token: string, slug: string, body: { name?: string; isActive?: boolean; settings?: any }) {
  return apiPut<ThemeItem>(`/api/admin/themes/${encodeURIComponent(slug)}`, body, { token })
}

export async function adminAiGenerateTheme(token: string, prompt: string) {
  return apiPost<{ settings: any }>('/api/admin/themes/ai-generate', { prompt }, { token })
}

export async function adminDeleteTheme(token: string, slug: string) {
  const res = await fetch(`/api/admin/themes/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as any).error ?? 'Failed to delete theme')
  }
  return res.json()
}

export type DiscountCodeItem = {
  id: string
  code: string
  fixedAmount: number
  templateSlugs: string[] | null
  startsAt: string | null
  endsAt: string | null
  maxUsesPerPhone: number | null
  status: 'active' | 'paused'
  createdAt: string
  updatedAt: string
}

export async function adminGetDiscountCodes(token: string) {
  return apiGet<DiscountCodeItem[]>('/api/admin/discount-codes', { token })
}

export async function adminCreateDiscountCode(
  token: string,
  body: {
    code: string
    fixedAmount: number
    templateSlugs?: string[] | null
    startsAt?: string | null
    endsAt?: string | null
    maxUsesPerPhone?: number | null
    status?: 'active' | 'paused'
  },
) {
  return apiPost<DiscountCodeItem>('/api/admin/discount-codes', body, { token })
}

export async function adminUpdateDiscountCode(
  token: string,
  id: string,
  body: Partial<{
    code: string
    fixedAmount: number
    templateSlugs: string[] | null
    startsAt: string | null
    endsAt: string | null
    maxUsesPerPhone: number | null
    status: 'active' | 'paused'
  }>,
) {
  return apiPut<DiscountCodeItem>(`/api/admin/discount-codes/${encodeURIComponent(id)}`, body, { token })
}

export async function adminDeleteDiscountCode(token: string, id: string) {
  return apiDelete<{ ok: boolean }>(`/api/admin/discount-codes/${encodeURIComponent(id)}`, { token })
}

export type WhatsAppLogItem = {
  id: string
  createdAt: string
  type: string
  phone: string
  templateName: string
  templateLangCode: string | null
  orderId: string | null
  draftId: string | null
  error: string | null
  status: 'Sent' | 'Failed'
}

export type WhatsAppLogsPage = {
  items: WhatsAppLogItem[]
  total: number
  page: number
  pageSize: number
}

export type WhatsAppScheduledItem = {
  draftId: string
  phone: string
  reminderLabel: string
  templateName: string
  estimatedSendTime: string
}

export async function adminGetWhatsAppLogs(token: string, params?: URLSearchParams) {
  const url = params?.toString() ? `/api/admin/whatsapp-logs?${params.toString()}` : '/api/admin/whatsapp-logs'
  return apiGet<WhatsAppLogsPage>(url, { token })
}

export async function adminGetWhatsAppScheduled(token: string) {
  return apiGet<{ scheduled: WhatsAppScheduledItem[] }>('/api/admin/whatsapp-logs/scheduled', { token })
}

export async function adminEnqueueExport(
  token: string,
  params: { from: string; to: string; tzOffset: number; themeSlug?: string },
) {
  return apiPost<{ jobId: string }>('/api/admin/orders/export-stories', params, { token })
}

export type ExportJobStatus = {
  id: string
  status: 'pending' | 'done' | 'failed'
  error: string | null
  createdAt: string
  downloadUrl: string | null
}

export async function adminGetExportJobStatus(token: string, jobId: string): Promise<ExportJobStatus> {
  return apiGet<ExportJobStatus>(`/api/admin/orders/export-jobs/${encodeURIComponent(jobId)}`, { token })
}

export async function adminDuplicateTheme(token: string, slug: string) {
  const res = await fetch(`/api/admin/themes/${encodeURIComponent(slug)}/duplicate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as any).error ?? 'Failed to duplicate theme')
  }
  return res.json()
}

