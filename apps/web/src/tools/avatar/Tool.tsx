import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildAvatarSvg, randomSeed } from './utils'
import type { AvatarInput, AvatarOptions } from './schema'

/** 示例：张三 */
const EXAMPLE: AvatarInput = { text: '张三' }

const ERROR_CLASS =
  'rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'

export default function Tool() {
  // 挂载时取一次随机种子：空输入下「显示 / 复制 / 下载」结果一致
  const [seed] = useState(() => randomSeed())

  const optionDefs: readonly OptionDef<AvatarOptions>[] = [
    { key: 'size', label: '尺寸', kind: 'text', placeholder: '128' },
    { key: 'style', label: '样式', kind: 'select', values: ['initials', 'geometric', 'gradient'] },
    { key: 'bgColor', label: '背景色', kind: 'text', placeholder: '#ffffff' },
  ]

  return (
    <MultiPanel<AvatarInput, AvatarOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ size: '128', style: 'initials', bgColor: '' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(input, options) => {
        try {
          const svg = buildAvatarSvg(input, options, seed)
          return (
            <div className="flex justify-center p-4">
              <div data-testid="avatar-svg" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          )
        } catch (error) {
          return (
            <p role="alert" className={ERROR_CLASS}>
              {error instanceof Error ? error.message : String(error)}
            </p>
          )
        }
      }}
      toText={(input, options) => {
        try {
          return buildAvatarSvg(input, options, seed)
        } catch {
          return ''
        }
      }}
      downloadExt="svg"
    />
  )
}
