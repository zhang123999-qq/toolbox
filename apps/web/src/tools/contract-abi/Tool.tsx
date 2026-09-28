import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { abiToItems, filterItems, parseAbi, type AbiItem } from './utils'
import type { ContractAbiInput, ContractAbiOptions } from './schema'

/** 示例：ERC20 子集 ABI */
const EXAMPLE: ContractAbiInput = {
  text: `[
  {"type":"function","name":"transfer","inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable"},
  {"type":"function","name":"balanceOf","inputs":[{"name":"account","type":"address"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
  {"type":"event","name":"Transfer","inputs":[{"name":"from","type":"address","indexed":true},{"name":"to","type":"address","indexed":true},{"name":"value","type":"uint256","indexed":false}],"anonymous":false}
]`,
}

const OPTION_DEFS: readonly OptionDef<ContractAbiOptions>[] = [
  { key: 'keyword', label: '按名称过滤', kind: 'text', placeholder: '如 transfer' },
]

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

function compute(input: ContractAbiInput, options: ContractAbiOptions): AbiItem[] {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  return filterItems(abiToItems(parseAbi(text)), options.keyword)
}

function itemsToText(items: AbiItem[]): string {
  return items
    .map((it) => `[${it.kind}] ${it.signature} → ${it.hash}（${it.mutability}）参数：${it.inputs}`)
    .join('\n')
}

export default function Tool() {
  function renderOutput(input: ContractAbiInput, options: ContractAbiOptions) {
    try {
      const items = compute(input, options)
      return (
        <div data-testid="results" className="space-y-2">
          {items.length === 0 ? <p className="text-sm text-gray-500">无匹配条目</p> : null}
          {items.map((it) => (
            <div key={it.kind + it.signature} className="rounded border p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span
                  data-testid="value-kind"
                  className={
                    it.kind === 'function'
                      ? 'mr-2 rounded bg-blue-100 px-1 text-blue-700'
                      : 'mr-2 rounded bg-purple-100 px-1 text-purple-700'
                  }
                >
                  {it.kind}
                </span>
                {it.mutability}
              </p>
              <p className="font-mono text-xs break-all" data-testid="value-signature">
                {it.signature}
              </p>
              <p
                className="font-mono text-xs break-all text-gray-600 dark:text-gray-300"
                data-testid="value-hash"
              >
                {it.hash}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">参数：{it.inputs}</p>
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
    <MultiPanel<ContractAbiInput, ContractAbiOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ keyword: '' }}
      optionDefs={OPTION_DEFS}
      example={EXAMPLE}
      renderOutput={renderOutput}
      toText={(input, options) => itemsToText(compute(input, options))}
      downloadExt="txt"
    />
  )
}
