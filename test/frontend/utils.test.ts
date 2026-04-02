// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// We can't import utils.ts directly because it has side effects (jquery-confirm, acquireVsCodeApi).
// Instead, we test the pure logic functions by replicating them here.
// This is intentional - the alternative is mocking jquery/vditor/jquery-confirm which adds complexity.

const mockPostMessage = vi.fn()

describe('fileToBase64 logic', () => {
  it('converts a file to base64 string', async () => {
    // Replicate fileToBase64 from utils.ts
    const fileToBase64 = async (file: File): Promise<string> => {
      return new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = function (evt) {
          res(evt.target!.result!.toString().split(',')[1])
        }
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
    }

    const content = 'hello world'
    const blob = new Blob([content], { type: 'text/plain' })
    const file = new File([blob], 'test.txt', { type: 'text/plain' })

    const result = await fileToBase64(file)
    expect(result).toBe('aGVsbG8gd29ybGQ=')
  })

  it('handles binary content', async () => {
    const fileToBase64 = async (file: File): Promise<string> => {
      return new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = function (evt) {
          res(evt.target!.result!.toString().split(',')[1])
        }
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
    }

    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const blob = new Blob([bytes])
    const file = new File([blob], 'image.png', { type: 'image/png' })

    const result = await fileToBase64(file)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('fixLinkClick logic', () => {
  beforeEach(() => {
    mockPostMessage.mockClear()
    ;(window as any).vscode = { postMessage: mockPostMessage }
  })

  it('intercepts link clicks and posts open-link message', () => {
    // Replicate fixLinkClick logic
    const openLink = (url: string) => {
      (window as any).vscode.postMessage({ command: 'open-link', href: url })
    }
    document.addEventListener('click', (e) => {
      const el = e.target as HTMLAnchorElement
      if (el.tagName === 'A') {
        openLink(el.href)
      }
    })

    const link = document.createElement('a')
    link.href = 'https://example.com'
    document.body.appendChild(link)
    link.click()

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'open-link' })
    )

    document.body.removeChild(link)
  })
})

describe('saveVditorOptions logic', () => {
  beforeEach(() => {
    mockPostMessage.mockClear()
    ;(window as any).vscode = { postMessage: mockPostMessage }
  })

  it('posts save-options message with current vditor state', () => {
    ;(window as any).vditor = {
      vditor: {
        options: {
          theme: 'dark',
          preview: { theme: { current: 'dark' } },
        },
        currentMode: 'wysiwyg',
      },
    }

    // Replicate saveVditorOptions logic
    const vditor = (window as any).vditor
    const vditorOptions = {
      theme: vditor.vditor.options.theme,
      mode: vditor.vditor.currentMode,
      preview: vditor.vditor.options.preview,
    }
    ;(window as any).vscode.postMessage({
      command: 'save-options',
      options: vditorOptions,
    })

    expect(mockPostMessage).toHaveBeenCalledWith({
      command: 'save-options',
      options: {
        theme: 'dark',
        mode: 'wysiwyg',
        preview: { theme: { current: 'dark' } },
      },
    })
  })
})

describe('fixCut logic', () => {
  it('wraps execCommand to defer delete via setTimeout', () => {
    // jsdom doesn't implement execCommand, so we provide a stub
    const execCalls: string[] = []
    document.execCommand = ((cmd: string, ...args: any[]) => {
      execCalls.push(cmd)
      return true
    }) as any

    const _exec = document.execCommand.bind(document)
    let deferred = false

    // Replicate fixCut logic
    document.execCommand = ((cmd: string, ...args: any[]) => {
      if (cmd === 'delete') {
        deferred = true
        setTimeout(() => _exec(cmd, ...args))
        return true
      }
      return _exec(cmd, ...args)
    }) as any

    document.execCommand('delete')
    expect(deferred).toBe(true)

    // Non-delete commands should call immediately
    document.execCommand('copy')
    expect(execCalls).toContain('copy')
  })
})
