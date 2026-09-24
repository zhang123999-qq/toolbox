import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { WhitespaceInput, WhitespaceOptions } from './schema'

const EXAMPLE: WhitespaceInput = { text: '  第一行  \n\n  第二行   有   多余空格  \n第三行' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<WhitespaceOptions>[] = [
    { key: 'trimLines', label: t('option.trimLines'), kind: 'boolean' },
    { key: 'collapse', label: t('option.collapse'), kind: 'boolean' },
    { key: 'removeEmpty', label: t('option.removeEmpty'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<WhitespaceInput, WhitespaceOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ trimLines: true, collapse: true, removeEmpty: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
