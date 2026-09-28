import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { RandomNameInput, RandomNameOptions } from './schema'

/** 示例：无输入，直接随机生成 */
const EXAMPLE: RandomNameInput = { text: '' }

export default function Tool() {
  const optionDefs: readonly OptionDef<RandomNameOptions>[] = [
    { key: 'count', label: '数量', kind: 'text', placeholder: '1' },
    { key: 'gender', label: '性别', kind: 'select', values: ['random', 'male', 'female'] },
    { key: 'language', label: '语言', kind: 'select', values: ['zh', 'en'] },
  ]
  return (
    <TwoColumn<RandomNameInput, RandomNameOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ count: '1', gender: 'random', language: 'zh' }}
      run={(input, options) => transform(input, options)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
