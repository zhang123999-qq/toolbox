import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { FakeDataInput, FakeDataOptions } from './schema'

/** 示例：生成姓名 / 邮箱 / 电话 */
const EXAMPLE: FakeDataInput = { text: 'name\nemail\nphone' }

export default function Tool() {
  const optionDefs: readonly OptionDef<FakeDataOptions>[] = [
    { key: 'count', label: '数量', kind: 'text', placeholder: '1' },
    { key: 'language', label: '语言', kind: 'select', values: ['zh', 'en'] },
    { key: 'format', label: '输出格式', kind: 'select', values: ['json', 'lines'] },
  ]
  return (
    <TwoColumn<FakeDataInput, FakeDataOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ count: '1', language: 'zh', format: 'json' }}
      run={(input, options) => transform(input, options)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
