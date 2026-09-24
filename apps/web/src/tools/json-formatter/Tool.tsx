import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonInput, JsonOptions } from './schema'

const EXAMPLE: JsonInput = { text: '{"name":"工具库","tools":870,"local":true}' }

export default function Tool() {
  const t = useTranslate()

  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<JsonOptions>[] = [
    { key: 'indent', label: t('jsonFormatter.option.indent'), kind: 'select', values: [2, 4] },
    { key: 'sortKeys', label: t('jsonFormatter.option.sortKeys'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<JsonInput, JsonOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ indent: '2', sortKeys: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
