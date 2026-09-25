import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { RandomSaltInput, RandomSaltOptions } from './schema'

/** 输入框只作触发用：点「示例」把内容填成固定占位符，运行后即生成一条随机盐 */
const EXAMPLE: RandomSaltInput = { text: '生成随机盐' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<RandomSaltOptions>[] = [
    { key: 'length', label: t('option.length'), kind: 'select', values: ['16', '32', '64'] },
    {
      key: 'format',
      label: t('option.format'),
      kind: 'select',
      values: ['hex', 'base64', 'base64url'],
    },
  ]

  return (
    <TwoColumn<RandomSaltInput, RandomSaltOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ length: '16', format: 'hex' }}
      runAsync={transform}
      idleText={'点「运行」生成一条随机盐'}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
