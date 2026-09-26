import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonSortInput, JsonSortOptions } from './schema'

const EXAMPLE: JsonSortInput = {
  text: '{\n  "tools": 870,\n  "name": "工具库",\n  "tags": ["json", "static"]\n}',
}

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<JsonSortOptions>[] = [
    { key: 'descending', label: t('option.descending'), kind: 'boolean' },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['pretty', 'compact'] },
  ]

  return (
    <TwoColumn<JsonSortInput, JsonSortOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ descending: false, format: 'pretty' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
