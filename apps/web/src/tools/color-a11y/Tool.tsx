import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { colorBlindReport, formatColorA11yReport, type ColorA11yReport } from './utils'
import type { ColorA11yInput, ColorA11yOptions } from './schema'

/** 示例：白字黑底 */
const EXAMPLE: ColorA11yInput = { text: '#ffffff', bg: '#000000' }

const extraInputs: readonly ExtraInputDef[] = [{ key: 'bg', label: '背景色（#rrggbb / 颜色名）' }]

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

function compute(input: ColorA11yInput): ColorA11yReport {
  const fg = input.text.trim() === '' ? EXAMPLE.text : input.text
  const bg = input.bg.trim() === '' ? EXAMPLE.bg : input.bg
  return colorBlindReport(fg, bg)
}

function toText(input: ColorA11yInput): string {
  try {
    return formatColorA11yReport(compute(input))
  } catch (e) {
    return `检查失败：${e instanceof Error ? e.message : String(e)}`
  }
}

export default function Tool() {
  function renderOutput(input: ColorA11yInput) {
    try {
      const r = compute(input)
      return (
        <div data-testid="results" className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              data-testid="result-swatch-0"
              title={`前景 ${r.fg}`}
              className="inline-block h-10 w-10 rounded border border-gray-300"
              style={{ backgroundColor: r.fg }}
            />
            <span
              data-testid="result-swatch-1"
              title={`背景 ${r.bg}`}
              className="inline-block h-10 w-10 rounded border border-gray-300"
              style={{ backgroundColor: r.bg }}
            />
            <p data-testid="result-verdict" className="text-sm font-bold">
              {r.colorBlindSafe ? '色盲安全：四种色觉下均通过 AA' : '不安全：存在色盲用户难以辨识的风险'}
            </p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-1 pr-2">视觉模型</th>
                <th className="py-1 pr-2">对比度</th>
                <th className="py-1">AA</th>
              </tr>
            </thead>
            <tbody>
              <tr data-testid="result-normal">
                <td className="py-1 pr-2">正常视觉</td>
                <td className="py-1 pr-2 font-mono">{r.normalRatio.toFixed(2)}</td>
                <td className="py-1">{r.normalPassAA ? '通过' : '未通过'}</td>
              </tr>
              {r.simulations.map((s) => (
                <tr key={s.type} data-testid={`result-${s.type}`}>
                  <td className="py-1 pr-2">{s.label}</td>
                  <td className="py-1 pr-2 font-mono">{s.ratio.toFixed(2)}</td>
                  <td className="py-1">{s.passAA ? '通过' : '未通过'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    } catch (e) {
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<ColorA11yInput, ColorA11yOptions>
      meta={meta}
      initialInput={{ text: '', bg: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={extraInputs}
      renderOutput={renderOutput}
      toText={toText}
      downloadExt="txt"
    />
  )
}
