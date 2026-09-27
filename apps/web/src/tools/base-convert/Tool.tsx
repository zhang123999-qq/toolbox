import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { BaseConvertInput, BaseConvertOptions } from './schema'

const BASES = ['2', '8', '10', '16', '32', '36'] as const

/** 示例：255（10 进制）→ 16 进制 */
const EXAMPLE: BaseConvertInput = { text: '255' }

export default function Tool() {
  // 选项标签固定中文（与 age 的 extraInputs 标签做法一致）
  const optionDefs: readonly OptionDef<BaseConvertOptions>[] = [
    { key: 'from', label: '从', kind: 'select', values: BASES },
    { key: 'to', label: '到', kind: 'select', values: BASES },
  ]

  return (
    <TwoColumn<BaseConvertInput, BaseConvertOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: '10', to: '16' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
