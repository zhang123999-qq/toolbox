import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { ExtraInputDef, OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  canonicalType,
  decodeFunctionCall,
  encodeFunctionCall,
  functionSelector,
  parseSignature,
} from './utils'
import type { AbiCodecInput, AbiCodecOptions } from './schema'

/** 示例：ERC-20 transfer 编码 */
const EXAMPLE: AbiCodecInput = {
  text: 'transfer(address,uint256)',
  params: ['0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', '1000'].join('\n'),
}

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

const extraInputs: readonly ExtraInputDef[] = [
  { key: 'params', label: '参数（编码：每行一个；解码：calldata hex）', rows: 6 },
]

/** 参数行：去掉末尾空行（尾随换行），保留行内空字符串参数 */
function splitValues(params: string): string[] {
  const lines = params.split('\n').map((l) => l.trim())
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

function computeText(input: AbiCodecInput, options: AbiCodecOptions): string {
  const sig = input.text.trim() === '' ? EXAMPLE.text : input.text.trim()
  if (options.mode === 'encode') {
    const params = input.params === '' ? EXAMPLE.params : input.params
    const values = splitValues(params)
    const { types } = parseSignature(sig)
    const calldata = encodeFunctionCall(sig, values)
    const typeList = types.map(canonicalType).join(', ')
    return [`函数：${sig}`, `选择器：${functionSelector(sig)}`, `参数类型：${typeList}`, `calldata：${calldata}`].join(
      '\n',
    )
  }
  const hex = input.params === '' ? '' : input.params.replace(/\s+/g, '')
  const decoded = decodeFunctionCall(sig, hex)
  const { types } = parseSignature(sig)
  const lines = [
    `函数：${decoded.name}`,
    `选择器：${decoded.selector}`,
    ...decoded.values.map((v, i) => `参数${i} (${canonicalType(types[i])})：${v}`),
  ]
  return lines.join('\n')
}

export default function Tool() {
  const optionDefs: readonly OptionDef<AbiCodecOptions>[] = [
    { key: 'mode', label: '模式', kind: 'select', values: ['encode', 'decode'] },
  ]

  function renderOutput(input: AbiCodecInput, options: AbiCodecOptions) {
    try {
      const lines = computeText(input, options).split('\n')
      return (
        <div data-testid="results" className="space-y-2">
          {lines.map((line, i) => (
            <p key={i} data-testid={`result-${i}`} className="font-mono text-xs break-all">
              {line}
            </p>
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
    <MultiPanel<AbiCodecInput, AbiCodecOptions>
      meta={meta}
      initialInput={{ text: '', params: '' }}
      initialOptions={{ mode: 'encode' }}
      example={EXAMPLE}
      extraInputs={extraInputs}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={computeText}
      downloadExt="txt"
    />
  )
}
