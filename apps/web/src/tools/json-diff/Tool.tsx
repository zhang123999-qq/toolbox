import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonDiffInput, JsonDiffOptions } from './schema'

const EXAMPLE: JsonDiffInput = {
  text: '{\n  "name": "工具库",\n  "tools": 870\n}',
  textB: '{\n  "name": "工具库",\n  "tools": 871\n}',
}

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<JsonDiffOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['line', 'char'] },
    { key: 'sortKeys', label: t('option.sortKeys'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<JsonDiffInput, JsonDiffOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ mode: 'line', sortKeys: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('tool.textB') }]}
    />
  )
}
