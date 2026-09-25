import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ChecksumInput, ChecksumOptions } from './schema'

/** 示例："hello" 的 8 位累加和是 0x14（104+101+108+108+111=532，mod 256 = 20） */
const EXAMPLE: ChecksumInput = { text: 'hello' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<ChecksumOptions>[] = [
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['sum8', 'sum16', 'sum32', 'xor8', 'mod256', 'luhn'],
    },
    { key: 'uppercase', label: t('option.uppercase'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<ChecksumInput, ChecksumOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ algorithm: 'sum8', uppercase: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
