import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { MinifyInput, MinifyOptions } from './schema'

const EXAMPLE: MinifyInput = {
  text: '{\n  "name": "工具库",\n  "tools": 870,\n  "local": true\n}',
}

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<MinifyOptions>[] = [
    { key: 'sortKeys', label: t('option.sortKeys'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<MinifyInput, MinifyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ sortKeys: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
