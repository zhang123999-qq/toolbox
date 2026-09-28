import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { MathFormulaInput, MathFormulaOptions } from './schema'
import { calcFormula, FORMULAS, getFormula, parseVars } from './utils'

interface FormulaView {
  error: string
  detail: string
}

function buildView(input: MathFormulaInput, options: MathFormulaOptions): FormulaView {
  try {
    const formula = getFormula(options.formula)
    const vars = parseVars(input.text)
    const value = calcFormula(formula.id, vars)
    const varList = formula.vars.map((v) => `${v.label}=${vars[v.key] ?? '?'}`).join('，')
    return {
      error: '',
      detail: `${formula.name}\n${formula.expr}\n${varList}\n结果：${value}`,
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '处理失败', detail: '' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<MathFormulaInput, MathFormulaOptions>
      meta={meta}
      initialInput={{ text: 'a=3 b=4' }}
      initialOptions={{ formula: 'pythagorean' }}
      example={{ text: 'a=3 b=4 c=5' }}
      optionDefs={[
        {
          key: 'formula',
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
              <p
                data-testid="math-formula-error"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {view.error}
              </p>
            )}
            {view.detail !== '' && (
              <p
                data-testid="math-formula-detail"
                className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"
              >
                {view.detail}
              </p>
            )}
          </div>
        )
      }}
      toText={(input, options) => buildView(input, options).detail}
    />
  )
}
