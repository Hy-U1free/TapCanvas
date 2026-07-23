import { expect, test, type Page } from '@playwright/test'

const HOME_VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'portrait-tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true)
}

type LayoutBox = {
  x: number
  y: number
  width: number
  height: number
}

function boxesIntersect(first: LayoutBox, second: LayoutBox): boolean {
  return (
    first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y
  )
}

async function readFontSize(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
}

for (const viewport of HOME_VIEWPORTS) {
  test(`homepage redesign is stable at ${viewport.name}`, async ({ page }, testInfo) => {
    const runtimeErrors: string[] = []
    page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`)
    })

    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'TapCanvas' })).toBeVisible()
    await expect(page.getByText('让每个镜头，在画布中发生。')).toBeVisible()
    await expect(page.getByRole('link', { name: '立即进入创作画布' })).toHaveAttribute('href', '/studio')
    await expectNoHorizontalOverflow(page)
    const formation = page.getByRole('region', { name: '素材组装为工作流' })
    const formationTop = await formation.evaluate((element) => element.getBoundingClientRect().top)
    expect(formationTop).toBeLessThanOrEqual(viewport.height - 32)

    await page.screenshot({
      path: testInfo.outputPath(`homepage-hero-${viewport.width}x${viewport.height}.png`),
      animations: 'disabled',
    })

    await expect(formation).toBeVisible()
    await formation.scrollIntoViewIfNeeded()
    const formationMetrics = await formation.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return {
        documentTop: bounds.top + window.scrollY,
        height: bounds.height,
      }
    })
    await page.evaluate(
      (scrollTop) => window.scrollTo(0, scrollTop),
      formationMetrics.documentTop + formationMetrics.height * 0.5 - viewport.height * 0.5,
    )
    await expect(page.locator('.tc-home-page__formation-workflow')).toBeVisible()
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }))
    const formationViewportProgress = await page.evaluate(
      ({ documentTop, height }) => (window.scrollY + window.innerHeight * 0.5 - documentTop) / height,
      formationMetrics,
    )
    expect(formationViewportProgress).toBeGreaterThan(0.49)
    expect(formationViewportProgress).toBeLessThan(0.51)

    const formationHeaderBox = await page.locator('.tc-home-page__formation-header').boundingBox()
    if (!formationHeaderBox) throw new Error('Homepage formation header has no layout bounds')

    const formationCards = page.locator('.tc-home-page__formation-card')
    const formationCardCount = await formationCards.count()
    expect(formationCardCount).toBe(8)
    for (let cardIndex = 0; cardIndex < formationCardCount; cardIndex += 1) {
      const cardBox = await formationCards.nth(cardIndex).boundingBox()
      if (!cardBox) throw new Error(`Homepage formation card ${cardIndex + 1} has no layout bounds`)
      expect(boxesIntersect(formationHeaderBox, cardBox)).toBe(false)
    }
    await expectNoHorizontalOverflow(page)
    await page.screenshot({
      path: testInfo.outputPath(`homepage-formation-${viewport.width}x${viewport.height}.png`),
      animations: 'disabled',
    })

    await page.locator('#product-showcase').scrollIntoViewIfNeeded()
    if (viewport.name === 'portrait-tablet') {
      await page.getByRole('tab', { name: /脚本/ }).click()
      const scriptNodes = page.locator('.tc-home-page__script-node')
      const scriptNodeCount = await scriptNodes.count()
      expect(scriptNodeCount).toBe(4)

      for (let firstIndex = 0; firstIndex < scriptNodeCount; firstIndex += 1) {
        const firstBox = await scriptNodes.nth(firstIndex).boundingBox()
        if (!firstBox) throw new Error(`Script node ${firstIndex + 1} has no layout bounds`)

        for (let secondIndex = firstIndex + 1; secondIndex < scriptNodeCount; secondIndex += 1) {
          const secondBox = await scriptNodes.nth(secondIndex).boundingBox()
          if (!secondBox) throw new Error(`Script node ${secondIndex + 1} has no layout bounds`)
          expect(boxesIntersect(firstBox, secondBox)).toBe(false)
        }
      }
    }

    if (viewport.name === 'mobile') {
      await page.getByRole('tab', { name: /脚本/ }).click()
      const scriptPanelHostBox = await page.locator('.tc-home-page__showcase-panel-host').boundingBox()
      const finalScriptNodeBox = await page.locator('.tc-home-page__script-node--scene').boundingBox()
      if (!scriptPanelHostBox || !finalScriptNodeBox) {
        throw new Error('Mobile script panel has no layout bounds')
      }
      expect(finalScriptNodeBox.y + finalScriptNodeBox.height).toBeLessThanOrEqual(
        scriptPanelHostBox.y + scriptPanelHostBox.height + 1,
      )

      expect(await readFontSize(page, '.tc-home-page__workspace-node-kicker')).toBeGreaterThanOrEqual(10)
      expect(await readFontSize(page, '.tc-home-page__workspace-node-meta')).toBeGreaterThanOrEqual(10)
      expect(await readFontSize(page, '.tc-home-page__workspace-node-title')).toBeGreaterThanOrEqual(12)

      await page.getByRole('tab', { name: /分镜/ }).click()
      expect(await readFontSize(page, '.tc-home-page__storyboard-caption')).toBeGreaterThanOrEqual(10)
      const storyboardPanelHeight = await page.locator('.tc-home-page__showcase-panel-host').evaluate(
        (element) => element.getBoundingClientRect().height,
      )
      expect(storyboardPanelHeight).toBeLessThanOrEqual(520)

      await page.getByRole('tab', { name: /视频/ }).click()
      const videoPanelHeight = await page.locator('.tc-home-page__showcase-panel-host').evaluate(
        (element) => element.getBoundingClientRect().height,
      )
      expect(videoPanelHeight).toBeLessThanOrEqual(520)
    }

    for (const label of ['脚本', '分镜', '视频']) {
      const tab = page.getByRole('tab', { name: new RegExp(label) })
      await tab.click()
      await expect(tab).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByRole('tabpanel', { name: new RegExp(label) })).toBeVisible()
    }
    await expectNoHorizontalOverflow(page)

    await page.screenshot({
      path: testInfo.outputPath(`homepage-showcase-${viewport.width}x${viewport.height}.png`),
      animations: 'disabled',
    })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'TapCanvas' })).toBeVisible()
    await expect(page.getByRole('region', { name: '素材组装为工作流' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({
      path: testInfo.outputPath(`homepage-reduced-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
      animations: 'disabled',
    })

    expect(runtimeErrors).toEqual([])
  })
}
