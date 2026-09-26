import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BigJsonInput, BigJsonOptions } from './schema'

const EXAMPLE: BigJsonInput = {
  text: '{\n  "name": "工具库",\n  "metrics": { "tools": 870, "stars": [12, 34] },\n  "tags": ["json", "static"]\n}',
}

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<BigJsonOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['stats', 'paths', 'error'] },
    { key: 'topN', label: t('option.topN'), kind: 'select', values: ['10', '25', '50'] },
  ]

  return (
    <TwoColumn<BigJsonInput, BigJsonOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'stats', topN: '25' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
