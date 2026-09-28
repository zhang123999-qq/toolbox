import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { BlobGenInput, BlobGenOptions } from './schema'

/** 示例：以 hello 为种子 */
const EXAMPLE: BlobGenInput = { text: 'hello' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

export default function Tool() {
  // 每次挂载换一个盐：相同参数下「显示 / 复制 / 下载」结果一致
  const [salt] = useState(() => Math.floor(Math.random() * 0x7fffffff))

  const optionDefs: readonly OptionDef<BlobGenOptions>[] = [
    { key: 'complexity', label: '复杂度', kind: 'text', placeholder: '5' },
    { key: 'smoothness', label: '平滑度', kind: 'text', placeholder: '0.5' },
    { key: 'fillColor', label: '填充色(留空随机)', kind: 'text', placeholder: '' },
    { key: 'strokeColor', label: '描边色', kind: 'text', placeholder: '#333333' },
    { key: 'strokeWidth', label: '描边宽度', kind: 'text', placeholder: '0' },
  ]

  function renderOutput(input: BlobGenInput, options: BlobGenOptions) {
    try {
      const svg = transform(input, options, salt)
      return <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
    } catch (e) {
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<BlobGenInput, BlobGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        complexity: '5',
        smoothness: '0.5',
        fillColor: '',
        strokeColor: '#333333',
        strokeWidth: '0',
      }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={(input, options) => {
        try {
          return transform(input, options, salt)
        } catch {
          return ''
        }
      }}
      downloadExt="svg"
    />
  )
}
