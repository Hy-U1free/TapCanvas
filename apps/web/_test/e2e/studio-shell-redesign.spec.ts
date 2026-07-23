import { expect, test, type Locator, type Page, type Route, type TestInfo } from '@playwright/test'

const STUDIO_PATH = '/studio?projectId=project-e2e'
const CHAT_PREFERENCE_KEY = 'tapcanvas.aiChat.layoutPreference.v1'
const CHAT_SESSION_KEY = 'tapcanvas.aiChat.sessionBaseKey.v1'
const TEST_USER = {
  sub: 'studio-e2e-user',
  login: 'studio-e2e',
  name: 'Studio E2E',
  hasPassword: true,
  role: 'member',
  guest: false,
}

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'compact-desktop', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
] as const

type LayoutBox = {
  x: number
  y: number
  width: number
  height: number
}

type RuntimeDiagnostics = {
  pageErrors: string[]
  consoleErrors: string[]
  failedLocalAssets: string[]
  unknownApiRequests: string[]
}

type ContrastResult = {
  ratio: number
  foreground: string
  background: string
}

const FIXED_TIMESTAMP = '2026-07-13T00:00:00.000Z'

function encodeJwtSegment(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

function buildTestToken(user: typeof TEST_USER = TEST_USER): string {
  return `${encodeJwtSegment({ alg: 'none', typ: 'JWT' })}.${encodeJwtSegment(user)}.e2e`
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
  const headers = corsHeaders(route.request().headers().origin)
  await route.fulfill({
    status,
    headers: {
      ...headers,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })
}

function normalizeApiPath(url: URL): string {
  return url.pathname.startsWith('/api/') ? url.pathname.slice(4) : url.pathname
}

async function handleApiRoute(route: Route, unknownApiRequests: string[]): Promise<void> {
  const request = route.request()
  const method = request.method().toUpperCase()
  const url = new URL(request.url())
  const pathname = normalizeApiPath(url)

  if (method === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: corsHeaders(request.headers().origin) })
    return
  }

  if (method === 'GET' && pathname === '/projects') {
    await fulfillJson(route, [{
      id: 'project-e2e',
      name: 'Studio 回归项目',
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
      isPublic: false,
      owner: TEST_USER.sub,
      ownerName: TEST_USER.name,
    }])
    return
  }

  if (method === 'GET' && pathname === '/projects/public') {
    await fulfillJson(route, [])
    return
  }

  if (method === 'GET' && pathname === '/projects/project-e2e/chapters') {
    await fulfillJson(route, {
      items: [{
        id: 'chapter-e2e',
        projectId: 'project-e2e',
        index: 1,
        title: 'Chapter 1',
        summary: 'A chapter fixture for routed surface checks.',
        status: 'draft',
        sortOrder: 0,
        lastWorkedAt: FIXED_TIMESTAMP,
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
      }],
    })
    return
  }

  if (method === 'GET' && pathname === '/stats') {
    await fulfillJson(route, { onlineUsers: 7, totalUsers: 128, newUsersToday: 5 })
    return
  }

  if (method === 'GET' && pathname === '/stats/dau') {
    await fulfillJson(route, {
      days: 30,
      series: [
        { day: '2026-07-12', activeUsers: 42 },
        { day: '2026-07-13', activeUsers: 48 },
      ],
    })
    return
  }

  if (method === 'GET' && pathname === '/stats/vendors') {
    await fulfillJson(route, {
      days: 7,
      points: 60,
      vendors: [{
        vendor: 'openai',
        total: 64,
        success: 62,
        successRate: 0.96875,
        avgDurationMs: 1840,
        lastStatus: 'succeeded',
        lastAt: FIXED_TIMESTAMP,
        lastDurationMs: 1710,
        history: [{ status: 'succeeded', finishedAt: FIXED_TIMESTAMP }],
      }],
    })
    return
  }

  if (method === 'GET' && pathname === '/stats/revenue') {
    await fulfillJson(route, {
      days: 30,
      currency: 'CNY',
      totalAmountCents: 129900,
      paidOrderCount: 18,
      slices: [{ label: 'Credits', amountCents: 129900, orderCount: 18, quantity: 18, share: 1 }],
    })
    return
  }

  if (method === 'GET' && pathname === '/api-keys') {
    await fulfillJson(route, [{
      id: 'api-key-e2e',
      label: 'Production API',
      keyPrefix: 'tap_e2e',
      allowedOrigins: ['https://example.test'],
      enabled: true,
      lastUsedAt: FIXED_TIMESTAMP,
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    }])
    return
  }

  if (method === 'GET' && pathname === '/tasks/logs') {
    await fulfillJson(route, {
      items: [{
        vendor: 'openai',
        taskId: 'task-e2e',
        userId: 'studio-e2e-admin',
        userLogin: 'studio-e2e-admin',
        userName: 'Studio E2E Admin',
        taskKind: 'image',
        status: 'succeeded',
        startedAt: FIXED_TIMESTAMP,
        finishedAt: FIXED_TIMESTAMP,
        durationMs: 1710,
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
      }],
      hasMore: false,
      nextBefore: null,
    })
    return
  }

  if (method === 'GET' && pathname === '/stats/prompt-evolution/runs') {
    await fulfillJson(route, {
      items: [{
        id: 'prompt-run-e2e',
        actorUserId: 'studio-e2e-admin',
        sinceHours: 24,
        minSamples: 20,
        dryRun: false,
        action: 'ready_for_optimizer',
        metrics: { total: 64, succeeded: 62, failed: 2, successRate: 0.96875, avgDurationMs: 1840 },
        createdAt: FIXED_TIMESTAMP,
      }],
    })
    return
  }

  if (method === 'GET' && pathname === '/stats/prompt-evolution/runtime') {
    await fulfillJson(route, {
      activeRunId: 'prompt-run-e2e',
      canaryPercent: 10,
      status: 'active',
      lastAction: 'publish',
      note: 'E2E runtime fixture',
      updatedAt: FIXED_TIMESTAMP,
      updatedBy: 'studio-e2e-admin',
    })
    return
  }

  if (method === 'GET' && pathname === '/admin/agents/skills') {
    await fulfillJson(route, [{
      id: 'skill-e2e',
      key: 'storyboard-e2e',
      name: 'Storyboard E2E',
      description: 'Skill fixture for routed surface checks.',
      content: '# Storyboard E2E',
      enabled: true,
      visible: true,
      sortOrder: 1,
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    }])
    return
  }

  if (method === 'GET' && pathname === '/admin/ai/node-presets') {
    await fulfillJson(route, [{
      id: 'preset-e2e',
      title: 'Image Prompt E2E',
      type: 'image',
      prompt: 'A production image prompt fixture.',
      description: 'Preset fixture for routed surface checks.',
      scope: 'base',
      enabled: true,
      sortOrder: 1,
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    }])
    return
  }

  if (method === 'GET' && pathname === '/teams') {
    await fulfillJson(route, [{
      id: 'team-e2e',
      name: 'Studio E2E Team',
      credits: 1200,
      creditsFrozen: 120,
      creditsAvailable: 1080,
      memberCount: 6,
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    }])
    return
  }

  if (method === 'GET' && pathname === '/admin/users') {
    await fulfillJson(route, {
      items: [{
        id: 'studio-e2e-admin',
        login: 'studio-e2e-admin',
        name: 'Studio E2E Admin',
        email: 'admin@example.test',
        role: 'admin',
        guest: false,
        disabled: false,
        lastSeenAt: FIXED_TIMESTAMP,
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
        teamId: 'team-e2e',
        teamName: 'Studio E2E Team',
        teamRole: 'owner',
        teamCredits: 1200,
        teamCreditsFrozen: 120,
        teamCreditsAvailable: 1080,
      }],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    return
  }

  if (method === 'GET' && pathname === '/admin/projects') {
    await fulfillJson(route, [{
      id: 'project-e2e',
      name: 'Studio E2E Project',
      isPublic: true,
      ownerId: 'studio-e2e-admin',
      owner: 'studio-e2e-admin',
      ownerName: 'Studio E2E Admin',
      flowCount: 3,
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
      templateTitle: 'Cinematic Storyboard',
      templateDescription: 'A public project fixture.',
      templateCoverUrl: null,
    }])
    return
  }

  if (method === 'GET' && pathname === '/products') {
    await fulfillJson(route, {
      items: [{
        id: 'product-e2e',
        title: 'Creator Credits',
        subtitle: 'Production credit package',
        description: 'Credits for image and video generation.',
        currency: 'CNY',
        priceCents: 9900,
        stock: 999,
        status: 'active',
        entitlementType: 'points_topup',
        entitlementConfigJson: '{"credits":1000}',
        coverImageUrl: null,
        images: [],
        skus: [],
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
      }],
      total: 1,
      page: 1,
      size: 100,
    })
    return
  }

  if (method === 'GET' && pathname === '/orders') {
    await fulfillJson(route, {
      items: [{
        id: 'order-e2e',
        ownerId: 'studio-e2e-admin',
        merchantId: 'tapcanvas',
        orderNo: 'TC202607130001',
        status: 'paid',
        paymentStatus: 'paid',
        currency: 'CNY',
        totalAmountCents: 9900,
        paidAmountCents: 9900,
        refundAmountCents: 0,
        refundStatus: null,
        refundReason: null,
        buyerNote: null,
        paidAt: FIXED_TIMESTAMP,
        canceledAt: null,
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
        items: [],
      }],
      total: 1,
      page: 1,
      size: 100,
    })
    return
  }

  if (method === 'GET' && pathname === '/flows') {
    await fulfillJson(route, [{
      id: 'flow-e2e',
      name: 'Studio 回归工作流',
      ownerType: 'project',
      ownerId: 'project-e2e',
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

  if (method === 'GET' && pathname === '/flows/flow-e2e') {
    await fulfillJson(route, {
      id: 'flow-e2e',
      name: 'Studio 回归工作流',
      ownerType: 'project',
      ownerId: 'project-e2e',
      data: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    })
    return
  }

  if (method === 'GET' && pathname === '/flows/flow-e2e/versions') {
    await fulfillJson(route, [])
    return
  }

  if (method === 'GET' && pathname === '/teams/me') {
    await fulfillJson(route, {
      team: {
        id: 'team-e2e',
        name: 'Studio E2E Team',
        credits: 1200,
        creditsFrozen: 0,
        creditsAvailable: 1200,
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

  if (method === 'GET' && pathname === '/assets/public') {
    await fulfillJson(route, [])
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
      body: ': e2e\n\n',
    })
    return
  }

  unknownApiRequests.push(`${method} ${pathname}${url.search}`)
  await fulfillJson(route, { error: 'Unhandled E2E API fixture', method, pathname }, 501)
}

async function installAuthenticatedFixtures(
  page: Page,
  cachedUser: typeof TEST_USER = TEST_USER,
): Promise<RuntimeDiagnostics> {
  const diagnostics: RuntimeDiagnostics = {
    pageErrors: [],
    consoleErrors: [],
    failedLocalAssets: [],
    unknownApiRequests: [],
  }
  const token = buildTestToken(cachedUser)

  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.consoleErrors.push(message.text())
  })
  page.on('requestfailed', (request) => {
    const url = new URL(request.url())
    if (url.origin === 'http://127.0.0.1:4173' && !url.pathname.startsWith('/api/')) {
      diagnostics.failedLocalAssets.push(`${request.method()} ${url.pathname}: ${request.failure()?.errorText || 'failed'}`)
    }
  })
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (
      url.origin === 'http://127.0.0.1:4173'
      && !url.pathname.startsWith('/api/')
      && response.status() >= 400
    ) {
      diagnostics.failedLocalAssets.push(`${response.request().method()} ${url.pathname}: HTTP ${response.status()}`)
    }
  })

  await page.addInitScript(({ cachedUser, cachedToken, chatPreferenceKey, chatSessionKey }) => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    const requestedMode = new URL(window.location.href).searchParams.get('__e2eChatMode') === 'expanded'
      ? 'expanded'
      : 'compact'
    window.localStorage.setItem('tap_token', cachedToken)
    window.localStorage.setItem('tap_user', JSON.stringify(cachedUser))
    window.localStorage.setItem(`tapcanvas-feature-tour-seen:v2:${cachedUser.sub}`, '1')
    window.localStorage.setItem(`tapcanvas-project-manager-tour:v2:${cachedUser.sub}`, '1')
    window.localStorage.setItem(chatPreferenceKey, JSON.stringify({ dockRight: true, mode: requestedMode }))
    window.localStorage.setItem(chatSessionKey, 'studio-e2e-session-base')
    window.localStorage.setItem('tapcanvas-language', 'zh')
    window.localStorage.setItem('tapcanvas-color-scheme', 'dark')

    const observedChatModes: string[] = []
    const observedHeaderCompactStates: string[] = []
    const e2eWindow = window as Window & {
      __studioE2EObservedChatModes?: string[]
      __studioE2EObservedHeaderCompactStates?: string[]
    }
    e2eWindow.__studioE2EObservedChatModes = observedChatModes
    e2eWindow.__studioE2EObservedHeaderCompactStates = observedHeaderCompactStates
    const nativeSetAttribute = Element.prototype.setAttribute
    Element.prototype.setAttribute = function setAttribute(name: string, value: string) {
      if (name === 'data-chat-mode' && observedChatModes[observedChatModes.length - 1] !== String(value)) {
        observedChatModes.push(String(value))
      }
      if (name === 'data-compact' && observedHeaderCompactStates[observedHeaderCompactStates.length - 1] !== String(value)) {
        observedHeaderCompactStates.push(String(value))
      }
      return nativeSetAttribute.call(this, name, value)
    }
    const recordPresentationState = () => {
      const mode = document.querySelector('.tc-ai-chat')?.getAttribute('data-chat-mode') || ''
      if (mode && observedChatModes[observedChatModes.length - 1] !== mode) {
        observedChatModes.push(mode)
      }
      const headerCompact = document.querySelector('[data-compact]')?.getAttribute('data-compact') || ''
      if (headerCompact && observedHeaderCompactStates[observedHeaderCompactStates.length - 1] !== headerCompact) {
        observedHeaderCompactStates.push(headerCompact)
      }
    }
    const recordFirstMountedState = () => {
      recordPresentationState()
      if (!document.querySelector('[data-compact]')) {
        window.requestAnimationFrame(recordFirstMountedState)
      }
    }
    window.requestAnimationFrame(recordFirstMountedState)
  }, {
    cachedUser,
    cachedToken: token,
    chatPreferenceKey: CHAT_PREFERENCE_KEY,
    chatSessionKey: CHAT_SESSION_KEY,
  })

  const routeHandler = (route: Route) => handleApiRoute(route, diagnostics.unknownApiRequests)
  await page.route('http://localhost:8788/**', routeHandler)
  await page.route('http://127.0.0.1:4173/api/**', routeHandler)
  return diagnostics
}

function boxesIntersect(first: LayoutBox, second: LayoutBox, tolerance = 0.5): boolean {
  return (
    first.x + tolerance < second.x + second.width
    && first.x + first.width > second.x + tolerance
    && first.y + tolerance < second.y + second.height
    && first.y + first.height > second.y + tolerance
  )
}

async function requiredBox(locator: Locator, label: string): Promise<LayoutBox> {
  const box = await locator.boundingBox()
  if (!box) throw new Error(`${label} has no visible layout bounds`)
  return box
}

async function expectBoxesDoNotIntersect(
  first: Locator,
  second: Locator,
  labels: readonly [string, string],
): Promise<void> {
  const [firstBox, secondBox] = await Promise.all([
    requiredBox(first, labels[0]),
    requiredBox(second, labels[1]),
  ])
  expect(
    boxesIntersect(firstBox, secondBox),
    `${labels[0]} intersects ${labels[1]}: ${JSON.stringify({ firstBox, secondBox })}`,
  ).toBe(false)
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(
    () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    { message: 'Studio document must not overflow horizontally' },
  ).toBe(true)
}

async function waitForRouteLandmark(page: Page, route: string): Promise<void> {
  if (route.startsWith('/studio')) {
    await expect(page.locator('.react-flow')).toBeVisible()
    return
  }

  if (route.startsWith('/projects')) {
    await expect(page.locator('.tc-pm__shell')).toBeVisible()
    return
  }

  if (route.startsWith('/tapshow')) {
    await expect(page.locator('.tapshow-fullpage')).toBeVisible()
    return
  }

  if (route.startsWith('/share')) {
    await expect(page.locator('.tc-share')).toBeVisible()
    return
  }

  if (route.startsWith('/stats')) {
    await expect(page.locator('.stats-page')).toBeVisible()
    const statsLandmarks: Record<string, string> = {
      '/stats': '.stats-page-content',
      '/stats/system': '.stats-page-system-management',
      '/stats/memory': '.stats-page-memory-management',
      '/stats/skills': '.stats-page-skill-management',
      '/stats/enterprise': '.stats-page-enterprise-management',
      '/stats/users': '.stats-page-users-management',
      '/stats/projects': '.stats-page-projects-management',
      '/stats/commerce': '.stats-page-commerce-management',
    }
    const selector = statsLandmarks[route]
    if (selector) await expect(page.locator(selector)).toBeVisible()
  }
}

async function readContrast(locator: Locator): Promise<ContrastResult> {
  return locator.evaluate((element) => {
    type Rgba = [number, number, number, number]

    const parseColor = (value: string): Rgba => {
      const matches = String(value || '').match(/[\d.]+/g)?.map(Number) || []
      if (matches.length < 3) return [0, 0, 0, 0]
      return [matches[0], matches[1], matches[2], matches.length >= 4 ? matches[3] : 1]
    }
    const composite = (foreground: Rgba, background: Rgba): Rgba => {
      const alpha = foreground[3] + background[3] * (1 - foreground[3])
      if (alpha <= 0) return [0, 0, 0, 0]
      return [
        (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
        (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
        (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
        alpha,
      ]
    }
    const channelLuminance = (channel: number): number => {
      const normalized = channel / 255
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4
    }
    const luminance = (color: Rgba): number => (
      channelLuminance(color[0]) * 0.2126
      + channelLuminance(color[1]) * 0.7152
      + channelLuminance(color[2]) * 0.0722
    )
    const format = (color: Rgba): string => `rgba(${color.map((part, index) => (
      index < 3 ? Math.round(part) : Number(part.toFixed(3))
    )).join(', ')})`

    const ancestors: Element[] = []
    let current: Element | null = element
    while (current) {
      ancestors.unshift(current)
      current = current.parentElement
    }

    let background: Rgba = [255, 255, 255, 1]
    for (const ancestor of ancestors) {
      const style = getComputedStyle(ancestor)
      background = composite(parseColor(style.backgroundColor), background)
      const backgroundImage = style.backgroundImage
      const gradientCount = backgroundImage.match(/(?:linear|radial)-gradient\(/g)?.length || 0
      if (gradientCount === 1 && backgroundImage.startsWith('linear-gradient')) {
        const stops = backgroundImage.match(/rgba?\([^)]+\)/g)?.map(parseColor) || []
        if (stops.length >= 2) {
          const ancestorBox = ancestor.getBoundingClientRect()
          const elementBox = element.getBoundingClientRect()
          const progress = ancestorBox.height > 0
            ? Math.min(1, Math.max(0, (elementBox.y + elementBox.height / 2 - ancestorBox.y) / ancestorBox.height))
            : 0.5
          const first = stops[0]
          const last = stops[stops.length - 1]
          const sampled = first.map((channel, index) => channel + (last[index] - channel) * progress) as Rgba
          background = composite(sampled, background)
        }
      }
    }
    const rawForeground = parseColor(getComputedStyle(element).color)
    const foreground = composite(rawForeground, background)
    const lighter = Math.max(luminance(foreground), luminance(background))
    const darker = Math.min(luminance(foreground), luminance(background))
    return {
      ratio: (lighter + 0.05) / (darker + 0.05),
      foreground: format(foreground),
      background: format(background),
    }
  })
}

async function expectContrastAtLeast(locator: Locator, label: string, minimum = 4.5): Promise<void> {
  await expect(locator, `${label} must be visible before measuring contrast`).toBeVisible()
  const result = await readContrast(locator)
  expect(
    result.ratio,
    `${label} contrast ${result.ratio.toFixed(2)}:1 from ${result.foreground} on ${result.background}`,
  ).toBeGreaterThanOrEqual(minimum)
}

async function readControlsInteractiveLabel(button: Locator): Promise<string> {
  return button.evaluate((element) => {
    const content = getComputedStyle(element, '::after').content
    return String(content || '').replace(/^['"]|['"]$/g, '').trim()
  })
}

async function exerciseControlsInteractiveToggle(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: '锁定或解锁画布' })
  await expect(button).toBeVisible()
  await expect(button).toBeEnabled()
  const initialLabel = await readControlsInteractiveLabel(button)
  expect(initialLabel).toBe('锁定 / 解锁')

  await button.click()
  await expect(button).toBeVisible()
  await expect(button).toBeEnabled()
  await expect.poll(() => readControlsInteractiveLabel(button)).toBe('锁定 / 解锁')

  await button.click()
  await expect(button).toBeVisible()
  await expect(button).toBeEnabled()
  await expect.poll(() => readControlsInteractiveLabel(button)).toBe('锁定 / 解锁')
}

async function readFixedContainingBlock(page: Page): Promise<{ width: number; height: number }> {
  return page.evaluate(() => ({
    width: document.body.clientWidth,
    height: document.body.clientHeight,
  }))
}

async function expectCompactChatGeometry(page: Page): Promise<void> {
  const chat = page.locator('.tc-ai-chat')
  await expect(chat).toHaveAttribute('data-chat-mode', 'compact')
  await expect(chat).toHaveClass(/tc-ai-chat--compact/)
  await expect.poll(async () => (await chat.boundingBox())?.width || 0).toBeCloseTo(60, 0)
  await expect.poll(async () => (await chat.boundingBox())?.height || 0).toBeCloseTo(60, 0)
  const box = await requiredBox(chat, 'compact Chat')
  const containingBlock = await readFixedContainingBlock(page)
  await expect(chat).toHaveCSS('right', '12px')
  await expect(chat).toHaveCSS('bottom', '12px')
  expect(box.width).toBeCloseTo(60, 0)
  expect(box.height).toBeCloseTo(60, 0)
  expect(containingBlock.width - (box.x + box.width)).toBeCloseTo(12, 0)
  expect(containingBlock.height - (box.y + box.height)).toBeCloseTo(12, 0)
  await expect(page.getByRole('button', { name: '展开 AI 对话' })).toBeVisible()
  await expect(page.locator('.tc-ai-chat__bubble-label')).toHaveText('AI')
}

async function expectExpandedChatGeometry(page: Page, expectedWidth: number): Promise<void> {
  const chat = page.locator('.tc-ai-chat')
  await expect(chat).toHaveAttribute('data-chat-mode', 'expanded')
  await expect(chat).toHaveClass(/tc-ai-chat--expanded/)
  await expect.poll(async () => (await chat.boundingBox())?.width || 0).toBeCloseTo(expectedWidth, 0)
  const box = await requiredBox(chat, 'expanded Chat')
  const containingBlock = await readFixedContainingBlock(page)
  await expect(chat).toHaveCSS('right', '12px')
  await expect(chat).toHaveCSS('top', '0px')
  await expect(chat).toHaveCSS('bottom', '0px')
  expect(box.width).toBeCloseTo(expectedWidth, 0)
  expect(box.y).toBeCloseTo(0, 0)
  expect(containingBlock.width - (box.x + box.width)).toBeCloseTo(12, 0)
  expect(box.y + box.height).toBeCloseTo(containingBlock.height, 0)
}

async function expectMaximizedChatGeometry(page: Page): Promise<void> {
  const chat = page.locator('.tc-ai-chat')
  await expect(chat).toHaveAttribute('data-chat-mode', 'maximized')
  await expect(chat).toHaveClass(/tc-ai-chat--maximized/)
  await expect(chat).toHaveAttribute('role', 'dialog')
  await expect(chat).toHaveAttribute('aria-modal', 'true')
  await expect(page.locator('.tc-ai-chat__backdrop')).toBeVisible()
  const browserViewport = page.viewportSize()!
  const containingBlock = await readFixedContainingBlock(page)
  const expectedWidth = Math.min(1040, containingBlock.width - 32)
  const expectedHeight = Math.min(860, containingBlock.height - 32)
  await expect.poll(async () => (await chat.boundingBox())?.width || 0).toBeCloseTo(expectedWidth, 0)
  await expect.poll(async () => (await chat.boundingBox())?.height || 0).toBeCloseTo(expectedHeight, 0)
  const box = await requiredBox(chat, 'maximized Chat')
  expect(box.width).toBeLessThanOrEqual(1040.5)
  expect(box.height).toBeLessThanOrEqual(860.5)
  expect(box.x).toBeGreaterThanOrEqual(15.5)
  expect(box.y).toBeGreaterThanOrEqual(15.5)
  expect(browserViewport.width - (box.x + box.width)).toBeGreaterThanOrEqual(15.5)
  expect(browserViewport.height - (box.y + box.height)).toBeGreaterThanOrEqual(15.5)

  if (browserViewport.width <= 720) {
    const commandNames = ['新对话', '教程', '退出聚焦', '关闭'] as const
    const commandBoxes: Array<{ name: string; box: LayoutBox }> = []
    for (const name of commandNames) {
      const command = chat.getByRole('button', { name })
      await expect(command).toBeVisible()
      const commandBox = await requiredBox(command, `mobile Chat command ${name}`)
      expect(commandBox.x).toBeGreaterThanOrEqual(box.x - 0.5)
      expect(commandBox.y).toBeGreaterThanOrEqual(box.y - 0.5)
      expect(commandBox.x + commandBox.width).toBeLessThanOrEqual(box.x + box.width + 0.5)
      expect(commandBox.y + commandBox.height).toBeLessThanOrEqual(box.y + box.height + 0.5)
      commandBoxes.push({ name, box: commandBox })
    }
    for (let firstIndex = 0; firstIndex < commandBoxes.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < commandBoxes.length; secondIndex += 1) {
        const first = commandBoxes[firstIndex]
        const second = commandBoxes[secondIndex]
        expect(
          boxesIntersect(first.box, second.box),
          `Mobile Chat commands ${first.name} and ${second.name} overlap`,
        ).toBe(false)
      }
    }
    await expectNoHorizontalOverflow(page)
  }
}

async function expectFocusInsideChatOrModal(page: Page, label: string): Promise<void> {
  let lastFocusState = { contained: false, host: 'unknown' }
  await expect.poll(async () => {
    lastFocusState = await page.evaluate(() => {
      const active = document.activeElement
      const chat = document.querySelector('.tc-ai-chat[data-chat-mode="maximized"]')
      if (active && chat?.contains(active)) return { contained: true, host: 'chat' }

      const visibleModal = Array.from(document.querySelectorAll('[role="dialog"]')).find((element) => {
        if (element === chat) return false
        const style = getComputedStyle(element)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
      if (active && visibleModal?.contains(active)) return { contained: true, host: 'modal' }
      return {
        contained: false,
        host: active instanceof HTMLElement
          ? `${active.tagName.toLowerCase()}${active.className ? `.${String(active.className).replace(/\s+/g, '.')}` : ''}`
          : 'none',
      }
    })
    return lastFocusState.contained
  }, { message: `${label}: focus escaped the maximized Chat` }).toBe(true)
  expect(lastFocusState.contained, `${label}: focus escaped to ${lastFocusState.host}`).toBe(true)
}

async function assertMaximizedKeyboardAndTutorial(page: Page): Promise<void> {
  const chat = page.locator('.tc-ai-chat[data-chat-mode="maximized"]')
  const input = chat.getByPlaceholder('请输入你的设计需求')
  await input.focus()
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab')
    await expectFocusInsideChatOrModal(page, `forward Tab ${index + 1}`)
  }

  await chat.getByRole('button', { name: '新对话' }).focus()
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Shift+Tab')
    await expectFocusInsideChatOrModal(page, `reverse Tab ${index + 1}`)
  }

  await chat.getByRole('button', { name: '教程' }).click()
  const tutorial = page.getByRole('dialog', { name: 'AI 创作教程' })
  await expect(tutorial).toBeVisible()
  const tutorialBox = await requiredBox(tutorial, 'AI tutorial Modal')
  const topElementIsTutorial = await tutorial.evaluate((tutorialDialog, { x, y }) => {
    const topElement = document.elementFromPoint(x, y)
    return Boolean(topElement && tutorialDialog.contains(topElement))
  }, {
    x: tutorialBox.x + tutorialBox.width / 2,
    y: tutorialBox.y + Math.min(tutorialBox.height / 2, 120),
  })
  expect(topElementIsTutorial, 'Tutorial Modal must receive pointer events above the Chat backdrop').toBe(true)
  await expect(tutorial.getByRole('button', { name: '试试这个' }).first()).toBeVisible()

  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab')
    await expectFocusInsideChatOrModal(page, `tutorial Tab ${index + 1}`)
  }

  await page.keyboard.press('Escape')
  await expect(tutorial).not.toBeVisible()
  await expectMaximizedChatGeometry(page)
}

async function assertHeaderActions(page: Page, compactHeader: boolean): Promise<void> {
  await expect(page.getByRole('button', { name: '保存' })).toBeVisible()
  if (!compactHeader) {
    for (const name of ['导出', '展映', '主题', '语言', '帮助', '源码']) {
      await expect(page.getByRole(name === '展映' || name === '源码' ? 'link' : 'button', { name })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: '更多' })).toHaveCount(0)
    return
  }

  await page.getByRole('button', { name: '更多' }).click()
  const menuItemNames = ['AI 工作台', '积分 1200 · 充值', '导出', '展映', '主题', '语言', '帮助', '源码']
  for (const name of menuItemNames) {
    const menuItem = page.getByRole('menuitem', { name })
    await expect(menuItem).toBeVisible()
    const labelFits = await menuItem.evaluate((element) => {
      const label = element.querySelector<HTMLElement>('.mantine-Menu-itemLabel') || element as HTMLElement
      const itemBox = element.getBoundingClientRect()
      const labelBox = label.getBoundingClientRect()
      return label.scrollWidth <= label.clientWidth + 1
        && labelBox.left >= itemBox.left - 0.5
        && labelBox.right <= itemBox.right + 0.5
    })
    expect(labelFits, `Header More item ${name} must not be clipped`).toBe(true)
  }

  const dropdown = page.locator('.tc-studio-header__more-dropdown')
  const visibilityPanel = page.locator('.tc-canvas__visibility-panel')
  await expect(visibilityPanel).toBeVisible()
  const [dropdownBox, visibilityPanelBox] = await Promise.all([
    requiredBox(dropdown, 'Header More dropdown'),
    requiredBox(visibilityPanel, 'Canvas visibility panel'),
  ])
  expect(
    boxesIntersect(dropdownBox, visibilityPanelBox),
    `Header More dropdown must overlap the Canvas visibility panel in this regression: ${JSON.stringify({ dropdownBox, visibilityPanelBox })}`,
  ).toBe(true)
  const overlapPoint = {
    x: (Math.max(dropdownBox.x, visibilityPanelBox.x)
      + Math.min(dropdownBox.x + dropdownBox.width, visibilityPanelBox.x + visibilityPanelBox.width)) / 2,
    y: (Math.max(dropdownBox.y, visibilityPanelBox.y)
      + Math.min(dropdownBox.y + dropdownBox.height, visibilityPanelBox.y + visibilityPanelBox.height)) / 2,
  }
  const dropdownReceivesPointerEvents = await dropdown.evaluate((element, point) => {
    const topElement = document.elementFromPoint(point.x, point.y)
    return Boolean(topElement && element.contains(topElement))
  }, overlapPoint)
  expect(
    dropdownReceivesPointerEvents,
    `Header More dropdown must receive pointer events above the Canvas visibility panel at ${JSON.stringify(overlapPoint)}`,
  ).toBe(true)

  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
}

async function assertStudioShell(page: Page, viewport: (typeof VIEWPORTS)[number]): Promise<void> {
  await expect(page.locator('.react-flow')).toBeVisible()
  await expect(page.locator('[data-tour="canvas"]')).toBeVisible()
  await expect(page.locator('[data-tour="floating-nav"]')).toBeVisible()
  await expect(page.locator('#tc-canvas-breadcrumb-slot')).toBeAttached()
  await expect(page.locator('#tc-canvas-visibility-slot')).toBeAttached()
  await expect(page.locator('.tc-canvas__minimap')).toBeVisible()
  await expect(page.locator('.tc-canvas__controls')).toBeVisible()
  await expect(page.locator('.feature-tour')).toHaveCount(0)

  const nav = page.locator('[data-tour="floating-nav"]')
  for (const label of ['添加', '项目', '工作流', '资产', '漫剧', '展映', '运行', '历史', '账户']) {
    await expect(nav.locator('.tc-studio-nav__label', { hasText: label })).toBeVisible()
  }

  await assertHeaderActions(page, viewport.width <= 1500)
  await expectNoHorizontalOverflow(page)
  if (viewport.width === 390) {
    await expect(page.locator('[data-compact]')).toHaveAttribute('data-compact', 'true')
    const observedHeaderCompactStates = await page.evaluate(() => (
      (window as Window & { __studioE2EObservedHeaderCompactStates?: string[] }).__studioE2EObservedHeaderCompactStates || []
    ))
    expect(observedHeaderCompactStates).toContain('true')
    expect(observedHeaderCompactStates).not.toContain('false')
  }

  const minimap = page.locator('.tc-canvas__minimap')
  const controls = page.locator('.tc-canvas__controls')
  const chat = page.locator('.tc-ai-chat[data-chat-mode="compact"]')
  await expect(chat).toBeVisible()
  const [headerBox, navBox, minimapBox, controlsBox, chatBox] = await Promise.all([
    requiredBox(page.locator('.tc-studio-header'), 'Studio Header'),
    requiredBox(nav, 'floating nav'),
    requiredBox(minimap, 'MiniMap'),
    requiredBox(controls, 'Controls'),
    requiredBox(chat, 'compact Chat'),
  ])
  const expectedControlLaneLeft = viewport.height <= 800 && viewport.width > 720 ? 82 : 12
  expect(minimapBox.x).toBeCloseTo(expectedControlLaneLeft, 0)
  expect(viewport.height - (minimapBox.y + minimapBox.height)).toBeCloseTo(12, 0)
  expect(controlsBox.x).toBeCloseTo(expectedControlLaneLeft, 0)
  expect(viewport.height - (controlsBox.y + controlsBox.height)).toBeCloseTo(130, 0)
  if (viewport.width > 720) {
    expect(minimapBox.width).toBeCloseTo(160, 0)
    expect(minimapBox.height).toBeCloseTo(110, 0)
  } else {
    expect(minimapBox.width).toBeCloseTo(132, 0)
    expect(minimapBox.height).toBeCloseTo(94, 0)
  }
  expect(boxesIntersect(minimapBox, controlsBox)).toBe(false)
  expect(
    boxesIntersect(navBox, controlsBox),
    `floating nav intersects Controls: ${JSON.stringify({ navBox, controlsBox })}`,
  ).toBe(false)
  expect(
    boxesIntersect(navBox, headerBox),
    `floating nav intersects Header: ${JSON.stringify({ navBox, headerBox })}`,
  ).toBe(false)
  expect(
    boxesIntersect(controlsBox, chatBox),
    `Controls intersects compact Chat: ${JSON.stringify({ controlsBox, chatBox })}`,
  ).toBe(false)
  await exerciseControlsInteractiveToggle(page)
}

async function exerciseLightThemeContrast(page: Page, testInfo: TestInfo): Promise<void> {
  await page.getByRole('button', { name: '更多' }).click()
  await page.getByRole('menuitem', { name: '主题' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'light')

  const nav = page.locator('[data-tour="floating-nav"]')
  const navLabels = nav.locator('.tc-studio-nav__label:visible')
  for (let index = 0; index < await navLabels.count(); index += 1) {
    const label = navLabels.nth(index)
    await expectContrastAtLeast(label, `light theme nav label ${(await label.textContent())?.trim() || index + 1}`)
  }
  const projectNavItem = nav.getByRole('button', { name: '项目' })
  await projectNavItem.hover()
  await expectContrastAtLeast(
    projectNavItem.locator('.tc-studio-nav__label'),
    'light theme hovered project nav label',
  )
  await page.mouse.move(600, 300)

  await expectContrastAtLeast(page.locator('.tc-studio-header__host'), 'light theme Header description')
  await expectContrastAtLeast(page.locator('.app-project-input input'), 'light theme project input')

  await nav.getByRole('button', { name: '我的资产' }).click()
  const panel = page.locator('.asset-panel-shell')
  await expect(panel).toBeVisible()
  await expectContrastAtLeast(panel.locator('.asset-panel-section-desc').first(), 'light theme asset panel description')
  await expectContrastAtLeast(panel.locator('.asset-panel-empty').first(), 'light theme asset panel empty state')

  await page.getByRole('button', { name: '展开 AI 对话' }).click()
  await expectExpandedChatGeometry(page, 420)
  await expectContrastAtLeast(page.locator('.tc-ai-chat__empty-state-description'), 'light theme Chat description')
  await expectContrastAtLeast(page.locator('.tc-ai-chat__hint-text'), 'light theme Chat composer hint')
  await expect.poll(async () => {
    const [headerBox, chatBox] = await Promise.all([
      requiredBox(page.locator('.tc-studio-header'), 'light theme Header'),
      requiredBox(page.locator('.tc-ai-chat'), 'light theme expanded Chat'),
    ])
    return boxesIntersect(headerBox, chatBox)
  }).toBe(false)
  await expectNoHorizontalOverflow(page)

  await page.screenshot({
    path: testInfo.outputPath('studio-shell-light-1440x900.png'),
    animations: 'disabled',
  })

  await page.getByRole('button', { name: '收起' }).click()
  await expectCompactChatGeometry(page)
  await panel.getByRole('button', { name: '关闭' }).click()
  await expect(panel).not.toBeVisible()
  await page.getByRole('button', { name: '更多' }).click()
  await page.getByRole('menuitem', { name: '主题' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark')
  await expectNoHorizontalOverflow(page)
}

async function exerciseAssetPanel(page: Page, viewport: (typeof VIEWPORTS)[number]): Promise<void> {
  const nav = page.locator('[data-tour="floating-nav"]')
  await nav.getByRole('button', { name: '我的资产' }).click()
  const panelAnchor = page.locator('.asset-panel-anchor')
  const panel = page.locator('.asset-panel-shell')
  await expect(panel).toBeVisible()
  const containingBlock = await readFixedContainingBlock(page)
  const expectedPanelWidth = viewport.width > 720 ? 320 : containingBlock.width - 82 - 12
  await expect.poll(async () => (await panel.boundingBox())?.width || 0, {
    message: 'Asset panel must finish its entrance transition at the contracted width',
  }).toBeCloseTo(expectedPanelWidth, 0)

  const [navBox, panelAnchorBox, panelBox] = await Promise.all([
    requiredBox(nav, 'floating nav'),
    requiredBox(panelAnchor, 'asset panel anchor'),
    requiredBox(panel, 'asset panel'),
  ])
  expect(panelAnchorBox.x).toBeCloseTo(82, 0)
  expect(panelBox.width).toBeCloseTo(expectedPanelWidth, 0)
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(containingBlock.width + 0.5)
  expect(boxesIntersect(navBox, panelBox)).toBe(false)

  const canvasBlankPoint = await page.evaluate(() => {
    for (let y = 96; y < window.innerHeight - 24; y += 16) {
      for (let x = window.innerWidth - 20; x >= 20; x -= 16) {
        const element = document.elementFromPoint(x, y)
        if (!element?.closest('[data-tour="canvas"]')) continue
        if (element.closest('[data-ux-floating], [data-ux-panel]')) continue
        return { x, y }
      }
    }
    return null
  })
  expect(canvasBlankPoint, 'A visible blank Canvas point must remain reachable').not.toBeNull()
  if (!canvasBlankPoint) throw new Error('No reachable Canvas blank point')
  await page.mouse.click(canvasBlankPoint.x, canvasBlankPoint.y)
  await expect(panel).not.toBeVisible()
}

async function exerciseDesktopChat(page: Page, viewport: (typeof VIEWPORTS)[number]): Promise<void> {
  const expectedExpandedWidth = viewport.width >= 1500 ? 480 : viewport.width > 1200 ? 420 : 360
  const chat = page.locator('.tc-ai-chat')
  const header = page.locator('.tc-studio-header')
  const draft = `视口 ${viewport.width} 的分镜草稿`

  await expectCompactChatGeometry(page)
  await expectBoxesDoNotIntersect(header, chat, ['header', 'compact Chat'])

  await page.getByRole('button', { name: '展开 AI 对话' }).click()
  await expectExpandedChatGeometry(page, expectedExpandedWidth)
  await expectBoxesDoNotIntersect(header, chat, ['header', 'expanded Chat'])
  const input = page.getByPlaceholder('请输入你的设计需求')
  await input.fill(draft)

  await page.getByRole('button', { name: '聚焦' }).click()
  await expectMaximizedChatGeometry(page)
  await expect(page.getByPlaceholder('请输入你的设计需求')).toHaveValue(draft)
  await assertMaximizedKeyboardAndTutorial(page)
  await page.keyboard.press('Escape')
  await expectExpandedChatGeometry(page, expectedExpandedWidth)
  await expect(page.getByPlaceholder('请输入你的设计需求')).toHaveValue(draft)
  await expect(page.getByRole('button', { name: '聚焦' })).toBeFocused()

  await page.getByRole('button', { name: '聚焦' }).click()
  await expectMaximizedChatGeometry(page)
  await page.locator('.tc-ai-chat__backdrop').click({ position: { x: 4, y: 4 } })
  await expectExpandedChatGeometry(page, expectedExpandedWidth)
  await expect(page.getByPlaceholder('请输入你的设计需求')).toHaveValue(draft)
  await expect(page.getByRole('button', { name: '聚焦' })).toBeFocused()

  await page.getByRole('button', { name: '收起' }).click()
  await expectCompactChatGeometry(page)
  await page.getByRole('button', { name: '展开 AI 对话' }).click()
  await expectExpandedChatGeometry(page, expectedExpandedWidth)
  await expect(page.getByPlaceholder('请输入你的设计需求')).toHaveValue(draft)
  await page.getByRole('button', { name: '聚焦' }).click()
  await expectMaximizedChatGeometry(page)
  await page.getByRole('button', { name: '关闭' }).click()
  await expectCompactChatGeometry(page)
  await expect(page.getByRole('button', { name: '展开 AI 对话' })).toBeFocused()
  await page.getByRole('button', { name: '展开 AI 对话' }).click()
  await expectExpandedChatGeometry(page, expectedExpandedWidth)
  await expect(page.getByPlaceholder('请输入你的设计需求')).toHaveValue(draft)
  await page.getByRole('button', { name: '收起' }).click()
  await expectCompactChatGeometry(page)
}

async function exerciseMobileChat(page: Page): Promise<void> {
  const draft = '移动端聚焦草稿'
  await expectCompactChatGeometry(page)
  await page.getByRole('button', { name: '展开 AI 对话' }).click()
  await expectMaximizedChatGeometry(page)
  await page.getByPlaceholder('请输入你的设计需求').fill(draft)
  await assertMaximizedKeyboardAndTutorial(page)
  await page.getByRole('button', { name: '退出聚焦' }).click()
  await expectCompactChatGeometry(page)
  await expect(page.getByRole('button', { name: '展开 AI 对话' })).toBeFocused()

  await page.getByRole('button', { name: '展开 AI 对话' }).click()
  await expectMaximizedChatGeometry(page)
  await expect(page.getByPlaceholder('请输入你的设计需求')).toHaveValue(draft)
  await page.locator('.tc-ai-chat__backdrop').click({ position: { x: 4, y: 4 } })
  await expectCompactChatGeometry(page)
  await expect(page.getByRole('button', { name: '展开 AI 对话' })).toBeFocused()

  await page.getByRole('button', { name: '展开 AI 对话' }).click()
  await expectMaximizedChatGeometry(page)
  await expect(page.getByPlaceholder('请输入你的设计需求')).toHaveValue(draft)
  await page.keyboard.press('Escape')
  await expectCompactChatGeometry(page)
  await expect(page.getByRole('button', { name: '展开 AI 对话' })).toBeFocused()

  await page.getByRole('button', { name: '展开 AI 对话' }).click()
  await expectMaximizedChatGeometry(page)
  await expect(page.getByPlaceholder('请输入你的设计需求')).toHaveValue(draft)
  await page.getByRole('button', { name: '关闭' }).click()
  await expectCompactChatGeometry(page)
  await expect(page.getByRole('button', { name: '展开 AI 对话' })).toBeFocused()
}

async function verifyStoredExpandedMobilePresentation(page: Page): Promise<void> {
  await page.goto(`${STUDIO_PATH}&__e2eChatMode=expanded`)
  await expect(page.locator('.react-flow')).toBeVisible()
  await expectCompactChatGeometry(page)
  const observedFirstFrameModes = await page.evaluate(() => (
    (window as Window & { __studioE2EObservedChatModes?: string[] }).__studioE2EObservedChatModes || []
  ))
  expect(observedFirstFrameModes).not.toContain('expanded')
  expect(await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || '{}').mode, CHAT_PREFERENCE_KEY)).toBe('expanded')

  await page.getByRole('button', { name: '展开 AI 对话' }).click()
  await expectMaximizedChatGeometry(page)
  await page.getByRole('button', { name: '退出聚焦' }).click()
  await expectCompactChatGeometry(page)
  expect(await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || '{}').mode, CHAT_PREFERENCE_KEY)).toBe('expanded')
}

async function captureViewportScreenshot(page: Page, testInfo: TestInfo, width: number, height: number): Promise<void> {
  await page.screenshot({
    path: testInfo.outputPath(`studio-shell-${width}x${height}.png`),
    animations: 'disabled',
  })
}

async function assertNoUnexpectedRuntimeFailures(page: Page, diagnostics: RuntimeDiagnostics): Promise<void> {
  await page.waitForTimeout(300)
  expect(diagnostics.unknownApiRequests, 'Every Studio API request must have an explicit fixture').toEqual([])
  expect(diagnostics.pageErrors).toEqual([])
  expect(diagnostics.consoleErrors).toEqual([])
  expect(diagnostics.failedLocalAssets).toEqual([])
}

test.describe('authenticated Studio shell regression', () => {
  test.describe.configure({ timeout: 90_000 })

  test('persistent Studio chrome does not collide at low height', async ({ page }) => {
    const diagnostics = await installAuthenticatedFixtures(page)
    await page.setViewportSize({ width: 414, height: 371 })
    await page.goto(STUDIO_PATH)

    await expect(page.locator('.react-flow')).toBeVisible()
    await expectBoxesDoNotIntersect(
      page.locator('.app-header-overlay'),
      page.locator('[data-tour="floating-nav"]'),
      ['Header overlay', 'floating nav'],
    )
    await expectBoxesDoNotIntersect(
      page.locator('[data-tour="floating-nav"]'),
      page.locator('.tc-canvas__controls'),
      ['floating nav', 'Canvas Controls'],
    )
    await expectBoxesDoNotIntersect(
      page.locator('[data-tour="floating-nav"]'),
      page.locator('.tc-canvas__minimap'),
      ['floating nav', 'MiniMap'],
    )

    await page.getByRole('button', { name: '添加节点' }).click()
    const addNodePanel = page.locator('.app-add-node-panel')
    await expect(addNodePanel).toBeVisible()
    await expectBoxesDoNotIntersect(
      page.locator('.app-header-overlay'),
      addNodePanel,
      ['Header overlay', 'Add Node panel'],
    )
    await expectBoxesDoNotIntersect(
      addNodePanel,
      page.locator('.tc-ai-chat'),
      ['Add Node panel', 'AI Chat'],
    )

    await page.getByRole('button', { name: '账户' }).click()
    const accountPanel = page.locator('.account-panel-anchor')
    await expect(accountPanel).toBeVisible()
    await expectBoxesDoNotIntersect(
      page.locator('.app-header-overlay'),
      accountPanel,
      ['Header overlay', 'Account panel'],
    )
    await expectBoxesDoNotIntersect(
      accountPanel,
      page.locator('.tc-ai-chat'),
      ['Account panel', 'AI Chat'],
    )
    await assertNoUnexpectedRuntimeFailures(page, diagnostics)
  })

  test('header More menu stays inside and above the low mobile viewport', async ({ page }) => {
    const diagnostics = await installAuthenticatedFixtures(page)
    await page.setViewportSize({ width: 414, height: 371 })
    await page.goto(STUDIO_PATH)

    await expect(page.locator('.react-flow')).toBeVisible()
    await page.getByRole('button', { name: '更多' }).click()

    const dropdown = page.locator('.tc-studio-header__more-dropdown')
    const chat = page.locator('.tc-ai-chat')
    await expect(dropdown).toBeVisible()
    const [dropdownBox, chatBox] = await Promise.all([
      requiredBox(dropdown, 'low-height Header More dropdown'),
      requiredBox(chat, 'low-height compact Chat'),
    ])
    const viewport = page.viewportSize()!
    expect(dropdownBox.x).toBeGreaterThanOrEqual(7.5)
    expect(dropdownBox.y).toBeGreaterThanOrEqual(7.5)
    expect(dropdownBox.x + dropdownBox.width).toBeLessThanOrEqual(viewport.width - 7.5)
    expect(dropdownBox.y + dropdownBox.height).toBeLessThanOrEqual(viewport.height - 7.5)

    expect(
      boxesIntersect(dropdownBox, chatBox),
      `Header More dropdown must overlap compact Chat in this regression: ${JSON.stringify({ dropdownBox, chatBox })}`,
    ).toBe(true)
    const overlapPoint = {
      x: (Math.max(dropdownBox.x, chatBox.x) + Math.min(dropdownBox.x + dropdownBox.width, chatBox.x + chatBox.width)) / 2,
      y: (Math.max(dropdownBox.y, chatBox.y) + Math.min(dropdownBox.y + dropdownBox.height, chatBox.y + chatBox.height)) / 2,
    }
    const dropdownReceivesPointerEvents = await dropdown.evaluate((element, point) => {
      const topElement = document.elementFromPoint(point.x, point.y)
      return Boolean(topElement && element.contains(topElement))
    }, overlapPoint)
    expect(dropdownReceivesPointerEvents, 'Header More dropdown must receive pointer events above compact Chat').toBe(true)
    await assertNoUnexpectedRuntimeFailures(page, diagnostics)
  })

  test('maximized AI chat remains fully operable at low mobile height', async ({ page }) => {
    const diagnostics = await installAuthenticatedFixtures(page)
    await page.setViewportSize({ width: 414, height: 371 })
    await page.goto(STUDIO_PATH)

    await expect(page.locator('.react-flow')).toBeVisible()
    await page.locator('.tc-ai-chat__bubble-button').click()

    const chat = page.locator('.tc-ai-chat[data-chat-mode="maximized"]')
    const header = chat.locator('.tc-ai-chat__header')
    const body = chat.locator('.tc-ai-chat__body')
    const composer = chat.locator('.tc-ai-chat__composer')
    await expectMaximizedChatGeometry(page)

    const [chatBox, headerBox, bodyBox, composerBox] = await Promise.all([
      requiredBox(chat, 'low-height maximized Chat'),
      requiredBox(header, 'low-height Chat header'),
      requiredBox(body, 'low-height Chat body'),
      requiredBox(composer, 'low-height Chat composer'),
    ])
    const viewport = page.viewportSize()!
    expect(boxesIntersect(headerBox, bodyBox), 'Chat body must not cover the header').toBe(false)
    expect(composerBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 0.5)
    expect(composerBox.x).toBeGreaterThanOrEqual(chatBox.x - 0.5)
    expect(composerBox.x + composerBox.width).toBeLessThanOrEqual(chatBox.x + chatBox.width + 0.5)
    expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(chatBox.y + chatBox.height + 0.5)
    expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(viewport.height + 0.5)

    const headerButtons = header.locator('button:visible')
    expect(await headerButtons.count()).toBeGreaterThanOrEqual(4)
    for (let index = 0; index < await headerButtons.count(); index += 1) {
      const button = headerButtons.nth(index)
      const receivesPointerEvents = await button.evaluate((element) => {
        const box = element.getBoundingClientRect()
        const topElement = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
        return Boolean(topElement && (topElement === element || element.contains(topElement)))
      })
      expect(receivesPointerEvents, `Chat header button ${index + 1} must receive pointer events`).toBe(true)
    }

    await headerButtons.last().click()
    await expectCompactChatGeometry(page)
    await assertNoUnexpectedRuntimeFailures(page, diagnostics)
  })

  test('AI attachment tooltip yields to its open menu', async ({ page }) => {
    const diagnostics = await installAuthenticatedFixtures(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(STUDIO_PATH)

    await expect(page.locator('.react-flow')).toBeVisible()
    await page.locator('.tc-ai-chat__bubble-button').click()
    await expectExpandedChatGeometry(page, 420)

    const attachButton = page.getByRole('button', { name: '参考图' })
    await attachButton.hover()
    const tooltip = page.locator('.mantine-Tooltip-tooltip:visible')
    await expect(tooltip).toBeVisible()
    await attachButton.click()

    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await expect(tooltip, 'Attachment Tooltip must close while its Menu is open').not.toBeVisible()
    await page.keyboard.press('Escape')
    await assertNoUnexpectedRuntimeFailures(page, diagnostics)
  })

  test('Studio side panels stay inside the mobile containing block', async ({ page }) => {
    await installAuthenticatedFixtures(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(STUDIO_PATH)

    await expect(page.locator('.react-flow')).toBeVisible()
    const panels = [
      { button: '添加节点', anchor: '.app-add-node-panel', label: 'Add Node' },
      { button: 'TapShow', anchor: '.tapshow-panel-anchor', label: 'TapShow' },
      { button: '运行记录', anchor: '.execution-panel-anchor', label: 'Execution' },
      { button: '历史记录', anchor: '.history-panel-anchor', label: 'History' },
      { button: '账户', anchor: '.account-panel-anchor', label: 'Account' },
    ] as const
    const containingBlock = await readFixedContainingBlock(page)

    for (const item of panels) {
      await page.getByRole('button', { name: item.button }).click()
      const panel = page.locator(`${item.anchor} > div > .tc-panel-card`)
      await expect(panel, `${item.label} panel must be visible`).toBeVisible()
      const box = await requiredBox(panel, `${item.label} panel`)
      expect(box.x, `${item.label} panel left edge`).toBeGreaterThanOrEqual(-0.5)
      expect(box.x + box.width, `${item.label} panel right edge`).toBeLessThanOrEqual(containingBlock.width + 0.5)
    }
  })

  test('expanded Chat and wide Studio panels divide compact desktop space', async ({ page }) => {
    await installAuthenticatedFixtures(page)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto(STUDIO_PATH)

    await expect(page.locator('.react-flow')).toBeVisible()
    await page.locator('.tc-ai-chat__bubble-button').click()
    await expectExpandedChatGeometry(page, 360)
    await page.getByRole('button', { name: 'TapShow' }).click()

    const chat = page.locator('.tc-ai-chat[data-chat-mode="expanded"]')
    const panel = page.locator('.tapshow-panel-anchor > div > .tc-panel-card')
    await expect(panel).toBeVisible()
    const panelMaxHeight = await panel.evaluate((element) => Number.parseFloat(getComputedStyle(element).maxHeight))
    expect(panelMaxHeight).toBeGreaterThanOrEqual(180)
    await expectBoxesDoNotIntersect(panel, chat, ['TapShow panel', 'expanded Chat'])

    await page.getByRole('button', { name: '收起' }).click()
    await expectCompactChatGeometry(page)
    await page.locator('.tc-ai-chat__bubble-button').click()
    await expectExpandedChatGeometry(page, 360)
    await expectBoxesDoNotIntersect(panel, chat, ['already-open TapShow panel', 'expanded Chat'])
  })

  test('Canvas context menu stays below the Header on a short mobile viewport', async ({ page }) => {
    await installAuthenticatedFixtures(page)
    await page.setViewportSize({ width: 414, height: 371 })
    await page.goto(STUDIO_PATH)

    await expect(page.locator('.react-flow')).toBeVisible()
    const contextPoint = { x: 260, y: 300 }
    const pointBelongsToCanvas = await page.evaluate((point) => (
      Boolean(document.elementFromPoint(point.x, point.y)?.closest('[data-tour="canvas"]'))
    ), contextPoint)
    expect(pointBelongsToCanvas, 'Context-menu test point must belong to the Canvas').toBe(true)
    await page.mouse.click(contextPoint.x, contextPoint.y, { button: 'right' })

    const menu = page.locator('.tc-canvas__context-menu')
    const header = page.locator('.app-header-overlay')
    await expect(menu).toBeVisible()
    await expectBoxesDoNotIntersect(header, menu, ['Header overlay', 'Canvas context menu'])
    const menuBox = await requiredBox(menu, 'Canvas context menu')
    const viewport = page.viewportSize()!
    expect(menuBox.x).toBeGreaterThanOrEqual(7.5)
    expect(menuBox.y).toBeGreaterThanOrEqual(7.5)
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width - 7.5)
    expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewport.height - 7.5)
    const firstAction = menu.locator('button').first()
    const firstActionReceivesPointerEvents = await firstAction.evaluate((element) => {
      const box = element.getBoundingClientRect()
      const topElement = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      return Boolean(topElement && (topElement === element || element.contains(topElement)))
    })
    expect(firstActionReceivesPointerEvents, 'First Canvas context action must receive pointer events').toBe(true)
  })

  test('Canvas selection action bar stays below the Header when selected nodes are near the top', async ({ page }) => {
    await installAuthenticatedFixtures(page)
    const selectedFlow = {
      id: 'flow-e2e',
      name: 'Studio 顶部框选回归工作流',
      ownerType: 'project',
      ownerId: 'project-e2e',
      data: {
        nodes: [
          {
            id: 'selection-top-a',
            type: 'taskNode',
            position: { x: 24, y: 112 },
            selected: true,
            data: { kind: 'text', label: '顶部框选 A', prompt: '第一段文本', nodeWidth: 300 },
          },
          {
            id: 'selection-top-b',
            type: 'taskNode',
            position: { x: 360, y: 112 },
            selected: true,
            data: { kind: 'text', label: '顶部框选 B', prompt: '第二段文本', nodeWidth: 300 },
          },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    }
    await page.route('**/*', async (route) => {
      const request = route.request()
      const pathname = normalizeApiPath(new URL(request.url()))
      if (request.method().toUpperCase() === 'GET' && pathname === '/flows') {
        await fulfillJson(route, [selectedFlow])
        return
      }
      if (request.method().toUpperCase() === 'GET' && pathname === '/flows/flow-e2e') {
        await fulfillJson(route, selectedFlow)
        return
      }
      if (request.method().toUpperCase() === 'GET' && pathname === '/ai/node-presets') {
        await fulfillJson(route, [])
        return
      }
      await route.fallback()
    })
    await page.setViewportSize({ width: 414, height: 371 })
    await page.goto(STUDIO_PATH)

    const actionBar = page.getByRole('toolbar', { name: '框选操作栏' })
    const header = page.locator('.app-header-overlay')
    await expect(actionBar).toBeVisible()
    await expectBoxesDoNotIntersect(header, actionBar, ['Header overlay', 'top Canvas selection action bar'])

    const [actionBarBox, headerBox] = await Promise.all([
      requiredBox(actionBar, 'top Canvas selection action bar'),
      requiredBox(header, 'Header overlay'),
    ])
    expect(actionBarBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height + 7.5)

    const firstAction = actionBar.getByRole('button', { name: '2', exact: true })
    const receivesPointerEvents = await firstAction.evaluate((element) => {
      const box = element.getBoundingClientRect()
      const topElement = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      return Boolean(topElement && (topElement === element || element.contains(topElement)))
    })
    expect(receivesPointerEvents, 'Top selection action bar button must receive pointer events').toBe(true)
  })

  test('selected image node toolbar avoids the Header instead of being clipped at the top edge', async ({ page }) => {
    await installAuthenticatedFixtures(page)
    const selectedFlow = {
      id: 'flow-e2e',
      name: 'Studio 顶部节点工具栏回归工作流',
      ownerType: 'project',
      ownerId: 'project-e2e',
      data: {
        nodes: [{
          id: 'image-top-toolbar',
          type: 'taskNode',
          position: { x: 80, y: 96 },
          selected: true,
          data: {
            kind: 'image',
            label: '顶部图片节点',
            prompt: 'A test image node near the header',
            imageUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22200%22%3E%3Crect width=%22320%22 height=%22200%22 fill=%22%2360a5fa%22/%3E%3C/svg%3E',
            imageResults: [{ url: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22200%22%3E%3Crect width=%22320%22 height=%22200%22 fill=%22%2360a5fa%22/%3E%3C/svg%3E' }],
            imagePrimaryIndex: 0,
            nodeWidth: 320,
          },
        }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    }
    await page.route('**/*', async (route) => {
      const request = route.request()
      const pathname = normalizeApiPath(new URL(request.url()))
      if (request.method().toUpperCase() === 'GET' && pathname === '/flows') {
        await fulfillJson(route, [selectedFlow])
        return
      }
      if (request.method().toUpperCase() === 'GET' && pathname === '/flows/flow-e2e') {
        await fulfillJson(route, selectedFlow)
        return
      }
      if (request.method().toUpperCase() === 'GET' && pathname === '/ai/node-presets') {
        await fulfillJson(route, [])
        return
      }
      await route.fallback()
    })
    await page.setViewportSize({ width: 390, height: 371 })
    await page.goto(STUDIO_PATH)

    const toolbar = page.locator('.top-toolbar-content')
    const header = page.locator('.app-header-overlay')
    await expect(toolbar).toBeVisible()
    await expectBoxesDoNotIntersect(header, toolbar, ['Header overlay', 'selected image node top toolbar'])

    const [toolbarBox, headerBox] = await Promise.all([
      requiredBox(toolbar, 'selected image node top toolbar'),
      requiredBox(header, 'Header overlay'),
    ])
    expect(toolbarBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height + 7.5)
    expect(toolbarBox.x).toBeGreaterThanOrEqual(7.5)
    expect(toolbarBox.x + toolbarBox.width).toBeLessThanOrEqual(390 - 7.5)
  })

  test('storyboard editor toolbar remains reachable on narrow mobile viewports', async ({ page }) => {
    await installAuthenticatedFixtures(page)
    const selectedFlow = {
      id: 'flow-e2e',
      name: 'Studio 分镜工具栏回归工作流',
      ownerType: 'project',
      ownerId: 'project-e2e',
      data: {
        nodes: [{
          id: 'storyboard-toolbar',
          type: 'taskNode',
          position: { x: 8, y: 132 },
          selected: true,
          data: {
            kind: 'storyboard',
            label: '移动端分镜编辑',
            nodeWidth: 560,
            nodeHeight: 470,
            storyboardEditorGrid: '5x5',
            storyboardEditorAspect: '16:9',
            storyboardEditorEditMode: true,
            storyboardEditorCollapsed: false,
            storyboardEditorCells: [],
            storyboardEditorSelectedIndex: 0,
          },
        }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    }
    await page.route('**/*', async (route) => {
      const request = route.request()
      const pathname = normalizeApiPath(new URL(request.url()))
      if (request.method().toUpperCase() === 'GET' && pathname === '/flows') {
        await fulfillJson(route, [selectedFlow])
        return
      }
      if (request.method().toUpperCase() === 'GET' && pathname === '/flows/flow-e2e') {
        await fulfillJson(route, selectedFlow)
        return
      }
      if (request.method().toUpperCase() === 'GET' && pathname === '/ai/node-presets') {
        await fulfillJson(route, [])
        return
      }
      await route.fallback()
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(STUDIO_PATH)

    const toolbar = page.locator('.tc-storyboard-editor__toolbar')
    await expect(toolbar).toBeVisible()
    const toolbarBox = await requiredBox(toolbar, 'mobile storyboard editor toolbar')
    const viewport = page.viewportSize()!
    expect(toolbarBox.x).toBeGreaterThanOrEqual(7.5)
    expect(toolbarBox.y).toBeGreaterThanOrEqual(7.5)
    expect(toolbarBox.x + toolbarBox.width).toBeLessThanOrEqual(viewport.width - 7.5)
    expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(viewport.height - 7.5)
    await expectNoHorizontalOverflow(page)

    for (const buttonName of ['比例 16:9', '网格 5x5', '退出', '合成', '执行', '清空']) {
      const button = toolbar.getByRole('button', { name: buttonName })
      await expect(button, `Storyboard toolbar button "${buttonName}" must be visible`).toBeVisible()
    }
  })

  test('Feature tour card stays inside narrow and short mobile viewports', async ({ page }) => {
    await installAuthenticatedFixtures(page)
    await page.setViewportSize({ width: 360, height: 220 })
    await page.goto(STUDIO_PATH)

    await expect(page.locator('.react-flow')).toBeVisible()
    await page.getByRole('button', { name: '更多' }).click()
    await page.getByRole('menuitem', { name: '帮助' }).click()

    const tourCard = page.locator('.feature-tour-tooltip-wrap')
    await expect(tourCard).toBeVisible()
    const box = await requiredBox(tourCard, 'Feature tour card')
    const viewport = page.viewportSize()!
    expect(box.x).toBeGreaterThanOrEqual(11.5)
    expect(box.y).toBeGreaterThanOrEqual(11.5)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 11.5)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 11.5)
    await expectNoHorizontalOverflow(page)
  })

  test('Canvas selection action bar stays operable when the selection is panned to a mobile edge', async ({ page }) => {
    await installAuthenticatedFixtures(page)
    const selectedFlow = {
      id: 'flow-e2e',
      name: 'Studio 框选回归工作流',
      ownerType: 'project',
      ownerId: 'project-e2e',
      data: {
        nodes: [
          {
            id: 'selection-text-a',
            type: 'taskNode',
            position: { x: 0, y: 140 },
            selected: true,
            data: { kind: 'text', label: '框选文本 A', prompt: '第一段文本', nodeWidth: 320 },
          },
          {
            id: 'selection-text-b',
            type: 'taskNode',
            position: { x: 400, y: 140 },
            selected: true,
            data: { kind: 'text', label: '框选文本 B', prompt: '第二段文本', nodeWidth: 320 },
          },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    }
    await page.route('**/*', async (route) => {
      const request = route.request()
      const pathname = normalizeApiPath(new URL(request.url()))
      if (request.method().toUpperCase() === 'GET' && pathname === '/flows') {
        await fulfillJson(route, [selectedFlow])
        return
      }
      if (request.method().toUpperCase() === 'GET' && pathname === '/flows/flow-e2e') {
        await fulfillJson(route, selectedFlow)
        return
      }
      if (request.method().toUpperCase() === 'GET' && pathname === '/ai/node-presets') {
        await fulfillJson(route, [])
        return
      }
      await route.fallback()
    })
    await page.setViewportSize({ width: 414, height: 371 })
    await page.goto(STUDIO_PATH)

    const actionBar = page.getByRole('toolbar', { name: '框选操作栏' })
    await expect(actionBar).toBeVisible()

    const canvasPoint = { x: 280, y: 260 }
    expect(await page.evaluate((point) => (
      Boolean(document.elementFromPoint(point.x, point.y)?.closest('[data-tour="canvas"]'))
    ), canvasPoint), 'Selection pan point must belong to the Canvas').toBe(true)
    await page.mouse.move(canvasPoint.x, canvasPoint.y)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(28, canvasPoint.y, { steps: 8 })
    await page.mouse.up({ button: 'middle' })

    const box = await requiredBox(actionBar, 'mobile Canvas selection action bar')
    const viewport = page.viewportSize()!
    expect(box.x).toBeGreaterThanOrEqual(7.5)
    expect(box.y).toBeGreaterThanOrEqual(7.5)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 7.5)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 7.5)

    const firstAction = actionBar.getByRole('button', { name: '2', exact: true })
    const firstActionPointerState = await firstAction.evaluate((element) => {
      const actionBox = element.getBoundingClientRect()
      const topElement = document.elementFromPoint(
        actionBox.x + actionBox.width / 2,
        actionBox.y + actionBox.height / 2,
      )
      return {
        receivesPointerEvents: Boolean(topElement && (topElement === element || element.contains(topElement))),
        topClassName: topElement instanceof HTMLElement ? topElement.className : '',
        topText: topElement?.textContent?.trim().slice(0, 80) || '',
      }
    })
    expect(
      firstActionPointerState.receivesPointerEvents,
      `Selection action bar button must receive pointer events: ${JSON.stringify(firstActionPointerState)}`,
    ).toBe(true)
  })

  test('Library editor owns the viewport above persistent Studio chrome on mobile', async ({ page }) => {
    const diagnostics = await installAuthenticatedFixtures(page)
    await page.route('**/*', async (route) => {
      const request = route.request()
      const pathname = normalizeApiPath(new URL(request.url()))
      if (request.method().toUpperCase() === 'GET' && pathname === '/projects') {
        await fulfillJson(route, [])
        return
      }
      await route.fallback()
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/studio?__e2eLibraryEditor=1')

    await expect(page.locator('.react-flow')).toBeVisible()
    await page.getByRole('button', { name: '工作流' }).click()
    await page.getByRole('tab', { name: '我的模板' }).click()
    const flowCard = page.locator('.template-panel-card', { hasText: 'Studio 回归工作流' })
    await expect(flowCard).toBeVisible()
    await flowCard.hover()
    await flowCard.getByRole('button', { name: '编辑' }).click()

    const editor = page.locator('.tc-library-editor')
    const panel = editor.locator('.tc-library-editor__panel')
    const closeButton = editor.getByRole('button', { name: '关闭' })
    await expect(editor).toBeVisible()
    await expect(closeButton).toBeVisible()
    expect(await editor.evaluate((element) => element.parentElement === document.body), 'Library editor must render in document.body').toBe(true)

    const [editorBox, panelBox] = await Promise.all([
      requiredBox(editor, 'mobile Library editor'),
      requiredBox(panel, 'mobile Library editor panel'),
    ])
    const viewport = page.viewportSize()!
    const containingBlock = await readFixedContainingBlock(page)
    expect(editorBox.x).toBeCloseTo(0, 0)
    expect(editorBox.y).toBeCloseTo(0, 0)
    expect(editorBox.width).toBeCloseTo(containingBlock.width, 0)
    expect(editorBox.height).toBeCloseTo(containingBlock.height, 0)
    expect(panelBox.x).toBeGreaterThanOrEqual(7.5)
    expect(panelBox.y).toBeGreaterThanOrEqual(7.5)
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width - 7.5)
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height - 7.5)

    for (const [label, target] of [
      ['Studio Header', page.locator('.tc-studio-header')],
      ['Studio navigation', page.locator('[data-tour="floating-nav"]')],
      ['compact Chat', page.locator('.tc-ai-chat')],
    ] as const) {
      const targetBox = await requiredBox(target, label)
      const editorOwnsTopElement = await editor.evaluate((element, point) => {
        const topElement = document.elementFromPoint(point.x, point.y)
        return Boolean(topElement && element.contains(topElement))
      }, {
        x: targetBox.x + targetBox.width / 2,
        y: targetBox.y + targetBox.height / 2,
      })
      expect(editorOwnsTopElement, `Library editor must block ${label}`).toBe(true)
    }

    const closeReceivesPointerEvents = await closeButton.evaluate((element) => {
      const box = element.getBoundingClientRect()
      const topElement = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      return Boolean(topElement && (topElement === element || element.contains(topElement)))
    })
    expect(closeReceivesPointerEvents, 'Library editor Close button must receive pointer events').toBe(true)
    page.once('dialog', (dialog) => dialog.accept())
    await closeButton.click()
    await expect(editor).not.toBeVisible()
    await assertNoUnexpectedRuntimeFailures(page, diagnostics)
  })

  test('Studio modal blocks persistent chrome from receiving pointer events', async ({ page }) => {
    const diagnostics = await installAuthenticatedFixtures(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(STUDIO_PATH)

    await expect(page.locator('.react-flow')).toBeVisible()
    await page.getByRole('button', { name: '更多' }).click()
    await page.getByRole('menuitem', { name: '积分 1200 · 充值' }).click()
    const dialog = page.getByRole('dialog', { name: '积分充值' })
    await expect(dialog).toBeVisible()

    for (const [label, target] of [
      ['Header More button', page.getByRole('button', { name: '更多' })],
      ['Canvas visibility filter', page.getByRole('button', { name: '文本' })],
      ['floating nav', page.getByRole('button', { name: '工作流' })],
      ['AI Chat launcher', page.getByRole('button', { name: '展开 AI 对话' })],
    ] as const) {
      const targetBox = await requiredBox(target, label)
      const modalOwnsTopElement = await page.evaluate(({ x, y }) => (
        Boolean(document.elementFromPoint(x, y)?.closest('.mantine-Modal-root'))
      ), {
        x: targetBox.x + targetBox.width / 2,
        y: targetBox.y + targetBox.height / 2,
      })
      expect(modalOwnsTopElement, `${label} must be blocked by the active Modal`).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await assertNoUnexpectedRuntimeFailures(page, diagnostics)
  })

  for (const viewport of VIEWPORTS) {
    test(`authenticated Studio shell is stable at ${viewport.name}`, async ({ page }, testInfo) => {
      const diagnostics = await installAuthenticatedFixtures(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(STUDIO_PATH)

      await assertStudioShell(page, viewport)
      await exerciseAssetPanel(page, viewport)
      await captureViewportScreenshot(page, testInfo, viewport.width, viewport.height)

      if (viewport.width === 1440) {
        await exerciseLightThemeContrast(page, testInfo)
      }

      if (viewport.width > 900) {
        await exerciseDesktopChat(page, viewport)
      } else {
        await exerciseMobileChat(page)
        await verifyStoredExpandedMobilePresentation(page)
      }

      const uploadBar = page.locator('.pending-uploads-bar-shell')
      if (await uploadBar.isVisible()) {
        await expectBoxesDoNotIntersect(uploadBar, page.locator('.tc-ai-chat'), ['upload bar', 'Chat'])
      }
      await expectNoHorizontalOverflow(page)
      await assertNoUnexpectedRuntimeFailures(page, diagnostics)
    })
  }
})

test.describe('responsive route shell regression', () => {
  test('Stats system management stacks without document overflow on mobile', async ({ page }) => {
    await installAuthenticatedFixtures(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/stats/system')

    const layout = page.locator('.stats-system-layout')
    const sidebar = page.locator('.stats-system-sidebar')
    const content = page.locator('.stats-system-card')
    await expect(layout).toBeVisible()
    await expect(layout).toHaveCSS('flex-direction', 'column')
    await expectNoHorizontalOverflow(page)

    const [layoutBox, sidebarBox, contentBox] = await Promise.all([
      requiredBox(layout, 'Stats system layout'),
      requiredBox(sidebar, 'Stats system sidebar'),
      requiredBox(content, 'Stats system content'),
    ])
    expect(sidebarBox.width).toBeCloseTo(layoutBox.width, 0)
    expect(contentBox.width).toBeCloseTo(layoutBox.width, 0)

    const firstGroup = page.locator('.stats-system-sidebar-group').first()
    await firstGroup.click()
    const groupMenu = page.locator('.stats-system-sidebar-menu-dropdown')
    await expect(groupMenu).toBeVisible()
    const groupMenuBox = await requiredBox(groupMenu, 'mobile Stats system group menu')
    const viewport = page.viewportSize()!
    expect(groupMenuBox.x).toBeGreaterThanOrEqual(7.5)
    expect(groupMenuBox.y).toBeGreaterThanOrEqual(7.5)
    expect(groupMenuBox.x + groupMenuBox.width).toBeLessThanOrEqual(viewport.width - 7.5)
    expect(groupMenuBox.y + groupMenuBox.height).toBeLessThanOrEqual(viewport.height - 7.5)
  })
})

test.describe('full route occlusion matrix', () => {
  test.describe.configure({ timeout: 240_000 })

  test('all routed surfaces stay inside four representative viewports', async ({ page }) => {
    const diagnostics = await installAuthenticatedFixtures(page, {
      ...TEST_USER,
      sub: 'studio-e2e-admin',
      login: 'studio-e2e-admin',
      name: 'Studio E2E Admin',
      role: 'admin',
    })

    const routes = [
      STUDIO_PATH,
      '/projects',
      '/tapshow',
      '/share',
      '/stats',
      '/stats/system',
      '/stats/memory',
      '/stats/skills',
      '/stats/enterprise',
      '/stats/users',
      '/stats/projects',
      '/stats/commerce',
    ] as const
    const viewports = [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
      { width: 414, height: 371 },
    ] as const

    const failures: string[] = []
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      for (const route of routes) {
        await page.goto(route)
        await expect(page.locator('body')).toBeVisible()
        await waitForRouteLandmark(page, route)
        await page.waitForTimeout(200)

        const audit = await page.evaluate(() => {
          const viewportWidth = window.innerWidth
          const viewportHeight = window.innerHeight
          const tolerance = 1
          const isVisible = (element: HTMLElement) => {
            const style = getComputedStyle(element)
            const rect = element.getBoundingClientRect()
            return (
              style.display !== 'none'
              && style.visibility !== 'hidden'
              && Number.parseFloat(style.opacity || '1') > 0.05
              && rect.width > 0.5
              && rect.height > 0.5
            )
          }
          const describe = (element: Element) => {
            const htmlElement = element as HTMLElement
            const className = typeof htmlElement.className === 'string' ? htmlElement.className : ''
            return [
              htmlElement.tagName.toLowerCase(),
              htmlElement.getAttribute('role') || '',
              htmlElement.getAttribute('aria-label') || '',
              className.split(/\s+/).filter(Boolean).slice(0, 3).join('.'),
            ].filter(Boolean).join(':')
          }
          const isInsideNotification = (element: Element | null) => Boolean(
            element?.closest('.mantine-Notifications-root, .mantine-Notification-root'),
          )
          const visibleIntersection = (element: HTMLElement) => {
            const rect = element.getBoundingClientRect()
            let left = Math.max(0, rect.left)
            let top = Math.max(0, rect.top)
            let right = Math.min(viewportWidth, rect.right)
            let bottom = Math.min(viewportHeight, rect.bottom)

            let ancestor = element.parentElement
            while (ancestor) {
              const style = getComputedStyle(ancestor)
              const clipsX = style.overflowX !== 'visible'
              const clipsY = style.overflowY !== 'visible'
              if (clipsX || clipsY) {
                const ancestorRect = ancestor.getBoundingClientRect()
                if (clipsX) {
                  left = Math.max(left, ancestorRect.left)
                  right = Math.min(right, ancestorRect.right)
                }
                if (clipsY) {
                  top = Math.max(top, ancestorRect.top)
                  bottom = Math.min(bottom, ancestorRect.bottom)
                }
              }
              ancestor = ancestor.parentElement
            }

            const width = right - left
            const height = bottom - top
            if (width <= 0.5 || height <= 0.5) return null
            return { left, top, right, bottom, width, height }
          }

          const fixedOutOfBounds = Array.from(document.querySelectorAll<HTMLElement>('*'))
            .filter((element) => {
              const style = getComputedStyle(element)
              return isVisible(element) && style.position === 'fixed' && style.pointerEvents !== 'none'
            })
            .filter((element) => {
              let parent = element.parentElement
              while (parent) {
                if (getComputedStyle(parent).position === 'fixed') return false
                parent = parent.parentElement
              }
              return true
            })
            .map((element) => ({ element, rect: element.getBoundingClientRect() }))
            .filter(({ rect }) => (
              rect.left < -tolerance
              || rect.top < -tolerance
              || rect.right > viewportWidth + tolerance
              || rect.bottom > viewportHeight + tolerance
            ))
            .slice(0, 20)
            .map(({ element, rect }) => ({
              element: describe(element),
              rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
            }))

          const portalOutOfBounds = Array.from(document.querySelectorAll<HTMLElement>([
            '.mantine-Menu-dropdown',
            '.mantine-Popover-dropdown',
            '.mantine-Tooltip-tooltip',
            '.mantine-Modal-content',
            '.mantine-Drawer-content',
            '.nano-comic-storyboard__mention-menu',
            '.task-node-prompt__mentions',
            '.task-node-prompt__suggestions',
          ].join(',')))
            .filter(isVisible)
            .map((element) => ({ element, rect: element.getBoundingClientRect() }))
            .filter(({ rect }) => (
              rect.left < -tolerance
              || rect.top < -tolerance
              || rect.right > viewportWidth + tolerance
              || rect.bottom > viewportHeight + tolerance
            ))
            .slice(0, 20)
            .map(({ element, rect }) => ({
              element: describe(element),
              rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
            }))

          const blockedInteractive = Array.from(document.querySelectorAll<HTMLElement>([
            'button',
            'a[href]',
            'input',
            'textarea',
            'select',
            '[role="tab"]',
            '[role="menuitem"]',
          ].join(',')))
            .filter((element) => {
              if (!isVisible(element)) return false
              if (element.matches(':disabled, [aria-disabled="true"]')) return false
              const style = getComputedStyle(element)
              if (style.pointerEvents === 'none') return false
              const visibleRect = visibleIntersection(element)
              if (!visibleRect) return false
              const centerX = visibleRect.left + visibleRect.width / 2
              const centerY = visibleRect.top + visibleRect.height / 2
              if (centerX < 0 || centerX > viewportWidth || centerY < 0 || centerY > viewportHeight) return false
              const topElement = document.elementFromPoint(centerX, centerY)
              if (!topElement || element === topElement || element.contains(topElement)) return false
              if (isInsideNotification(topElement)) return false
              return true
            })
            .slice(0, 20)
            .map((element) => {
              const rect = element.getBoundingClientRect()
              const visibleRect = visibleIntersection(element)
              const hitPoint = visibleRect
                ? { x: visibleRect.left + visibleRect.width / 2, y: visibleRect.top + visibleRect.height / 2 }
                : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
              const topElement = document.elementFromPoint(hitPoint.x, hitPoint.y)
              const clippingAncestors: Array<{
                element: string
                overflowX: string
                overflowY: string
                rect: { left: number; top: number; right: number; bottom: number }
              }> = []
              let ancestor = element.parentElement
              while (ancestor) {
                const style = getComputedStyle(ancestor)
                if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
                  const ancestorRect = ancestor.getBoundingClientRect()
                  clippingAncestors.push({
                    element: describe(ancestor),
                    overflowX: style.overflowX,
                    overflowY: style.overflowY,
                    rect: {
                      left: ancestorRect.left,
                      top: ancestorRect.top,
                      right: ancestorRect.right,
                      bottom: ancestorRect.bottom,
                    },
                  })
                }
                ancestor = ancestor.parentElement
              }
              return {
                element: describe(element),
                coveredBy: topElement ? describe(topElement) : 'none',
                rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
                visibleRect,
                hitPoint,
                clippingAncestors,
              }
            })

          return {
            horizontalOverflow: document.documentElement.scrollWidth - viewportWidth,
            fixedOutOfBounds,
            portalOutOfBounds,
            blockedInteractive,
          }
        })

        const context = `${route} @ ${viewport.width}x${viewport.height}`
        if (audit.horizontalOverflow > 1) {
          failures.push(`${context} document overflow: ${audit.horizontalOverflow}`)
        }
        if (audit.fixedOutOfBounds.length > 0) {
          failures.push(`${context} fixed surfaces: ${JSON.stringify(audit.fixedOutOfBounds)}`)
        }
        if (audit.portalOutOfBounds.length > 0) {
          failures.push(`${context} portal surfaces: ${JSON.stringify(audit.portalOutOfBounds)}`)
        }
        if (audit.blockedInteractive.length > 0) {
          failures.push(`${context} blocked controls: ${JSON.stringify(audit.blockedInteractive)}`)
        }
      }
    }

    expect(failures).toEqual([])
    await assertNoUnexpectedRuntimeFailures(page, diagnostics)
  })
})
