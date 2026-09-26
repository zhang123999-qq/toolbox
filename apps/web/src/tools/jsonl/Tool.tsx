import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonlInput, JsonlOptions } from './schema'

const EXAMPLE: JsonlInput = {
  text: '{"id":1,"name":"工具库"}\n{"id":2,"name":"收纳盒"}',
}

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<JsonlOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['jsonl2json', 'json2jsonl', 'validate'],
    },
    { key: 'skipEmpty', label: t('option.skipEmpty'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<JsonlInput, JsonlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'jsonl2json', skipEmpty: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
