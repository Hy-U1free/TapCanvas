import React from 'react'
import {
  Anchor,
  Button,
  Group,
  PasswordInput,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  loginWithEmailPassword,
  registerWithEmail,
  requestEmailRegistrationCode,
} from '../api/server'
import { toast } from '../ui/toast'
import { useAuth, type User } from './store'
import { PanelCard } from '../ui/PanelCard'

const REDIRECT_STORAGE_KEY = 'tapcanvas_login_redirect'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128

type AuthTab = 'login' | 'register'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function showAuthFeedback(message: string, type: 'info' | 'success' | 'error'): void {
  notifications.cleanQueue()
  notifications.clean()
  toast(message, type)
}

function normalizeEmail(value: string): string {
  return String(value || '').trim().toLowerCase()
}

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}

function normalizeRedirect(raw: string | null): string | null {
  if (!raw || typeof window === 'undefined') return null
  try {
    const url = new URL(raw, window.location.origin)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString()
    }
    return null
  } catch {
    return null
  }
}

function captureRedirectFromLocation(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const url = new URL(window.location.href)
    const redirectFromQuery = normalizeRedirect(url.searchParams.get('redirect'))
    if (redirectFromQuery) {
      sessionStorage.setItem(REDIRECT_STORAGE_KEY, redirectFromQuery)
      url.searchParams.delete('redirect')
      window.history.replaceState({}, '', url.toString())
    }
    return sessionStorage.getItem(REDIRECT_STORAGE_KEY)
  } catch {
    return null
  }
}

function readStoredRedirect(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(REDIRECT_STORAGE_KEY)
}

function clearStoredRedirect(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(REDIRECT_STORAGE_KEY)
}

function appendAuthToRedirect(target: string, token: string, user: User | null | undefined): string | null {
  try {
    const url = new URL(target)
    url.searchParams.delete('tap_token')
    url.searchParams.delete('tap_user')
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
    const isSameOrigin = Boolean(currentOrigin) && url.origin === currentOrigin
    if (!isSameOrigin) {
      url.searchParams.set('tap_token', token)
      if (user) {
        url.searchParams.set('tap_user', JSON.stringify(user))
      }
    }
    return url.toString()
  } catch {
    return null
  }
}

function buildGuideUrl(): string {
  return 'https://ai.feishu.cn/wiki/YZWhw4w2FiO02LkqYosc4NY5nSh'
}

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return '密码至少需要 8 位'
  if (password.length > PASSWORD_MAX_LENGTH) return '密码不能超过 128 位'
  return null
}

export default function GithubGate({ children, className }: { children: React.ReactNode; className?: string }) {
  const token = useAuth((state) => state.token)
  const user = useAuth((state) => state.user)
  const setAuth = useAuth((state) => state.setAuth)
  const [activeTab, setActiveTab] = React.useState<AuthTab>('login')
  const [loginEmail, setLoginEmail] = React.useState('')
  const [loginPassword, setLoginPassword] = React.useState('')
  const [loginPasswordVisible, setLoginPasswordVisible] = React.useState(false)
  const [loginLoading, setLoginLoading] = React.useState(false)
  const [registrationEmail, setRegistrationEmail] = React.useState('')
  const [registrationCode, setRegistrationCode] = React.useState('')
  const [registrationPassword, setRegistrationPassword] = React.useState('')
  const [registrationPasswordVisible, setRegistrationPasswordVisible] = React.useState(false)
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [confirmPasswordVisible, setConfirmPasswordVisible] = React.useState(false)
  const [registrationLoading, setRegistrationLoading] = React.useState(false)
  const [codeSendLoading, setCodeSendLoading] = React.useState(false)
  const [codeCooldownSeconds, setCodeCooldownSeconds] = React.useState(0)
  const registrationCodeInputRef = React.useRef<HTMLInputElement>(null)
  const redirectingRef = React.useRef(false)
  const [hasRedirect, setHasRedirect] = React.useState(() => Boolean(readStoredRedirect()))

  const completeLogin = React.useCallback((authToken: string, authUser: User) => {
    setAuth(authToken, authUser)
    if (redirectingRef.current) return
    const target = readStoredRedirect()
    if (!target) {
      setHasRedirect(false)
      return
    }
    const next = appendAuthToRedirect(target, authToken, authUser)
    if (!next) {
      clearStoredRedirect()
      setHasRedirect(false)
      return
    }
    redirectingRef.current = true
    clearStoredRedirect()
    window.location.href = next
  }, [setAuth])

  React.useEffect(() => {
    const stored = captureRedirectFromLocation()
    if (stored) setHasRedirect(true)
  }, [])

  React.useEffect(() => {
    if (!token || !hasRedirect || !user) return
    const target = readStoredRedirect()
    if (!target) {
      setHasRedirect(false)
      return
    }
    const next = appendAuthToRedirect(target, token, user)
    if (!next) {
      clearStoredRedirect()
      setHasRedirect(false)
      return
    }
    redirectingRef.current = true
    clearStoredRedirect()
    window.location.href = next
  }, [hasRedirect, token, user])

  React.useEffect(() => {
    if (codeCooldownSeconds <= 0) return
    const timer = window.setTimeout(() => {
      setCodeCooldownSeconds((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [codeCooldownSeconds])

  const handleLogin = React.useCallback(async () => {
    const email = normalizeEmail(loginEmail)
    if (!isValidEmail(email)) {
      showAuthFeedback('请输入有效的邮箱地址', 'error')
      return
    }
    const passwordError = validatePassword(loginPassword)
    if (passwordError) {
      showAuthFeedback(passwordError, 'error')
      return
    }
    if (loginLoading) return

    setLoginLoading(true)
    try {
      const { token: authToken, user: authUser } = await loginWithEmailPassword(email, loginPassword)
      completeLogin(authToken, authUser)
    } catch (error) {
      showAuthFeedback(getErrorMessage(error, '邮箱或密码登录失败，请稍后再试'), 'error')
    } finally {
      setLoginLoading(false)
    }
  }, [completeLogin, loginEmail, loginLoading, loginPassword])

  const handleCodeRequest = React.useCallback(async () => {
    const email = normalizeEmail(registrationEmail)
    if (!isValidEmail(email)) {
      showAuthFeedback('请输入有效的邮箱地址', 'error')
      return
    }
    if (codeCooldownSeconds > 0) {
      showAuthFeedback(`请在 ${codeCooldownSeconds} 秒后重试`, 'info')
      return
    }
    if (codeSendLoading) return

    setCodeSendLoading(true)
    try {
      const result = await requestEmailRegistrationCode(email)
      if (!result.sent) {
        throw new Error('验证码发送失败，请稍后再试')
      }
      const retryAfter = Number(result.retryAfterSeconds)
      setCodeCooldownSeconds(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.floor(retryAfter) : 60)
      if (result.delivery === 'debug' && result.devCode) {
        setRegistrationCode(result.devCode.slice(0, 6))
        showAuthFeedback('开发环境验证码已自动填入', 'info')
      } else {
        showAuthFeedback('验证码已发送，请查收邮箱', 'success')
      }
      registrationCodeInputRef.current?.focus()
    } catch (error) {
      showAuthFeedback(getErrorMessage(error, '验证码发送失败，请稍后再试'), 'error')
    } finally {
      setCodeSendLoading(false)
    }
  }, [codeCooldownSeconds, codeSendLoading, registrationEmail])

  const handleRegistration = React.useCallback(async () => {
    const email = normalizeEmail(registrationEmail)
    if (!isValidEmail(email)) {
      showAuthFeedback('请输入有效的邮箱地址', 'error')
      return
    }
    if (!/^\d{6}$/.test(registrationCode)) {
      showAuthFeedback('请输入 6 位邮箱验证码', 'error')
      return
    }
    const passwordError = validatePassword(registrationPassword)
    if (passwordError) {
      showAuthFeedback(passwordError, 'error')
      return
    }
    if (registrationPassword !== confirmPassword) {
      showAuthFeedback('两次输入的密码不一致', 'error')
      return
    }
    if (registrationLoading) return

    setRegistrationLoading(true)
    try {
      const { token: authToken, user: authUser } = await registerWithEmail(
        email,
        registrationCode,
        registrationPassword,
      )
      completeLogin(authToken, authUser)
    } catch (error) {
      showAuthFeedback(getErrorMessage(error, '账号创建失败，请稍后再试'), 'error')
    } finally {
      setRegistrationLoading(false)
    }
  }, [completeLogin, confirmPassword, registrationCode, registrationEmail, registrationLoading, registrationPassword])

  const gateClassName = ['github-gate', className].filter(Boolean).join(' ')

  if (token) {
    return (
      <div className={gateClassName} style={{ height: '100%', width: '100%' }}>
        {children}
      </div>
    )
  }

  return (
    <div
      className={gateClassName}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        padding: 12,
        background: 'var(--mantine-color-body)',
        zIndex: 1000,
      }}
    >
      <PanelCard
        className="github-gate-card"
        padding="comfortable"
        style={{
          width: 'min(460px, calc(100vw - 24px))',
          maxHeight: 'calc(100dvh - 24px)',
          minWidth: 0,
          overflowY: 'auto',
        }}
      >
        <Stack className="github-gate-content" gap="md">
          <Stack className="github-gate-heading" gap={3}>
            <Title className="github-gate-title" order={4} ta="center">登录 TapCanvas</Title>
            <Text className="github-gate-subtitle" c="dimmed" size="sm" ta="center">
              使用邮箱登录，或通过邮箱验证码创建账号
            </Text>
            <Group className="github-gate-guide-row" justify="center" gap={6}>
              <Text className="github-gate-guide-prefix" size="xs" c="dimmed">不知道怎么用？</Text>
              <Anchor className="github-gate-guide-link" size="xs" href={buildGuideUrl()} target="_blank" rel="noreferrer">
                查看使用指引
              </Anchor>
            </Group>
          </Stack>

          <Tabs
            className="github-gate-tabs"
            value={activeTab}
            onChange={(value) => setActiveTab(value === 'register' ? 'register' : 'login')}
            keepMounted={false}
          >
            <Tabs.List className="github-gate-tabs__list" grow aria-label="邮箱账户入口">
              <Tabs.Tab className="github-gate-tabs__tab" value="login">登录</Tabs.Tab>
              <Tabs.Tab className="github-gate-tabs__tab" value="register">注册</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel className="github-gate-tabs__panel" value="login" pt="md">
              <form
                aria-label="邮箱密码登录"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleLogin()
                }}
              >
                <Stack className="github-gate-login-form" gap="sm">
                  <TextInput
                    className="github-gate-login-email"
                    label="登录邮箱"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.currentTarget.value)}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                  />
                  <PasswordInput
                    className="github-gate-login-password"
                    label="登录密码"
                    placeholder="输入登录密码"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.currentTarget.value)}
                    autoComplete="current-password"
                    visible={loginPasswordVisible}
                    onVisibilityChange={setLoginPasswordVisible}
                    visibilityToggleButtonProps={{
                      'aria-label': loginPasswordVisible ? '隐藏登录密码' : '显示登录密码',
                    }}
                  />
                  <Button
                    className="github-gate-login-submit"
                    fullWidth
                    type="submit"
                    loading={loginLoading}
                    disabled={loginLoading}
                    style={{ fontSize: 13 }}
                  >
                    登录
                  </Button>
                </Stack>
              </form>
            </Tabs.Panel>

            <Tabs.Panel className="github-gate-tabs__panel" value="register" pt="md">
              <form
                aria-label="邮箱验证码注册"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleRegistration()
                }}
              >
                <Stack className="github-gate-register-form" gap="sm">
                  <TextInput
                    className="github-gate-register-email"
                    label="注册邮箱"
                    placeholder="name@example.com"
                    value={registrationEmail}
                    onChange={(event) => setRegistrationEmail(event.currentTarget.value)}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    rightSection={(
                      <Button
                        className="github-gate-register-code-send"
                        type="button"
                        size="xs"
                        variant="subtle"
                        loading={codeSendLoading}
                        disabled={codeSendLoading || codeCooldownSeconds > 0}
                        aria-label={codeCooldownSeconds > 0
                          ? `${codeCooldownSeconds} 秒后可重新获取验证码`
                          : '获取验证码'}
                        onClick={() => void handleCodeRequest()}
                        style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                      >
                        {codeCooldownSeconds > 0 ? `${codeCooldownSeconds} 秒` : '获取验证码'}
                      </Button>
                    )}
                    rightSectionWidth={116}
                    rightSectionPointerEvents="all"
                  />
                  <TextInput
                    ref={registrationCodeInputRef}
                    className="github-gate-register-code"
                    label="邮箱验证码"
                    placeholder="6 位验证码"
                    value={registrationCode}
                    onChange={(event) => setRegistrationCode(event.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                  />
                  <PasswordInput
                    className="github-gate-register-password"
                    label="注册密码"
                    placeholder="8–128 位密码"
                    value={registrationPassword}
                    onChange={(event) => setRegistrationPassword(event.currentTarget.value)}
                    autoComplete="new-password"
                    visible={registrationPasswordVisible}
                    onVisibilityChange={setRegistrationPasswordVisible}
                    visibilityToggleButtonProps={{
                      'aria-label': registrationPasswordVisible ? '隐藏注册密码' : '显示注册密码',
                    }}
                  />
                  <PasswordInput
                    className="github-gate-register-confirm-password"
                    label="确认密码"
                    placeholder="再次输入注册密码"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                    autoComplete="new-password"
                    visible={confirmPasswordVisible}
                    onVisibilityChange={setConfirmPasswordVisible}
                    visibilityToggleButtonProps={{
                      'aria-label': confirmPasswordVisible ? '隐藏确认密码' : '显示确认密码',
                    }}
                  />
                  <Button
                    className="github-gate-register-submit"
                    fullWidth
                    type="submit"
                    loading={registrationLoading}
                    disabled={registrationLoading}
                    style={{ fontSize: 13 }}
                  >
                    创建账号
                  </Button>
                  <Text className="github-gate-register-hint" size="xs" c="dimmed" style={{ fontSize: 12, lineHeight: 1.5 }}>
                    验证码 10 分钟内有效，仅用于验证当前注册邮箱。
                  </Text>
                </Stack>
              </form>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </PanelCard>
    </div>
  )
}
