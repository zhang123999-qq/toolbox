import type { PunycodeInput, PunycodeOptions } from './schema'

/**
 * RFC 3492（Punycode）自实现。
 *
 * 为什么不直接借 `URL.hostname` 或 Node 的 `punycode` 模块：
 *  • `URL` 对 IDN 的处理在 Node 与浏览器之间不一致，且会把非法标签静默改写，
 *    出错时用户看到的是「变了但不对」的结果，而不是一条可读的错误；
 *  • Node 的 `punycode` 已被标记废弃，且浏览器里没有这个模块，
 *    工具站要求纯浏览器可跑、零依赖。
 * 实现按 RFC 3492 §6.3 的伪代码逐行对照，常量即 §5 表格里的值。
 */

/** Bootstring 参数（RFC 3492 §5） */
const BASE = 36
const T_MIN = 1
const T_MAX = 26
const SKEW = 38
const DAMP = 700
const INITIAL_BIAS = 72
const INITIAL_N = 128

/** 基本码点（ASCII）与扩展码点的分界 */
const BASIC_MAX = 0x80

/** 保持最大整数不超过 2^31-1，防止溢出（RFC 3492 §6.3） */
const MAX_INT = 0x7fffffff

/** 标签分隔符 */
const DELIMITER = '-'

/** ACE 前缀（RFC 3490）：编码后的国际化标签一律以 xn-- 开头 */
const ACE_PREFIX = 'xn--'

/** 编码侧：把「码点值」映射成字母表字符 0-25 → a-z，26-35 → 0-9 */
function digitToBasic(digit: number): string {
  return String.fromCharCode(digit + 22 + 75 * (digit < 26 ? 1 : 0))
}

/**
 * 解码侧：字母表字符 → 码点值；
 * 不在 0-9 / A-Z / a-z 里的字符返回 BASE（调用方据此判定非法）。
 * 这里刻意不用「码点减去 48 后比较」的紧凑写法：那种写法会把 `<` `:` 之类
 * 也不小心算成合法数字，而 RFC 3492 的字母表只有 0-9 与 A-Z、a-z。
 */
function basicToDigit(code: number): number {
  if (code >= 0x30 && code <= 0x39) return code - 0x30 + 26
  if (code >= 0x41 && code <= 0x5a) return code - 0x41
  if (code >= 0x61 && code <= 0x7a) return code - 0x61
  return BASE
}

/** 可变长整数编码里的「阈值」调整（RFC 3492 §6.1） */
function adapt(delta: number, numPoints: number, firstTime: boolean): number {
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1
  delta += Math.floor(delta / numPoints)
  let k = 0
  while (delta > ((BASE - T_MIN) * T_MAX) >> 1) {
    delta = Math.floor(delta / (BASE - T_MIN))
    k += BASE
  }
  return k + Math.floor(((BASE - T_MIN + 1) * delta) / (delta + SKEW))
}

/** 单个标签的编码：输入 Unicode 标签，输出不含 xn-- 前缀的 Punycode 串 */
export function encodePunycodeLabel(label: string): string {
  const codePoints = Array.from(label, (ch) => ch.codePointAt(0) ?? 0)
  if (codePoints.length === 0) throw new Error('缺少可编码的标签内容')

  const output: number[] = []
  let basicCount = 0
  for (const codePoint of codePoints) {
    if (codePoint < BASIC_MAX) {
      output.push(codePoint)
      basicCount += 1
    }
  }

  let handled = basicCount
  // 基本码点（ASCII）原样保留在前，后面用 '-' 与可变长整数序列隔开（RFC 3492 §6.3 step 5）
  if (basicCount > 0) output.push(DELIMITER.charCodeAt(0))

  let n = INITIAL_N
  let delta = 0
  let bias = INITIAL_BIAS

  while (handled < codePoints.length) {
    let m = MAX_INT
    for (const codePoint of codePoints) {
      if (codePoint >= n && codePoint < m) m = codePoint
    }
    const handledPlusOne = handled + 1
    if (m - n > Math.floor((MAX_INT - delta) / handledPlusOne)) {
      throw new Error('编码失败：字符超出 Punycode 可表示范围')
    }
    delta += (m - n) * handledPlusOne
    n = m

    for (const codePoint of codePoints) {
      if (codePoint < n) {
        delta += 1
        if (delta > MAX_INT) throw new Error('编码失败：字符超出 Punycode 可表示范围')
      }
      if (codePoint === n) {
        let q = delta
        for (let k = BASE; ; k += BASE) {
          const threshold = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias
          if (q < threshold) break
          const rest = q - threshold
          const span = BASE - threshold
          output.push(digitToBasic(threshold + (rest % span)).charCodeAt(0))
          q = Math.floor(rest / span)
        }
        output.push(digitToBasic(q).charCodeAt(0))
        bias = adapt(delta, handledPlusOne, handled === basicCount)
        delta = 0
        handled += 1
      }
    }
    delta += 1
    n += 1
  }

  return String.fromCharCode(...output)
}

/** 单个标签的解码：输入不含 xn-- 前缀的 Punycode 串，输出 Unicode 标签 */
export function decodePunycodeLabel(label: string): string {
  if (label === '') throw new Error('缺少可解码的标签内容')

  const inputLength = label.length
  let n = INITIAL_N
  let i = 0
  let bias = INITIAL_BIAS

  // 最后一个分隔符之前是基本码点，之后是可变长整数序列
  let basicEnd = label.lastIndexOf(DELIMITER)
  if (basicEnd < 0) basicEnd = 0
  const output: number[] = []
  for (let j = 0; j < basicEnd; j += 1) {
    const code = label.charCodeAt(j)
    if (code >= BASIC_MAX) throw new Error(`不是合法的 Punycode：“${label}”的基本段含非 ASCII 字符`)
    output.push(code)
  }
  let index = basicEnd > 0 ? basicEnd + 1 : 0

  while (index < inputLength) {
    const oldi = i
    for (let w = 1, k = BASE; ; k += BASE) {
      if (index >= inputLength) throw new Error(`不是合法的 Punycode：“${label}”在数字中途结束`)
      const digit = basicToDigit(label.charCodeAt(index))
      index += 1
      if (digit >= BASE) throw new Error(`不是合法的 Punycode：“${label}”含非法字符`)
      i += digit * w
      const threshold = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias
      if (digit < threshold) break
      w *= BASE - threshold
    }
    const out = output.length + 1
    bias = adapt(i - oldi, out, oldi === 0)
    n += Math.floor(i / out)
    i %= out
    if (n > MAX_INT) throw new Error(`不是合法的 Punycode：“${label}”解得码点越界`)
    output.splice(i, 0, n)
    i += 1
  }

  return String.fromCodePoint(...output)
}

/** 域名编码：逐标签处理，只对含非 ASCII 的标签加 xn-- 前缀 */
export function encodePunycode(text: string): string {
  return text
    .split('.')
    .map((label) =>
      /[\u0080-\uffff]/.test(label) ? ACE_PREFIX + encodePunycodeLabel(label) : label,
    )
    .join('.')
}

/** 域名解码：逐标签处理，xn-- 前缀的标签还原成 Unicode */
export function decodePunycode(text: string): string {
  const labels = text.split('.')
  let found = false
  const decoded = labels.map((label) => {
    if (label.slice(0, ACE_PREFIX.length).toLowerCase() !== ACE_PREFIX) return label
    found = true
    return decodePunycodeLabel(label.slice(ACE_PREFIX.length))
  })
  if (!found) {
    throw new Error('解码失败：输入里没有 xn-- 前缀的 Punycode 标签')
  }
  return decoded.join('.')
}

export function transform(input: PunycodeInput, options: PunycodeOptions): string {
  if (input.text === '') return ''
  return options.direction === 'encode' ? encodePunycode(input.text) : decodePunycode(input.text)
}
