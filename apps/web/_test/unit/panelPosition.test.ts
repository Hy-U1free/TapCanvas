import { afterEach, describe, expect, it } from 'vitest'
import { calculateHeaderSafeTop, calculateSafeMaxHeight } from '../../src/ui/utils/panelPosition'

describe('Studio side panel positioning', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('does not treat the full-height expanded Chat as a bottom dialog', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
    const chat = document.createElement('div')
    chat.className = 'tc-ai-chat tc-ai-chat--expanded'
    chat.getBoundingClientRect = () => ({
      x: 664,
      y: 0,
      left: 664,
      top: 0,
      right: 1012,
      bottom: 768,
      width: 348,
      height: 768,
      toJSON: () => ({}),
    })
    document.body.append(chat)

    expect(calculateSafeMaxHeight(null, 150, 40, 140)).toBe(588)
  })

  it('places top overlays below the live Studio header', () => {
    const header = document.createElement('div')
    header.className = 'app-header-overlay'
    header.getBoundingClientRect = () => ({
      x: 8,
      y: 8,
      left: 8,
      top: 8,
      right: 406,
      bottom: 78,
      width: 398,
      height: 70,
      toJSON: () => ({}),
    })
    document.body.append(header)

    expect(calculateHeaderSafeTop()).toBe(86)
  })
})
