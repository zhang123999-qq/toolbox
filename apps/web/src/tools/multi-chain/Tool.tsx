import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { convertAll, type ConvertResult } from './utils'
import type { MultiChainInput, MultiChainOptions } from './schema'

/** 示例：TRON USDT 合约地址（ETH hex 形式），自动识别为 ETH→TRON */
const EXAMPLE: MultiChainInput = {
  text: '0xa614f803b6fd780986a42c78ec9c7f77e6ded13c',
}

const DIRECTION_LABELS: Record<MultiChainOptions['direction'], string> = {
  auto: '自动识别',
  'eth-to-tron': 'ETH → TRON',
  'tron-to-eth': 'TRON → ETH',
}

const OPTION_DEFS: readonly OptionDef<MultiChainOptions>[] = [
  {
    key: 'direction',
    label: '转换方向',
    kind: 'select',
    values: ['auto', 'eth-to-tron', 'tron-to-eth'],
  },
]

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

function compute(input: MultiChainInput, options: MultiChainOptions): ConvertResult[] {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  return convertAll({ text }, options)
}

function resultsToText(results: ConvertResult[]): string {
  return results
    .map((r) =>
      r.error !== undefined ? `${r.input} → 错误：${r.error}` : `${r.input} → ${r.output}`,
    )
    .join('\n')
}

export default function Tool() {
  function renderOutput(input: MultiChainInput, options: MultiChainOptions) {
    try {
      const results = compute(input, options)
      return (
        <div data-testid="results" className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            方向：{DIRECTION_LABELS[options.direction]}（TRON 地址为 base58check，0x41 前缀 + 双
            SHA-256 校验）
          </p>
          {results.map((r) => (
            <div key={r.input} className="rounded border p-2">
              <p className="font-mono text-xs break-all text-gray-500 dark:text-gray-400">
                {r.input}
              </p>
              {r.error !== undefined ? (
                <p role="alert" className={ERROR_CLASS}>
                  {r.error}
                </p>
              ) : (
                <p className="font-mono text-xs break-all" data-testid="value-output">
                  {r.output}
                </p>
              )}
            </div>
          ))}
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
    <MultiPanel<MultiChainInput, MultiChainOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'auto' }}
      optionDefs={OPTION_DEFS}
      example={EXAMPLE}
      renderOutput={renderOutput}
      toText={(input, options) => resultsToText(compute(input, options))}
      downloadExt="txt"
    />
  )
}
