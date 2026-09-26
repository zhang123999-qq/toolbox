import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ComplexityInput, ComplexityOptions } from './schema'

const EXAMPLE: ComplexityInput = {
  text: `function classify(score) {
  if (score < 0) return 'bad'
  if (score < 5 && score > 0) return 'ok'
  else if (score < 10) return 'mid'
  for (let i = 0; i < score; i++) {
    if (i % 2 === 0 && i > 3) return 'even'
  }
  try { risky() } catch (e) { return 'err' }
  return score > 10 ? 'high' : 'mid'
}`,
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<ComplexityOptions>[] = [
    {
      key: 'language',
      label: t('option.language'),
      kind: 'select',
      values: ['javascript', 'typescript', 'python'],
    },
  ]

  return (
    <TwoColumn<ComplexityInput, ComplexityOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ language: 'javascript' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="粘贴 JS / TS / Python 代码，统计圈复杂度与函数级评级"
    />
  )
}
