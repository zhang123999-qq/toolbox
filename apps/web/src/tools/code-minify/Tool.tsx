import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CodeMinifyInput, CodeMinifyOptions } from './schema'

const EXAMPLE: CodeMinifyInput = {
  text: ['function add(a, b) {', '  // 两行数之和', '  return a + b;', '}', '/* 模块结束 */'].join(
    '\n',
  ),
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<CodeMinifyOptions>[] = [
    { key: 'language', label: t('option.language'), kind: 'select', values: ['js', 'css', 'html'] },
  ]

  return (
    <TwoColumn<CodeMinifyInput, CodeMinifyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ language: 'js' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
