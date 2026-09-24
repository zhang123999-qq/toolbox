import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { WordFrequencyInput, WordFrequencyOptions } from './schema'

const EXAMPLE: WordFrequencyInput = {
  text: '工具库里的工具都在浏览器本地运行，工具的数据不会上传。',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<WordFrequencyOptions>[] = [
    { key: 'topN', label: t('option.topN'), kind: 'select', values: [10, 20, 50] },
    { key: 'ignoreCase', label: t('option.ignoreCase'), kind: 'boolean' },
    { key: 'useStopWords', label: t('option.useStopWords'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<WordFrequencyInput, WordFrequencyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ topN: '10', ignoreCase: true, useStopWords: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
