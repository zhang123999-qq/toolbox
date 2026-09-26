import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { MacInput, MacOptions } from './schema'

/** 示例：一个常见 OUI */
const EXAMPLE: MacInput = { text: 'B8:27:EB:12:34:56' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<MacOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['parse', 'generate'] },
  ]

  return (
    <TwoColumn<MacInput, MacOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'parse' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
