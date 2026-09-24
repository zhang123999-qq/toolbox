import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TextTruncateInput, TextTruncateOptions } from './schema'

const EXAMPLE: TextTruncateInput = {
  text: '这是一段比较长的示例文本，用来演示按字数截断之后会自动补上省略号的效果。',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextTruncateOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['chars', 'words', 'lines'] },
    { key: 'limit', label: t('option.limit'), kind: 'select', values: [20, 50, 100, 200] },
    { key: 'ellipsis', label: t('option.ellipsis'), kind: 'text' },
  ]

  return (
    <TwoColumn<TextTruncateInput, TextTruncateOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'chars', limit: '20', ellipsis: '…' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
