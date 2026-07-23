import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const WEB_ROOT = resolve(__dirname, '../..')

function readWebFile(relativePath: string): string {
  return readFileSync(resolve(WEB_ROOT, relativePath), 'utf8')
}

describe('email authentication integration contracts', () => {
  it('does not mount the legacy phone password setup modal', () => {
    const source = readWebFile('src/App.tsx')

    expect(source).not.toContain("import PhonePasswordSetupModal from './auth/PhonePasswordSetupModal'")
    expect(source).not.toContain('<PhonePasswordSetupModal')
  })

  it('keeps the production API base guard without requiring GitHub frontend variables', () => {
    const source = readWebFile('vite.config.ts')

    expect(source).toContain('VITE_API_BASE')
    expect(source).toContain('Missing `VITE_API_BASE`')
    expect(source).not.toContain('VITE_GITHUB_CLIENT_ID')
    expect(source).not.toContain('VITE_GITHUB_REDIRECT_URI')
  })

  it('documents email authentication instead of obsolete GitHub frontend configuration', () => {
    const source = readWebFile('.env.example')

    expect(source).toContain('邮箱登录与注册')
    expect(source).not.toContain('VITE_GITHUB_CLIENT_ID')
    expect(source).not.toContain('VITE_GITHUB_REDIRECT_URI')
  })

  it('uses email registration in user-facing signup guidance', () => {
    const source = readWebFile('src/api/server.ts')

    expect(source).toContain('新用户通过邮箱注册')
    expect(source).not.toContain('新用户通过 GitHub/手机号注册')
  })
})
