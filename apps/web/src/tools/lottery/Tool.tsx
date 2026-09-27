import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { draw, hashSeed, mulberry32, transform } from './utils'
import type { LotteryInput, LotteryOptions } from './schema'

/** 示例：5 人名单中不放回抽 2 人 */
const EXAMPLE: LotteryInput = { text: '张三\n李四\n王五\n赵六\n钱七', count: '2' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

export default function Tool() {
  const t = useTranslate()
  // 每次挂载换一个盐：相同参数下「显示 / 复制 / 下载」结果一致，改任一参数即重新抽签
  const [salt] = useState(() => Math.floor(Math.random() * 0x7fffffff))

  const optionDefs: readonly OptionDef<LotteryOptions>[] = [
    { key: 'withReplacement', label: t('lottery.option.withReplacement'), kind: 'boolean' },
  ]

  /** 确定性随机源工厂：相同 (salt, 输入, 选项) 产出相同序列，保证显示与复制/下载一致 */
  function makeRand(input: LotteryInput, options: LotteryOptions) {
    return mulberry32(hashSeed([salt, input.text, input.count, options.withReplacement].join('|')))
  }

  function renderResult(input: LotteryInput, options: LotteryOptions) {
    try {
      const result = draw(input, options, makeRand(input, options))
      if (!result) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      return (
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('lottery.result')}
          </p>
          <ol className="mt-2 space-y-2">
            {result.winners.map((name, index) => (
              <li
                key={index}
                className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <span className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                  {name}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t('lottery.pool')}：{result.poolSize} · {t('lottery.count')}：{result.count}
          </p>
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
    <MultiPanel<LotteryInput, LotteryOptions>
      meta={meta}
      initialInput={{ text: '', count: '' }}
      initialOptions={{ withReplacement: false }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'count', label: t('lottery.extra.count'), rows: 1 }]}
      renderOutput={renderResult}
      toText={(input, options) => transform(input, options, makeRand(input, options), t)}
      downloadExt="txt"
    />
  )
}
