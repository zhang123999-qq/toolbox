import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonToYamlInput, JsonToYamlOptions } from './schema'

const EXAMPLE: JsonToYamlInput = {
  text: '{"id":1,"name":"工具库","active":true,"tags":["json","yaml"],"meta":{"stars":870},"items":[{"a":1},{"a":2}],"note":null}',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<JsonToYamlOptions>[] = [
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['2', '4'] },
    { key: 'quote', label: t('option.quote'), kind: 'select', values: ['needed', 'all'] },
  ]

  return (
    <TwoColumn<JsonToYamlInput, JsonToYamlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ indent: '2', quote: 'needed' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
