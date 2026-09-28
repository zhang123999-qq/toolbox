import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { PhysicsFormulaInput, PhysicsFormulaOptions } from './schema'
import { calcFormula, describeFormula, FORMULAS, getFormula, listFormulas } from './utils'

interface FormulaView {
  error: string
  detail: string
}

/** 解析「symbol=value」多行赋值为数值表 */
function parseAssignments(text: string): Record<string, number> {
  const vars: Record<string, number> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) throw new Error(`赋值行格式非法（须为 symbol=value）：${trimmed}`)
    const symbol = trimmed.slice(0, eq).trim()
    const raw = trimmed.slice(eq + 1).trim()
    if (symbol === '') throw new Error(`赋值行缺少变量名：${trimmed}`)
    const value = Number(raw)
    if (raw === '' || Number.isNaN(value)) throw new Error(`变量 ${symbol} 的值不是合法数字`)
    vars[symbol] = value
  }
  return vars
}

function buildView(input: PhysicsFormulaInput, options: PhysicsFormulaOptions): FormulaView {
  try {
    if (options.mode === 'lookup') {
      return { error: '', detail: listFormulas() }
    }
    const formula = getFormula(options.formulaId)
    const vars = parseAssignments(input.text)
    const result = calcFormula(formula.id, vars)
    return {
      error: '',
      detail: `${describeFormula(formula)}\n\n计算结果：${result}`,
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '处理失败', detail: '' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<PhysicsFormulaInput, PhysicsFormulaOptions>
      meta={meta}
      initialInput={{ text: 'm=2\na=3' }}
      initialOptions={{ mode: 'calc', formulaId: 'force' }}
      example={{ text: 'U=220\nI=2' }}
      optionDefs={[
        { key: 'mode', label: '模式', kind: 'select', values: ['lookup', 'calc'] },
        {
          key: 'formulaId',
          label: '公式',
          kind: 'select',
          values: FORMULAS.map((f) => f.id),
        },
      ]}
      renderOutput={(input, options) => {
        const view = buildView(input, options)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="physics-formula-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.detail !== '' && (
              <p data-testid="physics-formula-detail" className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {view.detail}
              </p>
            )}
          </div>
        )
      }}
      toText={(input, options) => buildView(input, options).detail}
      downloadExt="txt"
    />
  )
}
