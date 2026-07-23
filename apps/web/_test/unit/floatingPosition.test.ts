import { describe, expect, it } from 'vitest'
import { resolveViewportFloatingPosition } from '../../src/ui/utils/floatingPosition'

describe('resolveViewportFloatingPosition', () => {
  it('flips above a bottom caret and keeps the menu inside the viewport', () => {
    expect(resolveViewportFloatingPosition({
      anchorLeft: 350,
      anchorTop: 330,
      anchorBottom: 350,
      floatingWidth: 320,
      floatingHeight: 220,
      viewportWidth: 390,
      viewportHeight: 371,
    })).toEqual({ left: 62, top: 104 })
  })

  it('uses the preferred below position when it fits', () => {
    expect(resolveViewportFloatingPosition({
      anchorLeft: 40,
      anchorTop: 80,
      anchorBottom: 100,
      floatingWidth: 240,
      floatingHeight: 120,
      viewportWidth: 390,
      viewportHeight: 844,
    })).toEqual({ left: 40, top: 106 })
  })

  it('clamps an oversized surface to the viewport safe area', () => {
    expect(resolveViewportFloatingPosition({
      anchorLeft: -20,
      anchorTop: 20,
      anchorBottom: 40,
      floatingWidth: 420,
      floatingHeight: 480,
      viewportWidth: 390,
      viewportHeight: 371,
    })).toEqual({ left: 8, top: 8 })
  })

  it('honors an above preference and falls back below when the top edge is unavailable', () => {
    expect(resolveViewportFloatingPosition({
      anchorLeft: 120,
      anchorTop: 100,
      anchorBottom: 160,
      floatingWidth: 180,
      floatingHeight: 40,
      viewportWidth: 390,
      viewportHeight: 844,
      preferredPlacement: 'above',
    })).toEqual({ left: 120, top: 54 })

    expect(resolveViewportFloatingPosition({
      anchorLeft: 120,
      anchorTop: 20,
      anchorBottom: 80,
      floatingWidth: 180,
      floatingHeight: 40,
      viewportWidth: 390,
      viewportHeight: 844,
      preferredPlacement: 'above',
    })).toEqual({ left: 120, top: 86 })
  })

  it('keeps floating surfaces below a live header safe top', () => {
    expect(resolveViewportFloatingPosition({
      anchorLeft: 140,
      anchorTop: 100,
      anchorBottom: 130,
      floatingWidth: 180,
      floatingHeight: 48,
      viewportWidth: 390,
      viewportHeight: 844,
      preferredPlacement: 'above',
      safeTop: 86,
    })).toEqual({ left: 140, top: 136 })

    expect(resolveViewportFloatingPosition({
      anchorLeft: 140,
      anchorTop: 200,
      anchorBottom: 260,
      floatingWidth: 180,
      floatingHeight: 760,
      viewportWidth: 390,
      viewportHeight: 844,
      preferredPlacement: 'above',
      safeTop: 86,
    })).toEqual({ left: 140, top: 86 })
  })
})
