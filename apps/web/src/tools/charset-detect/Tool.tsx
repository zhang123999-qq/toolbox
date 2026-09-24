import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CharsetDetectInput, CharsetDetectOptions } from './schema'

const EXAMPLE: CharsetDetectInput = {
  text: 'ä¸­å\u008d\u008eäººæ°\u0091å\u0085±å\u0092\u008cå\u009b½ä¸­å\u008d\u008eäººæ°\u0091å\u0085±å\u0092\u008cå\u009b½',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<CharsetDetectOptions>[] = [
    { key: 'topN', label: t('option.topN'), kind: 'select', values: ['3', '5'] },
    { key: 'preview', label: t('option.preview'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<CharsetDetectInput, CharsetDetectOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ topN: '5', preview: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
