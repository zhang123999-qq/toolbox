import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { MockApiDevInput, MockApiDevOptions } from './schema'

const EXAMPLE: MockApiDevInput = {
  text: 'id:id, name:string, email:email, age:number, active:boolean, signupDate:date',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<MockApiDevOptions>[] = [
    { key: 'count', label: t('option.count'), kind: 'select', values: ['1', '5', '10', '50'] },
    {
      key: 'target',
      label: '输出形态',
      kind: 'select',
      values: ['plain-json', 'express', 'json-server'],
    },
  ]

  return (
    <TwoColumn<MockApiDevInput, MockApiDevOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ count: '5', target: 'plain-json' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
