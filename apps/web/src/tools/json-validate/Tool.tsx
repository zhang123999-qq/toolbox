import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ValidateInput, ValidateOptions } from './schema'

const EXAMPLE: ValidateInput = {
  text: '{\n  "name": "工具库",\n  "tools": 870,\n  "tags": ["json", "static"]\n}',
}

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<ValidateOptions>[] = [
    { key: 'strict', label: t('option.strict'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<ValidateInput, ValidateOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ strict: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
