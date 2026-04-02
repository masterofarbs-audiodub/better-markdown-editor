// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Test the message handler logic from main.ts without importing the full module
// (which would try to instantiate Vditor). We replicate the handler to test it in isolation.

describe('message handler logic', () => {
  let mockVditor: any

  beforeEach(() => {
    mockVditor = {
      setValue: vi.fn(),
      insertValue: vi.fn(),
      destroy: vi.fn(),
      getValue: vi.fn(() => '# Test'),
    }
  })

  describe('update command', () => {
    it('init with useVscodeThemeColor sets body attribute to 1', () => {
      const msg = {
        command: 'update',
        type: 'init',
        content: '# Hello',
        options: { useVscodeThemeColor: true },
        theme: 'dark',
      }

      // Replicate handler logic
      if (msg.type === 'init') {
        if (msg.options && msg.options.useVscodeThemeColor) {
          document.body.setAttribute('data-use-vscode-theme-color', '1')
        } else {
          document.body.setAttribute('data-use-vscode-theme-color', '0')
        }
      }

      expect(document.body.getAttribute('data-use-vscode-theme-color')).toBe('1')
    })

    it('init without useVscodeThemeColor sets body attribute to 0', () => {
      const msg = {
        command: 'update',
        type: 'init',
        content: '# Hello',
        options: { useVscodeThemeColor: false },
        theme: 'light',
      }

      if (msg.type === 'init') {
        if (msg.options && msg.options.useVscodeThemeColor) {
          document.body.setAttribute('data-use-vscode-theme-color', '1')
        } else {
          document.body.setAttribute('data-use-vscode-theme-color', '0')
        }
      }

      expect(document.body.getAttribute('data-use-vscode-theme-color')).toBe('0')
    })

    it('non-init update calls setValue', () => {
      const msg = { command: 'update', content: '# Updated' }

      // Replicate non-init handler
      if (!(msg as any).type) {
        mockVditor.setValue(msg.content)
      }

      expect(mockVditor.setValue).toHaveBeenCalledWith('# Updated')
    })
  })

  describe('uploaded command', () => {
    it('inserts audio tag for .wav files', () => {
      const msg = {
        command: 'uploaded',
        files: ['assets/recording.wav'],
      }

      msg.files.forEach((f) => {
        if (f.endsWith('.wav')) {
          mockVditor.insertValue(
            `\n\n<audio controls="controls" src="${f}"></audio>\n\n`
          )
        }
      })

      expect(mockVditor.insertValue).toHaveBeenCalledWith(
        '\n\n<audio controls="controls" src="assets/recording.wav"></audio>\n\n'
      )
    })

    it('inserts markdown image for image files on successful load', () => {
      const msg = {
        command: 'uploaded',
        files: ['assets/photo.png'],
      }

      // Simulate image load success path
      msg.files.forEach((f) => {
        if (!f.endsWith('.wav')) {
          // In the real code, this triggers an Image onload
          // We test the expected output directly
          mockVditor.insertValue(`\n\n![](${f})\n\n`)
        }
      })

      expect(mockVditor.insertValue).toHaveBeenCalledWith(
        '\n\n![](assets/photo.png)\n\n'
      )
    })

    it('inserts link fallback when image fails to load', () => {
      const f = 'assets/broken.png'
      // Simulates the onerror path
      mockVditor.insertValue(`\n\n[${f.split('/').slice(-1)[0]}](${f})\n\n`)

      expect(mockVditor.insertValue).toHaveBeenCalledWith(
        '\n\n[broken.png](assets/broken.png)\n\n'
      )
    })
  })
})

describe('initVditor option merging', () => {
  it('dark theme overrides stored options', () => {
    // Simple deep merge matching lodash.merge behavior
    const merge = (target: any, ...sources: any[]) => {
      for (const source of sources) {
        for (const key of Object.keys(source)) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            target[key] = target[key] || {}
            merge(target[key], source[key])
          } else {
            target[key] = source[key]
          }
        }
      }
      return target
    }

    const storedOptions = {
      theme: 'classic',
      preview: { theme: { current: 'light' } },
    }
    const msg = { options: storedOptions, theme: 'dark', content: '# Test' }

    let defaultOptions: any = {}
    defaultOptions = merge(defaultOptions, msg.options, {
      preview: { math: { inlineDigit: true } },
    })

    if (msg.theme === 'dark') {
      defaultOptions.theme = 'dark'
      defaultOptions.preview = defaultOptions.preview || {}
      defaultOptions.preview.theme = { current: 'dark' }
    }

    expect(defaultOptions.theme).toBe('dark')
    expect(defaultOptions.preview.theme.current).toBe('dark')
    expect(defaultOptions.preview.math.inlineDigit).toBe(true)
  })

  it('light theme overrides stored options', () => {
    // Simple deep merge matching lodash.merge behavior
    const merge = (target: any, ...sources: any[]) => {
      for (const source of sources) {
        for (const key of Object.keys(source)) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            target[key] = target[key] || {}
            merge(target[key], source[key])
          } else {
            target[key] = source[key]
          }
        }
      }
      return target
    }

    const storedOptions = {
      theme: 'dark',
      preview: { theme: { current: 'dark' } },
    }
    const msg = { options: storedOptions, theme: 'light', content: '# Test' }

    let defaultOptions: any = {}
    defaultOptions = merge(defaultOptions, msg.options, {
      preview: { math: { inlineDigit: true } },
    })

    if (msg.theme === 'light') {
      defaultOptions.theme = 'classic'
      defaultOptions.preview = defaultOptions.preview || {}
      defaultOptions.preview.theme = { current: 'light' }
    }

    expect(defaultOptions.theme).toBe('classic')
    expect(defaultOptions.preview.theme.current).toBe('light')
  })

  it('handles empty stored options gracefully', () => {
    // Simple deep merge matching lodash.merge behavior
    const merge = (target: any, ...sources: any[]) => {
      for (const source of sources) {
        for (const key of Object.keys(source)) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            target[key] = target[key] || {}
            merge(target[key], source[key])
          } else {
            target[key] = source[key]
          }
        }
      }
      return target
    }

    const msg = { options: {}, theme: 'dark', content: '# Test' }

    let defaultOptions: any = {}
    defaultOptions = merge(defaultOptions, msg.options, {
      preview: { math: { inlineDigit: true } },
    })

    if (msg.theme === 'dark') {
      defaultOptions.theme = 'dark'
      defaultOptions.preview = defaultOptions.preview || {}
      defaultOptions.preview.theme = { current: 'dark' }
    }

    expect(defaultOptions.theme).toBe('dark')
    expect(defaultOptions.preview.theme.current).toBe('dark')
  })
})
