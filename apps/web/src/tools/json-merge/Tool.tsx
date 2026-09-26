import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonMergeInput, JsonMergeOptions } from './schema'

const EXAMPLE: JsonMergeInput = {
  text: '{\n  "name": "工具库",\n  "tools": 870,\n  "flags": { "static": true }\n}',
  textB: '{\n  "tools": 871,\n  "flags": { "dark": true }\n}',
}

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<JsonMergeOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['deep', 'shallow'] },
    { key: 'prefer', label: t('option.prefer'), kind: 'select', values: ['override', 'base'] },
  ]

  return (
    <TwoColumn<JsonMergeInput, JsonMergeOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ mode: 'deep', prefer: 'override' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('tool.otherText') }]}
    />
  )
}
