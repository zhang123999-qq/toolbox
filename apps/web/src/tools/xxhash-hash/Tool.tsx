import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { XxhashInput, XxhashOptions } from './schema'

/** 示例：与单元测试同一份输入，便于对照 */
const EXAMPLE: XxhashInput = { text: 'hello' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<XxhashOptions>[] = [
    { key: 'bits', label: t('option.bits'), kind: 'select', values: ['32', '64'] },
    { key: 'uppercase', label: t('option.uppercase'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<XxhashInput, XxhashOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ bits: '32', uppercase: false }}
      runAsync={transform}
      idleText={'填好内容后点「运行」（首次会加载 xxHash 的 WASM）'}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
