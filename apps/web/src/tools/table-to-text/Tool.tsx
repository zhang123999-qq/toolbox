import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TableToTextInput, TableToTextOptions } from './schema'

const EXAMPLE: TableToTextInput = { text: 'name\tage\tcity\n张三\t28\t北京\n李四\t31\t上海' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TableToTextOptions>[] = [
    {
      key: 'delimiter',
      label: t('option.delimiter'),
      kind: 'select',
      values: ['auto', 'comma', 'tab', 'semicolon', 'pipe', 'space'],
    },
    {
      key: 'format',
      label: t('option.format'),
      kind: 'select',
      values: ['markdown', 'csv', 'json'],
    },
    { key: 'header', label: t('option.header'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<TableToTextInput, TableToTextOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ delimiter: 'auto', format: 'markdown', header: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
