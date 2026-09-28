import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { checkContrast, suggestFix } from './utils'
import type { WcagContrastInput, WcagContrastOptions } from './schema'

/** 示例：白底黑字 */
const EXAMPLE: WcagContrastInput = { text: '#000000', bg: '#ffffff' }

function mark(ok: boolean): string {
  return ok ? '通过 ✓' : '不通过 ✗'
}

function run(input: WcagContrastInput): string {
  const fg = input.text.trim() === '' ? EXAMPLE.text : input.text
  const bg = input.bg.trim() === '' ? EXAMPLE.bg : input.bg
  const res = checkContrast(fg, bg)
  const lines = [
    `前景色：${res.fg}`,
    `背景色：${res.bg}`,
    `对比度：${res.ratio} : 1`,
    '',
    `正文 AA（≥4.5）：${mark(res.rating.normalAA)}`,
    `正文 AAA（≥7）：${mark(res.rating.normalAAA)}`,
    `大文本 AA（≥3）：${mark(res.rating.largeAA)}`,
    `大文本 AAA（≥4.5）：${mark(res.rating.largeAAA)}`,
    `UI 组件 / 图形（≥3）：${mark(res.rating.ui)}`,
  ]
  if (!res.rating.normalAA) {
    const fix = suggestFix(fg, bg, 4.5)
    lines.push('')
    if (fix) {
      lines.push(`修复建议：把前景色改为 ${fix.hex}（对比度 ${fix.ratio} : 1，可通过正文 AA）`)
    } else {
      lines.push('修复建议：未能找到达标的前景色，请更换配色方案')
    }
  }
  return lines.join('\n')
}

export default function Tool() {
  const extraInputs: readonly ExtraInputDef[] = [{ key: 'bg', label: '背景色', rows: 1 }]

  return (
    <TwoColumn<WcagContrastInput, WcagContrastOptions>
      meta={meta}
      initialInput={{ text: '', bg: '#ffffff' }}
      initialOptions={{}}
      run={run}
      idleText="输入前景色与背景色（#rrggbb / 颜色名 / rgb()）后点「运行」，检测 WCAG 对比度"
      example={EXAMPLE}
      extraInputs={extraInputs}
    />
  )
}
