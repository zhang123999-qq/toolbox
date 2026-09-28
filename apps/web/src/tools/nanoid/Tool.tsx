import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { DEFAULT_ALPHABET, transform } from './utils'
import type { NanoidInput, NanoidOptions } from './schema'

/** 示例：输入框只作触发用 */
const EXAMPLE: NanoidInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<NanoidOptions>[] = [
    { key: 'length', label: '长度', kind: 'text', placeholder: '21' },
    { key: 'alphabet', label: '字母表', kind: 'text', placeholder: DEFAULT_ALPHABET },
  ]

  return (
    <TwoColumn<NanoidInput, NanoidOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ length: '21', alphabet: DEFAULT_ALPHABET }}
      run={(input, options) => transform(input, options)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
