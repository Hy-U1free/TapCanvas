import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as server from '../../src/api/server'

type EmailAuthApi = {
  requestEmailRegistrationCode: (email: string) => Promise<{
    sent: boolean
    expiresInSeconds?: number
    retryAfterSeconds?: number
    devCode?: string
    delivery?: 'email' | 'debug'
  }>
  registerWithEmail: (email: string, code: string, password: string) => Promise<unknown>
  loginWithEmailPassword: (email: string, password: string) => Promise<unknown>
}

const fetchMock = vi.fn()

function emailAuthApi(): EmailAuthApi {
  const api = server as unknown as Partial<EmailAuthApi>
  expect(typeof api.requestEmailRegistrationCode).toBe('function')
  expect(typeof api.registerWithEmail).toBe('function')
  expect(typeof api.loginWithEmailPassword).toBe('function')
  return api as EmailAuthApi
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('email authentication API client', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the registration-code, registration, and password-login payloads to their exact endpoints', async () => {
    const api = emailAuthApi()
    const authBody = {
      token: 'email-token',
      user: { sub: 'email-user', login: 'creator', email: 'creator@example.com' },
    }
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        sent: true,
        expiresInSeconds: 600,
        retryAfterSeconds: 60,
        devCode: '123456',
        delivery: 'debug',
      }))
      .mockResolvedValueOnce(jsonResponse(authBody))
      .mockResolvedValueOnce(jsonResponse(authBody))

    await expect(api.requestEmailRegistrationCode('creator@example.com')).resolves.toEqual({
      sent: true,
      expiresInSeconds: 600,
      retryAfterSeconds: 60,
      devCode: '123456',
      delivery: 'debug',
    })
    await expect(api.registerWithEmail('creator@example.com', '123456', 'password123')).resolves.toEqual(authBody)
    await expect(api.loginWithEmailPassword('creator@example.com', 'password123')).resolves.toEqual(authBody)

    const [requestCodeCall, registerCall, loginCall] = fetchMock.mock.calls
    expect(String(requestCodeCall[0])).toMatch(/\/auth\/email\/register\/request$/)
    expect(requestCodeCall[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email: 'creator@example.com' }),
    })
    expect(String(registerCall[0])).toMatch(/\/auth\/email\/register\/verify$/)
    expect(registerCall[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email: 'creator@example.com', code: '123456', password: 'password123' }),
    })
    expect(String(loginCall[0])).toMatch(/\/auth\/email\/password-login$/)
    expect(loginCall[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email: 'creator@example.com', password: 'password123' }),
    })
  })

  it('preserves readable backend error messages, status, and codes', async () => {
    const api = emailAuthApi()
    fetchMock.mockResolvedValue(jsonResponse({
      error: '邮箱或密码不正确',
      code: 'email_password_invalid',
    }, 401))

    await expect(api.loginWithEmailPassword('creator@example.com', 'wrong-password')).rejects.toMatchObject({
      message: '邮箱或密码不正确',
      status: 401,
      code: 'email_password_invalid',
    })
  })
})
