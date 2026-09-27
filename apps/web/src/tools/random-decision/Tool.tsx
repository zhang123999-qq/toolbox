import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { decide, hashSeed, mulberry32, transform } from './utils'
import type { RandomDecisionInput, RandomDecisionOptions } from './schema'

/** 示例：4 个选项中抽 1 个（不允许重复） */
const EXAMPLE: RandomDecisionInput = { text: '看电影\n吃火锅\n去爬山\n打游戏', count: '1' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

export default function Tool() {
  const t = useTranslate()
  // 每次挂载换一个盐：相同参数下「显示 / 复制 / 下载」结果一致，改任一参数即重新抽取
  const [salt] = useState(() => Math.floor(Math.random() * 0x7fffffff))

  const optionDefs: readonly OptionDef<RandomDecisionOptions>[] = [
    { key: 'allowRepeat', label: t('randomDecision.option.allowRepeat'), kind: 'boolean' },
  ]

  /** 确定性随机源工厂：相同 (salt, 输入, 选项) 产出相同序列，保证显示与复制/下载一致 */
  function makeRand(input: RandomDecisionInput, options: RandomDecisionOptions) {
    return mulberry32(hashSeed([salt, input.text, input.count, options.allowRepeat].join('|')))
  }

  function renderResult(input: RandomDecisionInput, options: RandomDecisionOptions) {
    try {
      const result = decide(input, options, makeRand(input, options))
      if (!result) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      return (
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('randomDecision.result')}
          </p>
          <ol className="mt-2 space-y-2">
            {result.picked.map((item, index) => (
              <li
                key={index}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-lg font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
              >
                {item}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t('randomDecision.options')}：{result.optionCount} · {t('randomDecision.count')}：
            {result.count}
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
    <MultiPanel<RandomDecisionInput, RandomDecisionOptions>
      meta={meta}
      initialInput={{ text: '', count: '' }}
      initialOptions={{ allowRepeat: false }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'count', label: t('randomDecision.extra.count'), rows: 1 }]}
      renderOutput={renderResult}
      toText={(input, options) => transform(input, options, makeRand(input, options), t)}
      downloadExt="txt"
    />
  )
}
