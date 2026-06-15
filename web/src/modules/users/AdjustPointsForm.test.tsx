import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdjustPointsForm } from './AdjustPointsForm'

const fetchMock = vi.fn()

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AdjustPointsForm userId="507f1f77bcf86cd799439011" />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  window.localStorage.setItem('easy-admin-token', 'test-token')
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  window.localStorage.clear()
})

describe('AdjustPointsForm', () => {
  it('blocks submit and shows an error when amount is missing', async () => {
    renderForm()

    // Leave amount at its empty default (avoids jsdom number-input range quirks).
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'test' } })
    fireEvent.click(screen.getByRole('button', { name: /grant points/i }))

    expect(await screen.findByText(/positive number/i)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires a reason', async () => {
    renderForm()

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: /grant points/i }))

    expect(await screen.findByText(/reason is required/i)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits a valid permanent grant to the adjust endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ newBalance: { recurring: 0, permanent: 500, total: 500 } }),
    })

    renderForm()

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Support comp' } })
    fireEvent.click(screen.getByRole('button', { name: /grant points/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const call = fetchMock.mock.calls[0]!
    const [url, init] = call
    expect(String(url)).toContain('/api/users/507f1f77bcf86cd799439011/points/adjust')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ amount: 500, mode: 'permanent', reason: 'Support comp' })
  })
})
