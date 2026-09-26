import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonTreeInput, JsonTreeOptions } from './schema'

const EXAMPLE: JsonTreeInput = {
  text: '{\n  "name": "工具库",\n  "tools": 870,\n  "tags": ["json", "static"]\n}',
}

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<JsonTreeOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['tree', 'path'] },
    { key: 'sortKeys', label: t('option.sortKeys'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<JsonTreeInput, JsonTreeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'tree', sortKeys: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
