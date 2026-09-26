import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonToTomlInput, JsonToTomlOptions } from './schema'

const EXAMPLE: JsonToTomlInput = {
  text: '{"id":1,"name":"工具库","active":true,"tags":["json","toml"],"meta":{"stars":870,"public":true},"servers":[{"host":"a","port":80},{"host":"b","port":443}],"note":null}',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<JsonToTomlOptions>[] = [
    { key: 'style', label: t('option.style'), kind: 'select', values: ['basic', 'literal'] },
  ]

  return (
    <TwoColumn<JsonToTomlInput, JsonToTomlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ style: 'basic' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
