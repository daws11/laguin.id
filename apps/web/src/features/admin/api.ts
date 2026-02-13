import { apiGet, apiPost, apiPut, apiUpload } from '@/lib/http'
import type { CustomerDetail, CustomerListItem, DraftDetail, OrderDetail, OrderListItem, PromptTemplate, Settings } from './types'

export async function adminLogin(password: string) {
  return apiPost<{ token: string }>('/api/admin/login', { password })
}

export async function adminGetSettings(token: string) {
  return apiGet<Settings>('/api/admin/settings', { token })
}

export async function adminSaveSettings(
  token: string,
  partial: Partial<Settings> & { openaiApiKey?: string; kaiAiApiKey?: string; ycloudApiKey?: string },
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

export async function adminGetCustomers(token: string) {
  return apiGet<CustomerListItem[]>('/api/admin/customers', { token })
}

export async function adminGetCustomer(token: string, id: string) {
  return apiGet<CustomerDetail>(`/api/admin/customers/${encodeURIComponent(id)}`, { token })
}

export async function adminGetOrderDraft(token: string, id: string) {
  return apiGet<DraftDetail>(`/api/admin/order-drafts/${encodeURIComponent(id)}`, { token })
}

export async function adminGetOrders(token: string) {
  return apiGet<OrderListItem[]>('/api/admin/orders', { token })
}

export async function adminGetOrder(token: string, id: string) {
  return apiGet<OrderDetail>(`/api/admin/orders/${encodeURIComponent(id)}`, { token })
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

export async function adminUpload(token: string, kind: 'image' | 'video' | 'audio', formData: FormData) {
  return apiUpload<{ ok: true; path: string }>(`/api/admin/uploads?kind=${kind}`, formData, { token })
}

