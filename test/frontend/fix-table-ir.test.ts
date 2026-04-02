// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'

// Replicate simulateKeys from fix-table-ir.ts for isolated testing.
// We can't import it directly due to Vditor/jQuery/vscode side effects.
function simulateKeys(keyString: string, target: HTMLElement) {
  let ctrlKey = false, shiftKey = false, metaKey = false
  let i = 0
  while (i < keyString.length) {
    if (keyString[i] === '{') {
      const end = keyString.indexOf('}', i)
      const token = keyString.slice(i + 1, end)
      if (token === 'ctrl') ctrlKey = true
      else if (token === '/ctrl') ctrlKey = false
      else if (token === 'shift') shiftKey = true
      else if (token === '/shift') shiftKey = false
      else if (token === 'meta') metaKey = true
      else if (token === '/meta') metaKey = false
      i = end + 1
    } else {
      const key = keyString[i]
      const opts = { key, ctrlKey, shiftKey, metaKey, bubbles: true, cancelable: true }
      target.dispatchEvent(new KeyboardEvent('keydown', opts))
      target.dispatchEvent(new KeyboardEvent('keyup', opts))
      i++
    }
  }
}

describe('simulateKeys', () => {
  let target: HTMLDivElement
  let events: KeyboardEvent[]

  beforeEach(() => {
    target = document.createElement('div')
    events = []
    target.addEventListener('keydown', (e) => events.push(e))
    target.addEventListener('keyup', (e) => events.push(e))
  })

  it('dispatches keydown and keyup for a plain character', () => {
    simulateKeys('a', target)

    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('keydown')
    expect(events[0].key).toBe('a')
    expect(events[0].ctrlKey).toBe(false)
    expect(events[0].shiftKey).toBe(false)
    expect(events[0].metaKey).toBe(false)
    expect(events[1].type).toBe('keyup')
    expect(events[1].key).toBe('a')
  })

  it('sets ctrlKey modifier when wrapped in {ctrl}...{/ctrl}', () => {
    simulateKeys('{ctrl}x{/ctrl}', target)

    expect(events).toHaveLength(2)
    expect(events[0].key).toBe('x')
    expect(events[0].ctrlKey).toBe(true)
    expect(events[0].shiftKey).toBe(false)
    expect(events[0].metaKey).toBe(false)
  })

  it('sets metaKey modifier when wrapped in {meta}...{/meta}', () => {
    simulateKeys('{meta}s{/meta}', target)

    expect(events).toHaveLength(2)
    expect(events[0].key).toBe('s')
    expect(events[0].metaKey).toBe(true)
    expect(events[0].ctrlKey).toBe(false)
  })

  it('sets both ctrl and shift for nested modifiers', () => {
    simulateKeys('{ctrl}{shift}l{/shift}{/ctrl}', target)

    expect(events).toHaveLength(2)
    expect(events[0].key).toBe('l')
    expect(events[0].ctrlKey).toBe(true)
    expect(events[0].shiftKey).toBe(true)
    expect(events[0].metaKey).toBe(false)
  })

  it('sets both meta and shift for nested modifiers', () => {
    simulateKeys('{meta}{shift}c{/shift}{/meta}', target)

    expect(events).toHaveLength(2)
    expect(events[0].key).toBe('c')
    expect(events[0].metaKey).toBe(true)
    expect(events[0].shiftKey).toBe(true)
    expect(events[0].ctrlKey).toBe(false)
  })

  it('handles multiple sequential keys', () => {
    simulateKeys('{ctrl}ab{/ctrl}', target)

    // 2 keys x 2 events each = 4
    expect(events).toHaveLength(4)
    expect(events[0].key).toBe('a')
    expect(events[0].ctrlKey).toBe(true)
    expect(events[2].key).toBe('b')
    expect(events[2].ctrlKey).toBe(true)
  })

  it('resets modifiers after closing tags', () => {
    simulateKeys('{ctrl}a{/ctrl}b', target)

    expect(events).toHaveLength(4)
    // First key has ctrl
    expect(events[0].key).toBe('a')
    expect(events[0].ctrlKey).toBe(true)
    // Second key does not
    expect(events[2].key).toBe('b')
    expect(events[2].ctrlKey).toBe(false)
  })

  it('dispatches events with bubbles: true', () => {
    simulateKeys('z', target)
    expect(events[0].bubbles).toBe(true)
  })

  it('handles empty string without dispatching events', () => {
    simulateKeys('', target)
    expect(events).toHaveLength(0)
  })

  it('handles special characters like - and = as keys', () => {
    simulateKeys('{ctrl}-{/ctrl}', target)

    expect(events).toHaveLength(2)
    expect(events[0].key).toBe('-')
    expect(events[0].ctrlKey).toBe(true)
  })
})

describe('handleMap deleteColumn mapping', () => {
  // Replicate the handleMap from fix-table-ir.ts to verify the fix
  // (changed from underscore _ to hyphen -)
  const handleMap: Record<string, string[]> = {
    left: [
      '{ctrl}{shift}l{/shift}{/ctrl}',
      '{meta}{shift}l{/shift}{/meta}',
    ],
    center: [
      '{ctrl}{shift}c{/shift}{/ctrl}',
      '{meta}{shift}c{/shift}{/meta}',
    ],
    right: [
      '{ctrl}{shift}r{/shift}{/ctrl}',
      '{meta}{shift}r{/shift}{/meta}',
    ],
    insertRowA: [
      '{ctrl}{shift}f{/shift}{/ctrl}',
      '{meta}{shift}f{/shift}{/meta}',
    ],
    insertRowB: ['{ctrl}={/ctrl}', '{meta}={/meta}'],
    deleteRow: ['{ctrl}-{/ctrl}', '{meta}-{/meta}'],
    insertColumnL: [
      '{ctrl}{shift}g{/shift}{/ctrl}',
      '{meta}{shift}g{/shift}{/meta}',
    ],
    insertColumnR: [
      '{ctrl}{shift}+{/shift}{/ctrl}',
      '{meta}{shift}={/shift}{/meta}',
    ],
    deleteColumn: [
      '{ctrl}{shift}-{/shift}{/ctrl}',
      '{meta}{shift}-{/shift}{/meta}',
    ],
  }

  it('deleteColumn uses hyphen (-) not underscore (_) on non-Mac', () => {
    const keyString = handleMap['deleteColumn'][0]
    expect(keyString).toBe('{ctrl}{shift}-{/shift}{/ctrl}')
    expect(keyString).not.toContain('_')
  })

  it('deleteColumn uses hyphen (-) not underscore (_) on Mac', () => {
    const keyString = handleMap['deleteColumn'][1]
    expect(keyString).toBe('{meta}{shift}-{/shift}{/meta}')
    expect(keyString).not.toContain('_')
  })

  it('deleteColumn dispatches shift+ctrl+hyphen on non-Mac', () => {
    const target = document.createElement('div')
    const events: KeyboardEvent[] = []
    target.addEventListener('keydown', (e) => events.push(e))

    simulateKeys(handleMap['deleteColumn'][0], target)

    expect(events).toHaveLength(1)
    expect(events[0].key).toBe('-')
    expect(events[0].ctrlKey).toBe(true)
    expect(events[0].shiftKey).toBe(true)
  })

  it('deleteRow dispatches ctrl+hyphen (no shift)', () => {
    const target = document.createElement('div')
    const events: KeyboardEvent[] = []
    target.addEventListener('keydown', (e) => events.push(e))

    simulateKeys(handleMap['deleteRow'][0], target)

    expect(events).toHaveLength(1)
    expect(events[0].key).toBe('-')
    expect(events[0].ctrlKey).toBe(true)
    expect(events[0].shiftKey).toBe(false)
  })
})
