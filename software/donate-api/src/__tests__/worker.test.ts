import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the worker environment
interface Env {
  PAYPAL_CLIENT_ID: string
  PAYPAL_CLIENT_SECRET: string
  PAYPAL_MODE: string
  PAYPAL_WEBHOOK_ID: string
  PAYPAL_PRODUCT_ID: string
  TURNSTILE_SECRET: string
  DISCORD_WEBHOOK_URL: string
  ALLOWED_ORIGIN: string
  GENESIS_GATE_URL?: string
}

// Mock environment
const env: Env = {
  PAYPAL_CLIENT_ID: 'test_client_id',
  PAYPAL_CLIENT_SECRET: 'test_client_secret',
  PAYPAL_MODE: 'sandbox',
  PAYPAL_WEBHOOK_ID: 'test_webhook_id',
  PAYPAL_PRODUCT_ID: 'test_product_id',
  TURNSTILE_SECRET: 'test_turnstile_secret',
  DISCORD_WEBHOOK_URL: 'https://discord.example.com/webhook',
  ALLOWED_ORIGIN: 'https://example.com',
}

// Mock fetch
const mockFetch = vi.fn()
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
})

// Import the worker
import worker from '../worker'

describe('Donate API Worker', () => {
  describe('POST /create-checkout', () => {
    it('should return approval URL for valid request', async () => {
      // Mock PayPal API responses
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access_token' }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'PAYPAL_ORDER_ID' }), { status: 201 }))

      const request = new Request('https://example.com/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 1000,
          currency: 'usd',
          mode: 'once',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      })

      const response = await worker.fetch(request, env)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('approval_url')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should return 400 for missing required fields', async () => {
      const request = new Request('https://example.com/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // missing amount
          currency: 'usd',
          mode: 'once',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      })

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(400)
    })
  })

  describe('POST /paypal-webhook', () => {
    it('should return 200 for valid webhook', async () => {
      const request = new Request('https://example.com/paypal-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 'webhook_id',
          event_type: 'PAYMENT.SALE.COMPLETED',
          resource: {
            id: 'payment_id',
            state: 'approved',
          },
        }),
      })

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(200)
    })

    it('should return 401 for missing/invalid headers', async () => {
      const request = new Request('https://example.com/paypal-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'webhook_id',
          event_type: 'PAYMENT.SALE.COMPLETED',
          resource: { id: 'payment_id', state: 'approved' },
        }),
      })

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('Event logging', () => {
    it('should attempt to log events to external service', async () => {
      // This would test the fetch to /event endpoint
      // We mainly want to ensure it doesn't throw
      const request = new Request('https://example.com/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 1000,
          currency: 'usd',
          mode: 'once',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      })

      // Mock the event logging endpoint
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access_token' }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'PAYPAL_ORDER_ID' }), { status: 201 }))
        .mockResolvedValueOnce(new Response('', { status: 204 })) // Event logging endpoint

      await worker.fetch(request, env)
      // Should have made 3 calls: get token, create order, log event
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })
})
