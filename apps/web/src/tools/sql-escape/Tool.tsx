import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SqlEscapeInput, SqlEscapeOptions } from './schema'

const EXAMPLE: SqlEscapeInput = { text: "O'Brien" }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<SqlEscapeOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['escape', 'unescape'],
    },
    {
      key: 'type',
      label: t('option.type'),
      kind: 'select',
      values: ['mysql', 'postgres', 'sqlserver'],
    },
    {
      key: 'quote',
      label: t('option.quote'),
      kind: 'boolean',
    },
  ]

  return (
    <TwoColumn<SqlEscapeInput, SqlEscapeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'escape', type: 'mysql', quote: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
