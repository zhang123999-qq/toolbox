import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { generate, transform } from './utils'
import type { RandomNumberInput, RandomNumberOptions } from './schema'

/** 示例：在 1–100 内生成 5 个不重复整数 */
const EXAMPLE: RandomNumberInput = { text: '5', min: '1', max: '100', decimals: '0' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

export default function Tool() {
  const t = useTranslate()
  // 每次挂载换一个盐：相同参数下「显示 / 复制 / 下载」结果一致，
  // 改任一参数或重进页面即重新生成
  const [salt] = useState(() => Math.floor(Math.random() * 0x7fffffff))

  const optionDefs: readonly OptionDef<RandomNumberOptions>[] = [
    { key: 'unique', label: t('option.unique'), kind: 'boolean' },
  ]

  function renderResult(input: RandomNumberInput, options: RandomNumberOptions) {
    try {
      const numbers = generate(input, options, salt)
      if (numbers.length === 0) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      return (
        <div className="flex flex-wrap gap-2">
          {numbers.map((n, i) => (
            <span
              key={i}
              className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-sm tabular-nums dark:border-slate-700 dark:bg-slate-900"
            >
              {n}
            </span>
          ))}
        </div>
      )
    } catch (error) {
      return (
        <p role="alert" className={ERROR_CLASS}>
          {error instanceof Error ? error.message : String(error)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<RandomNumberInput, RandomNumberOptions>
      meta={meta}
      initialInput={{ text: '', min: '', max: '', decimals: '' }}
      initialOptions={{ unique: false }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'min', label: t('extra.min'), rows: 1 },
        { key: 'max', label: t('extra.max'), rows: 1 },
        { key: 'decimals', label: t('extra.decimals'), rows: 1 },
      ]}
      renderOutput={renderResult}
      toText={(input, options) => transform(input, options, salt)}
      downloadExt="txt"
    />
  )
}
