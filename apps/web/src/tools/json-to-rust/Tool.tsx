import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonToRustInput, JsonToRustOptions } from './schema'

const EXAMPLE: JsonToRustInput = {
  text: '{"userId":1,"userName":"工具库","tags":["json","rust"],"profile":{"isVip":true},"note":null}',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<JsonToRustOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['serde', 'plain'] },
    { key: 'style', label: t('option.style'), kind: 'select', values: ['snake', 'keep'] },
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['2', '4', 'tab'] },
  ]

  return (
    <TwoColumn<JsonToRustInput, JsonToRustOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'serde', style: 'snake', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
