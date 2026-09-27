import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { RandomGroupInput, RandomGroupOptions } from './schema'

/** 示例：6 人分 2 组（分组数走选项默认值 '2'） */
const EXAMPLE: RandomGroupInput = { text: '张三\n李四\n王五\n赵六\n钱七\n孙八' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<RandomGroupOptions>[] = [
    { key: 'groups', label: t('randomGroup.groups'), kind: 'text', placeholder: '2' },
  ]

  return (
    <TwoColumn<RandomGroupInput, RandomGroupOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ groups: '2' }}
      run={(input, options) => transform(input, options, t)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
