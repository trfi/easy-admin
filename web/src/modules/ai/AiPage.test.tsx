import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AiPage } from './AiPage'

const fetchMock = vi.fn()

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AiPage />
    </QueryClientProvider>
  )
}

const PROVIDERS = [
  { providerId: 'openai', name: 'OpenAI', baseURL: 'https://api.openai.com', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
]
const STATUS = [
  { _id: 's1', providerId: 'openai', active: true, failureCount: 0 },
]
const COMBOS = [
  { _id: 'c1', comboId: 'default', strategy: 'fallback', active: true, candidates: [{ providerId: 'openai', modelId: 'gpt-5', active: true }], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
]

function jsonFor(url: string) {
  if (url.includes('/api/ai/providers')) return { providers: PROVIDERS }
  if (url.includes('/api/ai/combos')) return { combos: COMBOS }
  if (url.includes('/api/ai/status')) return { status: STATUS }
  return {}
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  window.localStorage.setItem('easy-admin-token', 'test-token')
  fetchMock.mockImplementation((url: string) =>
    Promise.resolve({ ok: true, status: 200, json: async () => jsonFor(String(url)) })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  window.localStorage.clear()
})

describe('AiPage', () => {
  it('renders providers with live status', async () => {
    renderPage()
    expect(await screen.findByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('healthy')).toBeInTheDocument()
  })

  it('never references apiKey in any rendered text or request', async () => {
    renderPage()
    await screen.findByText('OpenAI')
    expect(document.body.textContent).not.toMatch(/apiKey/i)
    const sentBodies = fetchMock.mock.calls.map(([, init]) => (init as RequestInit | undefined)?.body ?? '')
    for (const body of sentBodies) {
      expect(String(body)).not.toMatch(/apiKey/i)
    }
  })

  it('toggling a provider fires a PATCH to /api/ai/providers/:id', async () => {
    renderPage()
    const toggle = await screen.findByLabelText('Toggle OpenAI')
    fireEvent.click(toggle)
    await waitFor(() => {
      const called = fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url).includes('/api/ai/providers/openai') &&
          (init as RequestInit | undefined)?.method === 'PATCH'
      )
      expect(called).toBe(true)
    })
  })
})
