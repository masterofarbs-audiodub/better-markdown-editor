/**
 * ir 模式下支持 table 编辑
 */
import $ from 'jquery'
import { i18n } from 'vditor/src/ts/i18n/index'
import { updateHotkeyTip } from 'vditor/src/ts/util/compatibility'
import { lang } from './lang'

const tablePanelId = 'fix-table-ir-wrapper'
let disableVscodeHotkeys = false

const keyCodeMap: Record<string, [string, number]> = {
  '-': ['Minus', 189], '=': ['Equal', 187], '+': ['Equal', 187],
  '_': ['Minus', 189],
  a: ['KeyA', 65], b: ['KeyB', 66], c: ['KeyC', 67], d: ['KeyD', 68],
  e: ['KeyE', 69], f: ['KeyF', 70], g: ['KeyG', 71], h: ['KeyH', 72],
  i: ['KeyI', 73], j: ['KeyJ', 74], k: ['KeyK', 75], l: ['KeyL', 76],
  m: ['KeyM', 77], n: ['KeyN', 78], o: ['KeyO', 79], p: ['KeyP', 80],
  q: ['KeyQ', 81], r: ['KeyR', 82], s: ['KeyS', 83], t: ['KeyT', 84],
  u: ['KeyU', 85], v: ['KeyV', 86], w: ['KeyW', 87], x: ['KeyX', 88],
  y: ['KeyY', 89], z: ['KeyZ', 90],
}

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
      const [code, keyCode] = keyCodeMap[key.toLowerCase()] || ['', 0]
      const opts: KeyboardEventInit & { keyCode: number } = {
        key, code, keyCode, ctrlKey, shiftKey, metaKey, bubbles: true, cancelable: true
      }
      target.dispatchEvent(new KeyboardEvent('keydown', opts))
      target.dispatchEvent(new KeyboardEvent('keyup', opts))
      i++
    }
  }
}

export function fixTableIr() {
  const eventRoot = vditor.vditor.ir.element

  function insertTablePanel() {
    let tablePanel = eventRoot.querySelector<HTMLDivElement>(`#${tablePanelId}`)
    if (!tablePanel) {
      tablePanel = document.createElement('div')
      tablePanel.id = tablePanelId
      eventRoot.appendChild(tablePanel)
      tablePanel.innerHTML = `<div
    class="vditor-panel vditor-panel--none vditor-panel-ir"
    data-top="73"
    style="left: 35px; top: 73px;display:none"
  >
   <button
      type="button"
      aria-label="${i18n[lang].alignLeft}<${updateHotkeyTip('⇧⌘L')}>"
      data-type="left"
      class="vditor-icon vditor-tooltipped vditor-tooltipped__n vditor-icon--current"
    >
      <svg><use xlink:href="#vditor-icon-align-left"></use></svg></button
    ><button
      type="button"
      aria-label="${i18n[lang].alignCenter}<${updateHotkeyTip('⇧⌘C')}>"
      data-type="center"
      class="vditor-icon vditor-tooltipped vditor-tooltipped__n"
    >
      <svg><use xlink:href="#vditor-icon-align-center"></use></svg></button
    ><button
      type="button"
      aria-label="${i18n[lang].alignRight}<${updateHotkeyTip('⇧⌘R')}>"
      data-type="right"
      class="vditor-icon vditor-tooltipped vditor-tooltipped__n"
    >
      <svg><use xlink:href="#vditor-icon-align-right"></use></svg></button
    ><button
      type="button"
      aria-label="${i18n[lang].insertRowAbove}<${updateHotkeyTip('⇧⌘F')}>"
      data-type="insertRowA"
      class="vditor-icon vditor-tooltipped vditor-tooltipped__n"
    >
      <svg><use xlink:href="#vditor-icon-insert-rowb"></use></svg></button
    ><button
      type="button"
      aria-label="${i18n[lang].insertRowBelow}<${updateHotkeyTip('⌘=')}>"
      data-type="insertRowB"
      class="vditor-icon vditor-tooltipped vditor-tooltipped__n"
    >
      <svg><use xlink:href="#vditor-icon-insert-row"></use></svg></button
    ><button
      type="button"
      aria-label="${i18n[lang].insertColumnLeft}<${updateHotkeyTip('⇧⌘G')}>"
      data-type="insertColumnL"
      class="vditor-icon vditor-tooltipped vditor-tooltipped__n"
    >
      <svg><use xlink:href="#vditor-icon-insert-columnb"></use></svg></button
    ><button
      type="button"
      aria-label="${i18n[lang].insertColumnRight}<${updateHotkeyTip('⇧⌘=')}>"
      data-type="insertColumnR"
      class="vditor-icon vditor-tooltipped vditor-tooltipped__n"
    >
      <svg><use xlink:href="#vditor-icon-insert-column"></use></svg></button
    ><button
      type="button"
      aria-label="${i18n[lang]['delete-row']}<${updateHotkeyTip('⌘-')}>"
      data-type="deleteRow"
      class="vditor-icon vditor-tooltipped vditor-tooltipped__n"
    >
      <svg><use xlink:href="#vditor-icon-delete-row"></use></svg></button
    ><button
      type="button"
      aria-label="${i18n[lang]['delete-column']}<${updateHotkeyTip('⇧⌘-')}>"
      data-type="deleteColumn"
      class="vditor-icon vditor-tooltipped vditor-tooltipped__n"
    >
      <svg><use xlink:href="#vditor-icon-delete-column"></use></svg></button
    >
  </div>
  `
      $(tablePanel).on('click', '.vditor-icon', (e) => {
        let type = $(e.target).attr('data-type')
        const handleMap = {
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
          ], // 有的是+ 有的是=; -/_ 都是为了fix不同平 bug
        }
        let k =
          handleMap[type][
            navigator.platform.toLowerCase().includes('mac') ? 1 : 0
          ]
        disableVscodeHotkeys = true
        simulateKeys(k, eventRoot)
        disableVscodeHotkeys = false
        e.stopPropagation()
      })
    }
    tablePanel = tablePanel.children[0] as HTMLDivElement
    return tablePanel
  }

  eventRoot.addEventListener('click', (e) => {
    if (vditor.getCurrentMode() !== 'ir') return
    const tablePanel = insertTablePanel()
    let clickEl = window.getSelection().anchorNode.parentElement
    if (['TD', 'TH', 'TR'].includes(clickEl.tagName)) {
      if (tablePanel.style.display !== 'block') {
        tablePanel.style.display = 'block'
      }
      tablePanel.style.top =
        clickEl.getBoundingClientRect().top -
        eventRoot.getBoundingClientRect().top +
        eventRoot.scrollTop -
        25 +
        'px'
    } else {
      if (tablePanel.style.display !== 'none') {
        tablePanel.style.display = 'none'
      }
    }
  })
  // don't bubble keyboardEvent to vscode when trigger vditor table hot keys, prevent hotkey conflicts with vscode
  let stopEvent = (e: KeyboardEvent) => {
    if (disableVscodeHotkeys) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  eventRoot.addEventListener('keydown', stopEvent)
  eventRoot.addEventListener('keyup', stopEvent)
}
