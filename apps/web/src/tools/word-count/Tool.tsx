import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { WordCountInput, WordCountOptions } from './schema'

const EXAMPLE: WordCountInput = { text: '工具库 toolbox\n共 870 个工具，全部在浏览器本地计算。' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<WordCountOptions>[] = [
    { key: 'countSpaces', label: t('option.countSpaces'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<WordCountInput, WordCountOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ countSpaces: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
