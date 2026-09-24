import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SentimentInput, SentimentOptions } from './schema'

const EXAMPLE: SentimentInput = {
  text: 'This toolbox is great and fast. But the settings are confusing and slow.',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<SentimentOptions>[] = [
    { key: 'language', label: t('option.language'), kind: 'select', values: ['auto', 'en', 'zh'] },
  ]

  return (
    <TwoColumn<SentimentInput, SentimentOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ language: 'auto' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
