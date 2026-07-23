import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test'

const AUTH_PATH = '/studio?email-auth-e2e=1'
const TEST_EMAIL = 'creator@example.com'
const TEST_PASSWORD = 'password123'
const VALID_CODE = '123456'
const INVALID_CODE = '000000'
const FIXED_TIMESTAMP = '2026-07-13T00:00:00.000Z'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const

const TEST_USER = {
  sub: 'email-auth-e2e-user',
  login: 'creator',
  name: '邮箱创作者',
  email: TEST_EMAIL,
  phone: null,
  hasPassword: true,
  role: 'member',
  guest: false,
}

type RuntimeDiagnostics = {
  pageErrors: string[]
  consoleErrors: string[]
  failedLocalAssets: string[]
  unknownApiRequests: string[]
  unknownAuthApiRequests: string[]
  expectedAuthFailures: string[]
}

type AuthFixtureState = {
  registrationCodeRequests: Array<Record<string, unknown>>
  registrationRequests: Array<Record<string, unknown>>
  passwordLoginRequests: Array<Record<string, unknown>>
}

function encodeJwtSegment(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

function buildTestToken(): string {
  return `${encodeJwtSegment({ alg: 'none', typ: 'JWT' })}.${encodeJwtSegment(TEST_USER)}.email-e2e`
}

function corsHeaders(requestOrigin: string | undefined): Record<string, string> {
  return {
    'access-control-allow-origin': requestOrigin || 'http://127.0.0.1:4173',
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'authorization, content-type, accept, x-requested-with',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'cache-control': 'no-store',
  }
}

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    headers: {
      ...corsHeaders(route.request().headers().origin),
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })
}

function normalizeApiPath(url: URL): string {
  return url.pathname.startsWith('/api/') ? url.pathname.slice(4) : url.pathname
}

function readJsonBody(route: Route): Record<string, unknown> {
  try {
    const body = route.request().postDataJSON()
    return body && typeof body === 'object' ? body as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

async function handleApiRoute(
  route: Route,
  diagnostics: RuntimeDiagnostics,
  authState: AuthFixtureState,
): Promise<void> {
  const request = route.request()
  const method = request.method().toUpperCase()
  const url = new URL(request.url())
  const pathname = normalizeApiPath(url)

  if (method === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: corsHeaders(request.headers().origin) })
    return
  }

  if (pathname.startsWith('/auth/')) {
    if (method === 'POST' && pathname === '/auth/email/register/request') {
      const body = readJsonBody(route)
      authState.registrationCodeRequests.push(body)
      await fulfillJson(route, {
        sent: true,
        expiresInSeconds: 600,
        retryAfterSeconds: 60,
        devCode: VALID_CODE,
        delivery: 'debug',
      })
      return
    }

    if (method === 'POST' && pathname === '/auth/email/register/verify') {
      const body = readJsonBody(route)
      authState.registrationRequests.push(body)
      if (body.code !== VALID_CODE) {
        await fulfillJson(route, {
          error: '验证码无效或已过期',
          code: 'email_code_invalid',
        }, 401)
        return
      }
      await fulfillJson(route, { token: buildTestToken(), user: TEST_USER })
      return
    }

    if (method === 'POST' && pathname === '/auth/email/password-login') {
      const body = readJsonBody(route)
      authState.passwordLoginRequests.push(body)
      if (body.email !== TEST_EMAIL || body.password !== TEST_PASSWORD) {
        await fulfillJson(route, {
          error: '邮箱或密码不正确',
          code: 'email_password_invalid',
        }, 401)
        return
      }
      await fulfillJson(route, { token: buildTestToken(), user: TEST_USER })
      return
    }

    diagnostics.unknownAuthApiRequests.push(`${method} ${pathname}${url.search}`)
    await fulfillJson(route, { error: 'Unhandled email auth E2E endpoint', method, pathname }, 501)
    return
  }

  if (method === 'GET' && pathname === '/projects') {
    await fulfillJson(route, [{
      id: 'email-auth-project',
      name: '邮箱认证回归项目',
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
      isPublic: false,
      owner: TEST_USER.sub,
      ownerName: TEST_USER.name,
    }])
    return
  }

  if (method === 'GET' && pathname === '/flows') {
    await fulfillJson(route, [{
      id: 'email-auth-flow',
      name: '邮箱认证回归工作流',
      ownerType: 'project',
      ownerId: 'email-auth-project',
      data: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    }])
    return
  }

  if (method === 'GET' && pathname === '/teams/me') {
    await fulfillJson(route, {
      team: {
        id: 'email-auth-team',
        name: 'Email Auth E2E Team',
        credits: 100,
        creditsFrozen: 0,
        creditsAvailable: 100,
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
      },
      role: 'member',
    })
    return
  }

  if (
    method === 'GET'
    && [
      '/commerce/recharge/packages',
      '/model-catalog/vendors',
      '/model-catalog/models',
      '/agents/skills',
      '/assets/books',
    ].includes(pathname)
  ) {
    await fulfillJson(route, [])
    return
  }

  if (method === 'GET' && pathname === '/assets') {
    await fulfillJson(route, { items: [], cursor: null })
    return
  }

  if (method === 'GET' && pathname === '/assets/books/upload/jobs/latest') {
    await fulfillJson(route, { job: null })
    return
  }

  if (method === 'POST' && pathname === '/memory/context') {
    await fulfillJson(route, {
      context: {
        userPreferences: [],
        projectFacts: [],
        bookFacts: [],
        chapterFacts: [],
        artifactRefs: [],
        rollups: {
          user: [],
          project: [],
          book: [],
          chapter: [],
          session: [],
        },
        recentConversation: [],
      },
      summaryText: '',
      promptText: '',
    })
    return
  }

  if (
    (method === 'GET' && (pathname === '/tasks/stream' || pathname === '/agents/tasks/stream'))
    || (method === 'POST' && pathname === '/public/agents/chat')
  ) {
    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders(request.headers().origin),
        'content-type': 'text/event-stream; charset=utf-8',
      },
      body: ': email auth e2e\n\n',
    })
    return
  }

  diagnostics.unknownApiRequests.push(`${method} ${pathname}${url.search}`)
  await fulfillJson(route, { error: 'Unhandled email auth E2E API fixture', method, pathname }, 501)
}

async function installEmailAuthFixtures(page: Page): Promise<{
  diagnostics: RuntimeDiagnostics
  authState: AuthFixtureState
}> {
  const diagnostics: RuntimeDiagnostics = {
    pageErrors: [],
    consoleErrors: [],
    failedLocalAssets: [],
    unknownApiRequests: [],
    unknownAuthApiRequests: [],
    expectedAuthFailures: [],
  }
  const authState: AuthFixtureState = {
    registrationCodeRequests: [],
    registrationRequests: [],
    passwordLoginRequests: [],
  }

  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.consoleErrors.push(message.text())
  })
  page.on('requestfailed', (request) => {
    const url = new URL(request.url())
    if (url.origin === 'http://127.0.0.1:4173' && !url.pathname.startsWith('/api/')) {
      const failureText = request.failure()?.errorText || 'failed'
      if (url.pathname === '/logo.png' && failureText === 'net::ERR_ABORTED') return
      diagnostics.failedLocalAssets.push(`${request.method()} ${url.pathname}: ${failureText}`)
    }
  })
  page.on('response', (response) => {
    const url = new URL(response.url())
    const apiPath = normalizeApiPath(url)
    if (apiPath === '/auth/email/register/verify' && response.status() === 401) {
      diagnostics.expectedAuthFailures.push(`${response.request().method()} ${apiPath}: HTTP 401`)
      return
    }
    if (
      url.origin === 'http://127.0.0.1:4173'
      && !url.pathname.startsWith('/api/')
      && response.status() >= 400
    ) {
      diagnostics.failedLocalAssets.push(`${response.request().method()} ${url.pathname}: HTTP ${response.status()}`)
    }
  })

  await page.addInitScript((userId) => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    window.localStorage.setItem('tapcanvas-color-scheme', 'dark')
    window.localStorage.setItem('tapcanvas-language', 'zh')
    window.localStorage.setItem(`tapcanvas-feature-tour-seen:v2:${userId}`, '1')
  }, TEST_USER.sub)

  const routeHandler = (route: Route) => handleApiRoute(route, diagnostics, authState)
  await page.route('http://localhost:8788/**', routeHandler)
  await page.route('http://127.0.0.1:8788/**', routeHandler)
  await page.route('http://127.0.0.1:4173/api/**', routeHandler)

  return { diagnostics, authState }
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(
    () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    { message: 'Email authentication page must not overflow horizontally' },
  ).toBe(true)
}

async function expectKeyboardFocusVisible(page: Page): Promise<void> {
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await page.keyboard.press('Tab')
  const focusState = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null
    if (!active) return { insideGate: false, focusVisible: false, ringVisible: false, label: '' }
    const style = getComputedStyle(active)
    return {
      insideGate: Boolean(active.closest('.github-gate')),
      focusVisible: active.matches(':focus-visible'),
      ringVisible: style.outlineStyle !== 'none' || style.boxShadow !== 'none',
      label: active.getAttribute('aria-label') || active.textContent?.trim() || active.tagName,
    }
  })
  expect(focusState.insideGate, `Keyboard focus escaped the email gate: ${JSON.stringify(focusState)}`).toBe(true)
  expect(focusState.focusVisible, `Focused control is not :focus-visible: ${JSON.stringify(focusState)}`).toBe(true)
  expect(focusState.ringVisible, `Focused control has no visible ring: ${JSON.stringify(focusState)}`).toBe(true)
}

async function clearAuthenticatedSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.localStorage.removeItem('tap_token')
    window.localStorage.removeItem('tap_user')
    document.cookie = 'tap_token=; Path=/; Max-Age=0; SameSite=Lax'
  })
}

async function captureScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  width: number,
  height: number,
): Promise<void> {
  await page.screenshot({
    path: testInfo.outputPath(`email-auth-${name}-${width}x${height}.png`),
    animations: 'disabled',
  })
}

async function assertDiagnosticsClean(page: Page, diagnostics: RuntimeDiagnostics): Promise<void> {
  await page.waitForTimeout(300)
  const expectedNetworkConsoleErrors = diagnostics.consoleErrors.filter((message) => (
    message === 'Failed to load resource: the server responded with a status of 401 (Unauthorized)'
  ))
  const unexpectedConsoleErrors = diagnostics.consoleErrors.filter((message) => !expectedNetworkConsoleErrors.includes(message))
  expect(diagnostics.unknownAuthApiRequests, 'Every email auth endpoint must have an explicit fixture').toEqual([])
  expect(diagnostics.unknownApiRequests, 'Every post-auth API request must have an explicit fixture').toEqual([])
  expect(diagnostics.expectedAuthFailures).toEqual(['POST /auth/email/register/verify: HTTP 401'])
  expect(expectedNetworkConsoleErrors).toHaveLength(1)
  expect(diagnostics.pageErrors).toEqual([])
  expect(unexpectedConsoleErrors).toEqual([])
  expect(diagnostics.failedLocalAssets).toEqual([])
}

test.describe('email authentication regression', () => {
  test.describe.configure({ timeout: 90_000 })

  for (const viewport of VIEWPORTS) {
    test(`email registration and login are stable at ${viewport.name}`, async ({ page }, testInfo) => {
      const { diagnostics, authState } = await installEmailAuthFixtures(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(AUTH_PATH)

      await expect(page.getByRole('heading', { level: 4, name: '登录 TapCanvas' })).toBeVisible()
      const loginTab = page.getByRole('tab', { name: '登录' })
      const registerTab = page.getByRole('tab', { name: '注册' })
      await expect(loginTab).toHaveAttribute('aria-selected', 'true')
      await expect(registerTab).toBeVisible()
      await expect(page.getByText(/GitHub/i)).toHaveCount(0)
      await expect(page.getByText(/手机|手机号/)).toHaveCount(0)
      await expect(page.getByRole('textbox', { name: /手机|手机号/ })).toHaveCount(0)
      await expect(page.locator('.app-header-overlay')).toHaveCount(0)
      await expect(page.getByRole('navigation', { name: 'Studio 主导航' })).toHaveCount(0)

      const loginEmail = page.getByRole('textbox', { name: '登录邮箱' })
      const loginPassword = page.getByRole('textbox', { name: '登录密码', exact: true })
      await expect(loginEmail).toHaveAttribute('type', 'email')
      await expect(loginEmail).toHaveAttribute('autocomplete', 'email')
      await expect(loginPassword).toHaveAttribute('autocomplete', 'current-password')
      await expect(page.getByRole('button', { name: '显示登录密码' })).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectKeyboardFocusVisible(page)
      await captureScreenshot(page, testInfo, 'login', viewport.width, viewport.height)

      await loginEmail.fill('not-an-email')
      await loginPassword.fill(TEST_PASSWORD)
      await page.getByRole('button', { name: '登录', exact: true }).click()
      await expect(page.getByText('请输入有效的邮箱地址')).toBeVisible()
      expect(authState.passwordLoginRequests).toEqual([])

      await registerTab.click()
      await expect(registerTab).toHaveAttribute('aria-selected', 'true')
      const registrationEmail = page.getByRole('textbox', { name: '注册邮箱' })
      const registrationCode = page.getByRole('textbox', { name: '邮箱验证码' })
      const registrationPassword = page.getByRole('textbox', { name: '注册密码', exact: true })
      const confirmPassword = page.getByRole('textbox', { name: '确认密码', exact: true })
      await expect(registrationEmail).toHaveAttribute('type', 'email')
      await expect(registrationEmail).toHaveAttribute('autocomplete', 'email')
      await expect(registrationCode).toHaveAttribute('maxlength', '6')
      await expect(registrationPassword).toHaveAttribute('autocomplete', 'new-password')
      await expect(confirmPassword).toHaveAttribute('autocomplete', 'new-password')

      await registrationEmail.fill(' Creator@Example.COM ')
      await page.getByRole('button', { name: '获取验证码' }).click()
      await expect.poll(() => authState.registrationCodeRequests.length).toBe(1)
      expect(authState.registrationCodeRequests[0]).toEqual({ email: TEST_EMAIL })
      await expect(registrationCode).toHaveValue(VALID_CODE)
      await expect(registrationCode).toBeFocused()
      await expect(page.getByText('开发环境验证码已自动填入')).toBeVisible()
      await expect(page.getByRole('button', { name: '60 秒后可重新获取验证码' })).toBeDisabled()

      await registrationPassword.fill(TEST_PASSWORD)
      await confirmPassword.fill('different123')
      await page.getByRole('button', { name: '创建账号' }).click()
      await expect(page.getByText('两次输入的密码不一致')).toBeVisible()
      expect(authState.registrationRequests).toEqual([])

      await registrationCode.fill(INVALID_CODE)
      await confirmPassword.fill(TEST_PASSWORD)
      await page.getByRole('button', { name: '创建账号' }).click()
      await expect.poll(() => authState.registrationRequests.length).toBe(1)
      await expect(page.getByText('验证码无效或已过期')).toBeVisible()
      await expect(registrationEmail).toHaveValue('Creator@Example.COM')
      await expect(registrationCode).toHaveValue(INVALID_CODE)
      await expect(registrationPassword).toHaveValue(TEST_PASSWORD)
      await expect(confirmPassword).toHaveValue(TEST_PASSWORD)
      await expect(page.locator('.mantine-Notifications-notification:visible')).toHaveCount(1)
      await expectNoHorizontalOverflow(page)
      await captureScreenshot(page, testInfo, 'register-error', viewport.width, viewport.height)

      await registrationCode.fill(VALID_CODE)
      await page.getByRole('button', { name: '创建账号' }).click()
      await expect.poll(() => authState.registrationRequests.length).toBe(2)
      expect(authState.registrationRequests[1]).toEqual({
        email: TEST_EMAIL,
        code: VALID_CODE,
        password: TEST_PASSWORD,
      })
      await expect(page.locator('.react-flow')).toBeVisible()

      await clearAuthenticatedSession(page)
      await page.reload()
      await expect(loginTab).toHaveAttribute('aria-selected', 'true')
      await page.getByRole('textbox', { name: '登录邮箱' }).fill(' Creator@Example.COM ')
      await page.getByRole('textbox', { name: '登录密码', exact: true }).fill(TEST_PASSWORD)
      await page.getByRole('button', { name: '登录', exact: true }).click()
      await expect.poll(() => authState.passwordLoginRequests.length).toBe(1)
      expect(authState.passwordLoginRequests[0]).toEqual({ email: TEST_EMAIL, password: TEST_PASSWORD })
      await expect(page.locator('.react-flow')).toBeVisible()
      await expectNoHorizontalOverflow(page)

      await assertDiagnosticsClean(page, diagnostics)
    })
  }
})
