import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { hashKeccak256 } from './utils'
import type { Keccak256Input, Keccak256Options } from './schema'

/** 示例：hello 的 Keccak-256（已验证向量） */
const EXAMPLE: Keccak256Input = { text: 'hello' }

export default function Tool() {
  const optionDefs: readonly OptionDef<Keccak256Options>[] = [
    { key: 'inputKind', label: '输入类型', kind: 'select', values: ['text', 'hex'] },
    { key: 'format', label: '输出格式', kind: 'select', values: ['hex', 'base64'] },
  ]

  return (
    <TwoColumn<Keccak256Input, Keccak256Options>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ inputKind: 'text', format: 'hex' }}
      run={(input, options) => {
        const text = input.text.trim() === '' ? EXAMPLE.text : input.text
        return hashKeccak256(text, options.inputKind, options.format)
      }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="输入内容后自动计算 Keccak-256 摘要"
    />
  )
}
