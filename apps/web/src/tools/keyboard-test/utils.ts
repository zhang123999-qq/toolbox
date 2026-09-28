/**
 * keyboard-test —— 键盘检测的纯函数层
 *
 * 归一化按键信息、键盘分区查询、按下集合管理均为纯函数；
 * keydown / keyup 监听只在 Tool.tsx 中，可在 node 下被 vitest 完整测试。
 */

/** 归一化后的按键信息 */
export interface KeyInfo {
  readonly key: string
  readonly code: string
  readonly keyCode: number
}

/**
 * 从 KeyboardEvent（或字面量测试对象）提取按键信息。
 * 缺字段时用兜底值，保证永不抛错。
 */
export function normalizeKey(event: {
  readonly key?: unknown
  readonly code?: unknown
  readonly keyCode?: unknown
}): KeyInfo {
  return {
    key: typeof event.key === 'string' ? event.key : 'Unknown',
    code: typeof event.code === 'string' ? event.code : 'Unknown',
    keyCode: typeof event.keyCode === 'number' ? event.keyCode : 0,
  }
}

/** 键盘分区 */
export interface KeyZone {
  readonly id: string
  readonly name: string
  readonly codes: readonly string[]
}

/** 键盘分区表：功能键 / 主键盘 / 编辑区 / 数字区 / 小键盘 / 修饰键 */
export const KEY_ZONES: readonly KeyZone[] = [
  {
    id: 'function',
    name: '功能键区',
    codes: [
      'Escape',
      'F1',
      'F2',
      'F3',
      'F4',
      'F5',
      'F6',
      'F7',
      'F8',
      'F9',
      'F10',
      'F11',
      'F12',
      'PrintScreen',
      'ScrollLock',
      'Pause',
    ],
  },
  {
    id: 'main',
    name: '主键盘区',
    codes: [
      'Backquote',
      'Digit1',
      'Digit2',
      'Digit3',
      'Digit4',
      'Digit5',
      'Digit6',
      'Digit7',
      'Digit8',
      'Digit9',
      'Digit0',
      'Minus',
      'Equal',
      'Backspace',
      'Tab',
      'KeyQ',
      'KeyW',
      'KeyE',
      'KeyR',
      'KeyT',
      'KeyY',
      'KeyU',
      'KeyI',
      'KeyO',
      'KeyP',
      'BracketLeft',
      'BracketRight',
      'Backslash',
      'CapsLock',
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyF',
      'KeyG',
      'KeyH',
      'KeyJ',
      'KeyK',
      'KeyL',
      'Semicolon',
      'Quote',
      'Enter',
      'KeyZ',
      'KeyX',
      'KeyC',
      'KeyV',
      'KeyB',
      'KeyN',
      'KeyM',
      'Comma',
      'Period',
      'Slash',
      'Space',
    ],
  },
  {
    id: 'edit',
    name: '编辑键区',
    codes: [
      'Insert',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ],
  },
  {
    id: 'numpad',
    name: '数字小键盘',
    codes: [
      'NumLock',
      'NumpadDivide',
      'NumpadMultiply',
      'NumpadSubtract',
      'NumpadAdd',
      'NumpadEnter',
      'NumpadDecimal',
      'Numpad0',
      'Numpad1',
      'Numpad2',
      'Numpad3',
      'Numpad4',
      'Numpad5',
      'Numpad6',
      'Numpad7',
      'Numpad8',
      'Numpad9',
    ],
  },
  {
    id: 'modifier',
    name: '修饰键',
    codes: [
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'ControlRight',
      'AltLeft',
      'AltRight',
      'MetaLeft',
      'MetaRight',
      'ContextMenu',
    ],
  },
]

/** 按 event.code 查分区名；未知 code 返回「其他」 */
export function zoneOfCode(code: string): string {
  for (const zone of KEY_ZONES) {
    if (zone.codes.includes(code)) return zone.name
  }
  return '其他'
}

/**
 * 按下集合管理：down=true 加入，down=false 移除。
 * 返回新集合，不修改传入集合。
 */
export function trackPressed(
  pressed: ReadonlySet<string>,
  code: string,
  down: boolean,
): Set<string> {
  const next = new Set(pressed)
  if (down) {
    next.add(code)
  } else {
    next.delete(code)
  }
  return next
}

/** 按键信息 → 可读的一行文本 */
export function formatKeyLabel(info: KeyInfo): string {
  return `键名「${info.key}」｜code ${info.code}｜keyCode ${info.keyCode}｜分区：${zoneOfCode(info.code)}`
}
