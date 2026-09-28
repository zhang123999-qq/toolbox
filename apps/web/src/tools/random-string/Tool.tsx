import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { CHARSET_KEYS, transform } from './utils'
import type { RandomStringInput, RandomStringOptions } from './schema'

/** 示例：输入框只作触发用 */
const EXAMPLE: RandomStringInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<RandomStringOptions>[] = [
    { key: 'length', label: '长度', kind: 'text', placeholder: '32' },
    { key: 'charset', label: '字符集', kind: 'select', values: CHARSET_KEYS },
    {
      key: 'customCharset',
      label: '自定义字符集',
      kind: 'text',
      placeholder: '仅当字符集选 custom 时生效',
    },
  ]

  return (
    <TwoColumn<RandomStringInput, RandomStringOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ length: '32', charset: 'alnum', customCharset: '' }}
      run={(input, options) => transform(input, options)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
