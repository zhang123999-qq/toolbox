import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CodeBeautifyInput, CodeBeautifyOptions } from './schema'

const EXAMPLE: CodeBeautifyInput = {
  text: 'function add(a,b){return a+b;}const obj={name:"x",n:1};if(a){b();}',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<CodeBeautifyOptions>[] = [
    {
      key: 'language',
      label: t('option.language'),
      kind: 'select',
      values: ['js', 'css', 'html', 'json', 'sql'],
    },
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['2', '4', 'tab'] },
  ]

  return (
    <TwoColumn<CodeBeautifyInput, CodeBeautifyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ language: 'js', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
