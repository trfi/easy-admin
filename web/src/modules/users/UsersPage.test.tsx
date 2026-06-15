import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { UsersPage } from './UsersPage'

const fetchMock = vi.fn()

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const USER = {
  _id: 'u1',
  email: 'alice@example.com',
  username: 'alice',
  name: 'Alice',
  role: 'User',
  points: { recurring: 10, permanent: 5, total: 15 },
  plan: { name: 'Pro' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  window.localStorage.setItem('easy-admin-token', 'test-token')
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ users: [USER] }),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  window.localStorage.clear()
})

describe('UsersPage', () => {
  it('renders the user list from /api/users', async () => {
    renderPage()
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('search input drives the /api/users?q= query', async () => {
    renderPage()
    await screen.findByText('Alice')

    const input = screen.getByPlaceholderText(/search by email/i)
    fireEvent.change(input, { target: { value: 'bob' } })

    await waitFor(() => {
      const called = fetchMock.mock.calls.some(([url]) => String(url).includes('/api/users?q=bob'))
      expect(called).toBe(true)
    })
  })
})
