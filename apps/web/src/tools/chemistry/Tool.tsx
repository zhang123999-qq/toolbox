import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ChemistryInput, ChemistryOptions } from './schema'
import { balanceEquation, formatCounts, molarMass, parseFormula } from './utils'

interface ChemView {
  error: string
  detail: string
}

function buildView(input: ChemistryInput, options: ChemistryOptions): ChemView {
  try {
    const text = input.text.trim()
    if (options.mode === 'balance') {
      const query = text === '' ? 'H2+O2=H2O' : text
      const b = balanceEquation(query)
      return {
        error: '',
        detail: `配平结果：${b.balanced}\n系数：${b.coefficients.join(' : ')}`,
      }
    }
    if (options.mode === 'molar') {
      const query = text === '' ? 'H2O' : text
      return {
        error: '',
        detail: `${query} 的摩尔质量：${molarMass(query)} g/mol`,
      }
    }
    const query = text === '' ? 'Ca(OH)2' : text
    return { error: '', detail: `${query} → ${formatCounts(parseFormula(query))}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '处理失败', detail: '' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<ChemistryInput, ChemistryOptions>
      meta={meta}
      initialInput={{ text: 'H2+O2=H2O' }}
      initialOptions={{ mode: 'balance' }}
      example={{ text: 'CH4+O2=CO2+H2O' }}
      optionDefs={[{ key: 'mode', label: '模式', kind: 'select', values: ['balance', 'molar', 'parse'] }]}
      renderOutput={(input, options) => {
        const view = buildView(input, options)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="chemistry-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.detail !== '' && (
              <p data-testid="chemistry-detail" className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
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
