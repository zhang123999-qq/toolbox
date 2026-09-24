import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { MarkdownToHtmlInput, MarkdownToHtmlOptions } from './schema'

const EXAMPLE: MarkdownToHtmlInput = { text: '# 工具库\n\n本地优先，**870** 个工具。' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<MarkdownToHtmlOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['document', 'fragment'] },
  ]

  return (
    <TwoColumn<MarkdownToHtmlInput, MarkdownToHtmlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'document' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
