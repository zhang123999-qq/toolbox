import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CodeToImageInput, CodeToImageOptions } from './schema'

const EXAMPLE: CodeToImageInput = {
  text: 'const add = (a, b) => a + b;\n// 两行数之和\nadd(1, 2);',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<CodeToImageOptions>[] = [
    { key: 'theme', label: '主题', kind: 'select', values: ['dark', 'light'] },
    {
      key: 'language',
      label: t('option.language'),
      kind: 'select',
      values: ['js', 'css', 'html', 'plain'],
    },
    { key: 'fontSize', label: '字号', kind: 'select', values: ['12', '14', '16', '20'] },
  ]

  return (
    <TwoColumn<CodeToImageInput, CodeToImageOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ theme: 'dark', language: 'js', fontSize: '14' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
