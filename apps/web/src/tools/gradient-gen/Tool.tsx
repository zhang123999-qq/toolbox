import { useState } from 'react'
import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { transform } from './utils'
import type { GradientGenInput, GradientGenOptions } from './schema'
import { meta } from './meta'

/** 示例：粉红到靛蓝线性渐变 */
const EXAMPLE: GradientGenInput = { text: '#ff5b8a\n#6a5cff' }

export default function Tool() {
  // 每次挂载换一个盐：相同参数下「显示 / 复制 / 下载」结果一致
  const [salt] = useState(() => Math.floor(Math.random() * 0x7fffffff))

  const optionDefs: readonly OptionDef<GradientGenOptions>[] = [
    { key: 'type', label: '渐变类型', kind: 'select', values: ['linear', 'radial', 'conic'] },
    { key: 'angle', label: '角度', kind: 'text', placeholder: '135' },
    { key: 'shape', label: '径向形状', kind: 'select', values: ['circle', 'ellipse'] },
  ]

  return (
    <TwoColumn<GradientGenInput, GradientGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ type: 'linear', angle: '135', shape: 'ellipse' }}
      run={(input, options) => transform(input, options, salt)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
