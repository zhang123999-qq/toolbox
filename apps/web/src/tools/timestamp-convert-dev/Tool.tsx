import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TimestampInput, TimestampOptions } from './schema'

/** 示例：2026-09-26 12:00:00 对应的时间戳 */
const EXAMPLE: TimestampInput = { text: '2026-09-26 12:00:00' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<TimestampOptions>[] = [
    { key: 'unit', label: t('option.unit'), kind: 'select', values: ['auto', 's', 'ms'] },
  ]

  return (
    <TwoColumn<TimestampInput, TimestampOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ unit: 'auto' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
