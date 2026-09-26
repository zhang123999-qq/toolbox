import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonToPythonInput, JsonToPythonOptions } from './schema'

const EXAMPLE: JsonToPythonInput = {
  text: '{"userId":1,"userName":"工具库","tags":["json","py"],"profile":{"isVip":true},"note":null}',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<JsonToPythonOptions>[] = [
    {
      key: 'style',
      label: t('option.style'),
      kind: 'select',
      values: ['dataclass', 'pydantic', 'typedict'],
    },
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['snake', 'keep'] },
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['2', '4', 'tab'] },
  ]

  return (
    <TwoColumn<JsonToPythonInput, JsonToPythonOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ style: 'dataclass', mode: 'snake', indent: '4' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
