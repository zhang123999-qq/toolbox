import type { FullwidthInput, FullwidthOptions } from './schema'

const FULL_SPACE = 0x3000
const FULL_START = 0xff01
const FULL_END = 0xff5e
const ASCII_START = 0x21
const ASCII_END = 0x7e
/** 全角与半角的码位差 */
const OFFSET = 0xfee0

/** 全角 → 半角：全角空格映射为普通空格，其余按码位差回退 */
export function toHalfWidth(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code === FULL_SPACE) out += ' '
    else if (code >= FULL_START && code <= FULL_END) out += String.fromCharCode(code - OFFSET)
    else out += ch
  }
  return out
}

/** 半角 → 全角：普通空格映射为全角空格，ASCII 可见字符按码位差前移 */
export function toFullWidth(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code === 0x20) out += String.fromCharCode(FULL_SPACE)
    else if (code >= ASCII_START && code <= ASCII_END) out += String.fromCharCode(code + OFFSET)
    else out += ch
  }
  return out
}

export function transform(input: FullwidthInput, options: FullwidthOptions): string {
  if (input.text === '') return ''
  return options.mode === 'toFull' ? toFullWidth(input.text) : toHalfWidth(input.text)
}
