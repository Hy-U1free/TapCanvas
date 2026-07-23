import { MantineProvider } from '@mantine/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GithubGate from '../../src/auth/GithubGate'

const mocks = vi.hoisted(() => ({
  setAuth: vi.fn(),
  toast: vi.fn(),
  requestEmailRegistrationCode: vi.fn(),
  registerWithEmail: vi.fn(),
  loginWithEmailPassword: vi.fn(),
  legacyGithubExchange: vi.fn(),
  legacyPhoneCodeRequest: vi.fn(),
  legacyPhoneCodeVerify: vi.fn(),
  legacyPhonePasswordLogin: vi.fn(),
  markPasswordSetupGuidePending: vi.fn(),
}))

vi.mock('../../src/auth/store', () => ({
  useAuth: (selector: (state: unknown) => unknown) => selector({
    token: null,
    user: null,
    setAuth: mocks.setAuth,
  }),
}))

vi.mock('../../src/ui/toast', () => ({
  toast: (...args: unknown[]) => mocks.toast(...args),
}))

vi.mock('../../src/auth/passwordSetupGuide', () => ({
  markPasswordSetupGuidePending: (...args: unknown[]) => mocks.markPasswordSetupGuidePending(...args),
}))

vi.mock('../../src/api/server', () => ({
  requestEmailRegistrationCode: (...args: unknown[]) => mocks.requestEmailRegistrationCode(...args),
  registerWithEmail: (...args: unknown[]) => mocks.registerWithEmail(...args),
  loginWithEmailPassword: (...args: unknown[]) => mocks.loginWithEmailPassword(...args),
  exchangeGithub: (...args: unknown[]) => mocks.legacyGithubExchange(...args),
  requestPhoneLoginCode: (...args: unknown[]) => mocks.legacyPhoneCodeRequest(...args),
  verifyPhoneLogin: (...args: unknown[]) => mocks.legacyPhoneCodeVerify(...args),
  loginWithPhonePassword: (...args: unknown[]) => mocks.legacyPhonePasswordLogin(...args),
}))

const AUTH_USER = {
  sub: 'email-user-1',
  login: 'creator',
  name: 'Creator',
  email: 'creator@example.com',
  hasPassword: true,
  guest: false,
}

function renderGate() {
  return render(
    <MantineProvider>
      <GithubGate>
        <div>受保护内容</div>
      </GithubGate>
    </MantineProvider>,
  )
}

function openRegisterTab() {
  fireEvent.click(screen.getByRole('tab', { name: '注册' }))
}

function fillRegistrationForm(input?: {
  email?: string
  code?: string
  password?: string
  confirmPassword?: string
}) {
  const values = {
    email: 'creator@example.com',
    code: '123456',
    password: 'password123',
    confirmPassword: 'password123',
    ...input,
  }
  fireEvent.change(screen.getByRole('textbox', { name: '注册邮箱' }), { target: { value: values.email } })
  fireEvent.change(screen.getByRole('textbox', { name: '邮箱验证码' }), { target: { value: values.code } })
  fireEvent.change(screen.getByLabelText('注册密码'), { target: { value: values.password } })
  fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: values.confirmPassword } })
}

describe('GithubGate email authentication', () => {
  beforeEach(() => {
    vi.useRealTimers()
    for (const mock of Object.values(mocks)) mock.mockReset()
    mocks.requestEmailRegistrationCode.mockResolvedValue({ sent: true, expiresInSeconds: 600 })
    mocks.loginWithEmailPassword.mockResolvedValue({ token: 'login-token', user: AUTH_USER })
    mocks.registerWithEmail.mockResolvedValue({ token: 'register-token', user: AUTH_USER })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders explicit login and registration tabs without GitHub or phone controls', () => {
    renderGate()

    expect(screen.getByRole('tab', { name: '登录' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '注册' })).toBeVisible()
    expect(screen.queryByText(/GitHub/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/手机|手机号/)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /手机|手机号/ })).not.toBeInTheDocument()
  })

  it('uses correct email and password semantics in both tabs', () => {
    renderGate()

    const loginEmail = screen.getByRole('textbox', { name: '登录邮箱' })
    const loginPassword = screen.getByLabelText('登录密码')
    expect(loginEmail).toHaveAttribute('type', 'email')
    expect(loginEmail).toHaveAttribute('autocomplete', 'email')
    expect(loginPassword).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('button', { name: '显示登录密码' })).toBeVisible()

    openRegisterTab()

    const registerEmail = screen.getByRole('textbox', { name: '注册邮箱' })
    expect(registerEmail).toHaveAttribute('type', 'email')
    expect(registerEmail).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByRole('textbox', { name: '邮箱验证码' })).toHaveAttribute('maxlength', '6')
    expect(screen.getByLabelText('注册密码')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('确认密码')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByRole('button', { name: '显示注册密码' })).toBeVisible()
    expect(screen.getByRole('button', { name: '显示确认密码' })).toBeVisible()
  })

  it('rejects an invalid login email before calling the API', () => {
    renderGate()

    fireEvent.change(screen.getByRole('textbox', { name: '登录邮箱' }), { target: { value: 'not-an-email' } })
    fireEvent.change(screen.getByLabelText('登录密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(mocks.loginWithEmailPassword).not.toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith('请输入有效的邮箱地址', 'error')
  })

  it('rejects mismatched registration passwords without discarding the draft', () => {
    renderGate()
    openRegisterTab()
    fillRegistrationForm({ confirmPassword: 'different123' })

    fireEvent.click(screen.getByRole('button', { name: '创建账号' }))

    expect(mocks.registerWithEmail).not.toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith('两次输入的密码不一致', 'error')
    expect(screen.getByRole('textbox', { name: '注册邮箱' })).toHaveValue('creator@example.com')
    expect(screen.getByRole('textbox', { name: '邮箱验证码' })).toHaveValue('123456')
  })

  it('starts a 60 second cooldown only after the registration code request succeeds', async () => {
    vi.useFakeTimers()
    renderGate()
    openRegisterTab()
    fireEvent.change(screen.getByRole('textbox', { name: '注册邮箱' }), { target: { value: ' Creator@Example.COM ' } })

    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
    await act(async () => Promise.resolve())

    expect(mocks.requestEmailRegistrationCode).toHaveBeenCalledWith('creator@example.com')
    const cooldownButton = screen.getByRole('button', { name: '60 秒后可重新获取验证码' })
    expect(cooldownButton).toBeDisabled()
    expect(cooldownButton).toHaveTextContent('60 秒')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByRole('button', { name: '59 秒后可重新获取验证码' })).toBeDisabled()
  })

  it('moves focus to the verification-code field after a successful request', async () => {
    renderGate()
    openRegisterTab()
    fireEvent.change(screen.getByRole('textbox', { name: '注册邮箱' }), { target: { value: 'creator@example.com' } })

    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: '邮箱验证码' })).toHaveFocus())
  })

  it('does not start the cooldown when sending the registration code fails', async () => {
    mocks.requestEmailRegistrationCode.mockRejectedValue(new Error('邮件发送失败'))
    renderGate()
    openRegisterTab()
    fireEvent.change(screen.getByRole('textbox', { name: '注册邮箱' }), { target: { value: 'creator@example.com' } })

    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('邮件发送失败', 'error'))
    expect(screen.getByRole('button', { name: '获取验证码' })).toBeEnabled()
    expect(screen.getByRole('textbox', { name: '注册邮箱' })).toHaveValue('creator@example.com')
  })

  it('fills a debug verification code returned by the API', async () => {
    mocks.requestEmailRegistrationCode.mockResolvedValue({
      sent: true,
      expiresInSeconds: 600,
      retryAfterSeconds: 60,
      devCode: '654321',
      delivery: 'debug',
    })
    renderGate()
    openRegisterTab()
    fireEvent.change(screen.getByRole('textbox', { name: '注册邮箱' }), { target: { value: 'creator@example.com' } })

    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: '邮箱验证码' })).toHaveValue('654321'))
    expect(mocks.toast).toHaveBeenCalledWith('开发环境验证码已自动填入', 'info')
  })

  it('normalizes the email and completes password login through the existing auth store', async () => {
    renderGate()
    fireEvent.change(screen.getByRole('textbox', { name: '登录邮箱' }), { target: { value: ' Creator@Example.COM ' } })
    fireEvent.change(screen.getByLabelText('登录密码'), { target: { value: 'password123' } })

    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(mocks.loginWithEmailPassword).toHaveBeenCalledWith('creator@example.com', 'password123'))
    expect(mocks.setAuth).toHaveBeenCalledWith('login-token', AUTH_USER)
    expect(mocks.markPasswordSetupGuidePending).not.toHaveBeenCalled()
  })

  it('creates an account and completes login with the verified email', async () => {
    renderGate()
    openRegisterTab()
    fillRegistrationForm()

    fireEvent.click(screen.getByRole('button', { name: '创建账号' }))

    await waitFor(() => expect(mocks.registerWithEmail).toHaveBeenCalledWith(
      'creator@example.com',
      '123456',
      'password123',
    ))
    expect(mocks.setAuth).toHaveBeenCalledWith('register-token', AUTH_USER)
    expect(mocks.markPasswordSetupGuidePending).not.toHaveBeenCalled()
  })

  it('keeps the complete registration draft after an API error', async () => {
    mocks.registerWithEmail.mockRejectedValue(new Error('验证码无效或已过期'))
    renderGate()
    openRegisterTab()
    fillRegistrationForm()

    fireEvent.click(screen.getByRole('button', { name: '创建账号' }))

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('验证码无效或已过期', 'error'))
    expect(screen.getByRole('textbox', { name: '注册邮箱' })).toHaveValue('creator@example.com')
    expect(screen.getByRole('textbox', { name: '邮箱验证码' })).toHaveValue('123456')
    expect(screen.getByLabelText('注册密码')).toHaveValue('password123')
    expect(screen.getByLabelText('确认密码')).toHaveValue('password123')
  })
})
