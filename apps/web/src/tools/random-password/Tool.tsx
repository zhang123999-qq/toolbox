import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { RandomPasswordInput, RandomPasswordOptions } from './schema'

/** 示例：输入框只作触发用，点「示例」填入占位符随即生成一条密码 */
const EXAMPLE: RandomPasswordInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<RandomPasswordOptions>[] = [
    { key: 'length', label: '长度', kind: 'text', placeholder: '16' },
    { key: 'includeUpper', label: '包含大写字母', kind: 'boolean' },
    { key: 'includeLower', label: '包含小写字母', kind: 'boolean' },
    { key: 'includeNumbers', label: '包含数字', kind: 'boolean' },
    { key: 'includeSymbols', label: '包含符号', kind: 'boolean' },
    { key: 'noAmbiguous', label: '排除易混淆字符', kind: 'boolean' },
  ]

  return (
    <TwoColumn<RandomPasswordInput, RandomPasswordOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        length: '16',
        includeUpper: true,
        includeLower: true,
        includeNumbers: true,
        includeSymbols: true,
        noAmbiguous: false,
      }}
      run={(input, options) => transform(input, options)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
