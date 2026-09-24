import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { QueryInput, QueryOptions } from './schema'

const EXAMPLE: QueryInput = { text: 'name=%E5%B7%A5%E5%85%B7%E5%BA%93&tools=870&tag=a&tag=b' }

export default function Tool() {
  const t = useTranslate()

  const optionDefs: readonly OptionDef<QueryOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['parse', 'build'] },
    { key: 'sortKeys', label: t('option.sortKeys'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<QueryInput, QueryOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'parse', sortKeys: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
