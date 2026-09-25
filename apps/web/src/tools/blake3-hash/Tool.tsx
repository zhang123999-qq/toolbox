import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { Blake3Input, Blake3Options } from './schema'

/** 示例：与官方测试向量一致的 "hello" */
const EXAMPLE: Blake3Input = { text: 'hello' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<Blake3Options>[] = [
    { key: 'length', label: t('option.length'), kind: 'select', values: ['32', '64'] },
    { key: 'uppercase', label: t('option.uppercase'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<Blake3Input, Blake3Options>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ length: '32', uppercase: false }}
      runAsync={transform}
      idleText={'填好内容后点「运行」（首次会加载 BLAKE3 的 WASM）'}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
