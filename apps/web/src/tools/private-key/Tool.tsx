import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { generatePrivateKeys } from './utils'
import type { PrivateKeyInput, PrivateKeyOptions } from './schema'

/** 生成器无需输入，输入框只作触发用 */
const EXAMPLE: PrivateKeyInput = { text: '' }

export default function Tool() {
  const optionDefs: readonly OptionDef<PrivateKeyOptions>[] = [
    { key: 'count', label: '生成数量（1–100）', kind: 'text', placeholder: '5' },
    { key: 'prefix', label: '带 0x 前缀', kind: 'boolean' },
  ]

  return (
    <TwoColumn<PrivateKeyInput, PrivateKeyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ count: '5', prefix: true }}
      run={(_input, options) => {
        const count = Number.parseInt(options.count.trim(), 10)
        return generatePrivateKeys(count, options.prefix).join('\n')
      }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="设置数量后点「运行」生成私钥（仅供学习/测试，请勿用于真实资金）"
    />
  )
}
