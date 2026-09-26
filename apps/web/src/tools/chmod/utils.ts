/** 数字位 → 符号：7 → rwx，0 → ---（不含特殊位） */
export function digitToSymbol(digit: number): string {
  if (digit < 0 || digit > 7) throw new Error('权限位必须在 0-7 之间：' + digit)
  return (digit & 4 ? 'r' : '-') + (digit & 2 ? 'w' : '-') + (digit & 1 ? 'x' : '-')
}

/** 符号 → 数字：rwx → 7，--- → 0（仅单段 3 字符，不含 s/t 特殊位） */
export function symbolToDigit(sym: string): number {
  if (sym.length !== 3) throw new Error('符号段必须是 3 个字符：' + sym)
  let n = 0
  if (sym[0] === 'r') n += 4
  else if (sym[0] !== '-') throw new Error('无法识别的读权限字符：' + sym[0])
  if (sym[1] === 'w') n += 2
  else if (sym[1] !== '-') throw new Error('无法识别的写权限字符：' + sym[1])
  if (sym[2] === 'x') n += 1
  else if (sym[2] !== '-') throw new Error('无法识别的执行权限字符：' + sym[2])
  return n
}

/** 特殊位（SUID=4 / SGID=2 / sticky=1）在第 idx 段执行位上的符号，无则返回 undefined */
function specialExecChar(idx: number, special: number, digit: number): string | undefined {
  const hasX = (digit & 1) === 1
  if (idx === 0 && special & 4) return hasX ? 's' : 'S' // SUID 在所有者执行位
  if (idx === 1 && special & 2) return hasX ? 's' : 'S' // SGID 在所属组执行位
  if (idx === 2 && special & 1) return hasX ? 't' : 'T' // sticky 在其他人执行位
  return undefined
}

/** 解析 9 字符符号（允许 s/S/t/T 特殊位），得到三位基础权限与特殊位 */
function parseSymbolicFull(text: string): { perms: number[]; special: number; normalized: string } {
  if (!/^[rwxstST-]{9}$/.test(text)) {
    throw new Error('无法识别的权限格式：请输入 755 或 rwxr-xr-x')
  }
  const perms = [0, 0, 0]
  let special = 0
  const chars: string[] = []
  for (let i = 0; i < 9; i += 1) {
    const ch = text[i] as string
    const triad = (i / 3) | 0
    const slot = i % 3
    if (slot === 0) {
      if (ch === 'r') perms[triad] += 4
      else if (ch !== '-') throw new Error('无法识别的读权限字符：' + ch)
      chars.push(ch)
    } else if (slot === 1) {
      if (ch === 'w') perms[triad] += 2
      else if (ch !== '-') throw new Error('无法识别的写权限字符：' + ch)
      chars.push(ch)
    } else {
      // 执行位：x / - / s / S / t / T
      if (ch === 'x' || ch === 's' || ch === 't') perms[triad] += 1
      if (ch === 's' || ch === 'S') {
        if (triad === 0) special |= 4
        else if (triad === 1) special |= 2
        else throw new Error('s/S 只能出现在所有者或所属组的执行位')
      } else if (ch === 't' || ch === 'T') {
        if (triad !== 2) throw new Error('t/T 只能出现在其他人执行位')
        special |= 1
      } else if (ch !== 'x' && ch !== '-') {
        throw new Error('无法识别的执行权限字符：' + ch)
      }
      chars.push(ch)
    }
  }
  return { perms, special, normalized: chars.join('') }
}

export interface ChmodResult {
  readonly numeric: string
  readonly symbolic: string
}

/** 接受 "755" / "4755"（含 SUID/SGID/sticky）或 "rwxr-xr-x" / "rwsr-xr-x"，双向转换 */
export function parseChmod(raw: string): ChmodResult {
  const text = raw.trim()
  if (/^[0-7]{3,4}$/.test(text)) {
    const special = text.length === 4 ? Number(text[0]) : 0
    const permPart = text.slice(-3)
    const digits = permPart.split('').map(Number)
    const symbolic = digits
      .map((digit, idx) => {
        const base = digitToSymbol(digit)
        const sc = specialExecChar(idx, special, digit)
        return sc ? base.slice(0, 2) + sc : base
      })
      .join('')
    return { numeric: special > 0 ? String(special) + permPart : permPart, symbolic }
  }
  if (/^[rwxstST-]{9}$/.test(text)) {
    const { perms, special } = parseSymbolicFull(text)
    const ddd = perms.join('')
    return { numeric: special > 0 ? String(special) + ddd : ddd, symbolic: text }
  }
  throw new Error('无法识别的权限格式：请输入 755 或 rwxr-xr-x')
}

/** 取出特殊位数字（供 transform 展示）；输入为已 parse 的 symbolic */
function specialFromSymbolic(symbolic: string): number {
  const { special } = parseSymbolicFull(symbolic)
  return special
}

/** 把含 s/t 的符号还原为 chmod u=/g=/o= 可用的普通 rwx- 三段 */
function baseTriads(symbolic: string): string[] {
  return [symbolic.slice(0, 3), symbolic.slice(3, 6), symbolic.slice(6, 9)].map((seg) =>
    seg
      .split('')
      .map((c) => (c === 's' || c === 't' ? 'x' : c === 'S' || c === 'T' ? '-' : c))
      .join(''),
  )
}

export function transform(input: { text: string }): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const { numeric, symbolic } = parseChmod(input.text)
  const special = specialFromSymbolic(symbolic)

  const [owner, group, other] = baseTriads(symbolic)

  const lines = [`数字权限：${numeric}`, `符号权限：${symbolic}`]
  const specialNames: string[] = []
  if (special & 4) specialNames.push('SUID（setuid，位 4）')
  if (special & 2) specialNames.push('SGID（setgid，位 2）')
  if (special & 1) specialNames.push('粘滞位（sticky，位 1）')
  if (specialNames.length) lines.push(`特殊权限：${specialNames.join('、')}`)
  lines.push(
    '',
    '对象 | 读 | 写 | 执行',
    '--- | --- | --- | ---',
    `所有者 | ${owner[0]} | ${owner[1]} | ${symbolic[2]}`,
    `所属组 | ${group[0]} | ${group[1]} | ${symbolic[5]}`,
    `其他人 | ${other[0]} | ${other[1]} | ${symbolic[8]}`,
    '',
    '# 等价命令',
    `chmod ${numeric} <文件>`,
    `chmod u=${owner},g=${group},o=${other} <文件>`,
  )
  if (special & 4) lines.push('chmod u+s <文件>  # 设置 SUID')
  if (special & 2) lines.push('chmod g+s <文件>  # 设置 SGID')
  if (special & 1) lines.push('chmod o+t <文件>  # 设置粘滞位')

  return lines.join('\n')
}
