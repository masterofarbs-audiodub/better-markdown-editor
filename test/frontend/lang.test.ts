// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock navigator.language before importing lang module
const originalLanguage = Object.getOwnPropertyDescriptor(navigator, 'language')

function setLanguage(lang: string) {
  Object.defineProperty(navigator, 'language', {
    value: lang,
    writable: true,
    configurable: true,
  })
}

describe('lang module', () => {
  afterEach(() => {
    if (originalLanguage) {
      Object.defineProperty(navigator, 'language', originalLanguage)
    }
  })

  it('t() returns English translations by default', async () => {
    setLanguage('en-US')
    // Re-import to pick up new language
    const { t } = await import('../../media-src/src/lang')
    expect(t('save')).toBe('Save')
    expect(t('copyMarkdown')).toBe('Copy Markdown')
    expect(t('copyHtml')).toBe('Copy HTML')
    expect(t('resetConfig')).toBe('Reset config')
  })

  it('t() falls back to en_US for unknown languages', async () => {
    setLanguage('fr-FR')
    vi.resetModules()
    const { t, lang } = await import('../../media-src/src/lang')
    expect(lang).toBe('en_US')
    expect(t('save')).toBe('Save')
  })

  it('t() returns Chinese translations for zh_CN', async () => {
    setLanguage('zh-CN')
    vi.resetModules()
    const { t, lang } = await import('../../media-src/src/lang')
    expect(lang).toBe('zh_CN')
    expect(t('save')).toBe('保存')
    expect(t('copyMarkdown')).toBe('复制 Markdown')
  })

  it('t() falls back to en_US for partial translations', async () => {
    setLanguage('ja-JP')
    vi.resetModules()
    const { t, lang } = await import('../../media-src/src/lang')
    expect(lang).toBe('ja_JP')
    expect(t('save')).toBe('保存する')
    // copyMarkdown not defined in ja_JP, should fall back to en_US
    expect(t('copyMarkdown')).toBe('Copy Markdown')
  })
})
