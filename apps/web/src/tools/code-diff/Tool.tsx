import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CodeDiffInput, CodeDiffOptions } from './schema'

const EXAMPLE: CodeDiffInput = {
  text: 'function add(a, b) {\n  return a - b\n}',
  textB: 'function add(a, b) {\n  // 修正：应为加法\n  return a + b\n}',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<CodeDiffOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['line', 'char'] },
  ]

  return (
    <TwoColumn<CodeDiffInput, CodeDiffOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ mode: 'line' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('tool.textB') }]}
    />
  )
}
