import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { ExtraInputDef, OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildUnsignedTx, type BuiltTx } from './utils'
import type { TxBuildInput, TxBuildOptions } from './schema'

/** 示例：向已知地址转 0.001 ETH（Legacy，20 gwei） */
const EXAMPLE: TxBuildInput = {
  text: '',
  nonce: '7',
  gasLimit: '21000',
  to: '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
  value: '1000000000000000',
  data: '',
  chainId: '1',
  gasPrice: '20000000000',
  maxPriorityFeePerGas: '1000000000',
  maxFeePerGas: '2000000000',
}

const OPTION_DEFS: readonly OptionDef<TxBuildOptions>[] = [
  { key: 'txType', label: '交易类型', kind: 'select', values: ['legacy', 'eip1559'] },
]

const EXTRA_INPUTS: readonly ExtraInputDef[] = [
  { key: 'nonce', label: 'nonce', rows: 1 },
  { key: 'to', label: 'to（收款地址，留空=合约创建）', rows: 1 },
  { key: 'value', label: 'value（wei，十进制或 0x）', rows: 1 },
  { key: 'data', label: 'data（hex，可空）', rows: 1 },
  { key: 'gasLimit', label: 'gasLimit', rows: 1 },
  { key: 'gasPrice', label: 'gasPrice（wei，仅 Legacy）', rows: 1 },
  { key: 'maxPriorityFeePerGas', label: 'maxPriorityFeePerGas（wei，仅 EIP-1559）', rows: 1 },
  { key: 'maxFeePerGas', label: 'maxFeePerGas（wei，仅 EIP-1559）', rows: 1 },
  { key: 'chainId', label: 'chainId（默认 1）', rows: 1 },
]

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

function compute(input: TxBuildInput, options: TxBuildOptions): BuiltTx {
  const filled: TxBuildInput = { ...EXAMPLE, ...input }
  // 空输入整体回退到示例
  const allEmpty = [input.nonce, input.to, input.value, input.gasLimit].every(
    (v) => v.trim() === '',
  )
  return buildUnsignedTx(allEmpty ? EXAMPLE : filled, options)
}

function builtToText(built: BuiltTx): string {
  const lines = built.fields.map((f) => `${f.label}：${f.value}`)
  lines.push(`待签名交易：${built.rlpHex}`)
  return lines.join('\n')
}

export default function Tool() {
  function renderOutput(input: TxBuildInput, options: TxBuildOptions) {
    try {
      const built = compute(input, options)
      return (
        <div data-testid="results" className="space-y-2">
          {built.fields.map((f) => (
            <div key={f.key} className="rounded border p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">{f.label}</p>
              <p className="font-mono text-xs break-all" data-testid={`value-${f.key}`}>
                {f.value}
              </p>
            </div>
          ))}
          <div className="rounded border p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              待签名交易 hex（签名后才有交易哈希）
            </p>
            <p className="font-mono text-xs break-all" data-testid="value-rlp">
              {built.rlpHex}
            </p>
          </div>
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
    <MultiPanel<TxBuildInput, TxBuildOptions>
      meta={meta}
      initialInput={{
        text: '',
        nonce: '',
        gasLimit: '',
        to: '',
        value: '',
        data: '',
        chainId: '',
        gasPrice: '',
        maxPriorityFeePerGas: '',
        maxFeePerGas: '',
      }}
      initialOptions={{ txType: 'legacy' }}
      optionDefs={OPTION_DEFS}
      extraInputs={EXTRA_INPUTS}
      example={EXAMPLE}
      renderOutput={renderOutput}
      toText={(input, options) => builtToText(compute(input, options))}
      downloadExt="txt"
    />
  )
}
