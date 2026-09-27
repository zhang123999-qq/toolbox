import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { hashSeed, mulberry32, roll, transform } from './utils'
import type { DiceInput, DiceOptions } from './schema'

/** 示例：掷 2 个 6 面骰 */
const EXAMPLE: DiceInput = { text: '2', sides: '6' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
/** 6 面骰的点数符号：直观展示；其他面数显示数字 */
const DICE_PIPS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
/** 掷骰抖动动画时长（ms）：纯 CSS keyframes，不引入动画库 */
const SHAKE_DURATION_MS = 600

export default function Tool() {
  const t = useTranslate()
  // 每次挂载换一个盐：相同参数下「显示 / 复制 / 下载」结果一致
  const [salt] = useState(() => Math.floor(Math.random() * 0x7fffffff))
  // 掷骰序号：点「掷骰子」即 +1，触发新的随机结果与 CSS 抖动动画
  const [nonce, setNonce] = useState(0)

  /** 确定性随机源工厂：相同 (salt, nonce, 输入) 产出相同序列 */
  function makeRand(input: DiceInput) {
    return mulberry32(hashSeed([salt, nonce, input.text, input.sides].join('|')))
  }

  function renderResult(input: DiceInput, options: DiceOptions) {
    try {
      const outcome = roll(input, options, makeRand(input))
      return (
        <div className="flex flex-col items-center">
          <style>{`@keyframes dice-shake {
  0% { transform: translate(0, 0) rotate(0deg); }
  20% { transform: translate(-6px, 4px) rotate(-18deg); }
  40% { transform: translate(5px, -5px) rotate(14deg); }
  60% { transform: translate(-4px, -3px) rotate(-10deg); }
  80% { transform: translate(3px, 2px) rotate(8deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
.dice-shake { animation: dice-shake ${SHAKE_DURATION_MS}ms ease-in-out; }`}</style>
          <button
            type="button"
            data-testid="roll"
            className="mb-4 rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={() => setNonce((n) => n + 1)}
          >
            {t('dice.roll')}
          </button>
          <div
            key={nonce}
            data-testid="dice-faces"
            data-round={nonce}
            className="dice-shake flex flex-wrap justify-center gap-3"
          >
            {outcome.rolls.map((value, index) => (
              <span
                key={index}
                className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-3xl font-bold text-slate-800 shadow dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                {outcome.sides === DICE_PIPS.length ? DICE_PIPS[value - 1] : value}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            {t('dice.result')}：
            <span className="font-mono tabular-nums">{outcome.rolls.join('、')}</span>
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('dice.total')}：<span className="tabular-nums">{outcome.total}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('dice.count')}：{outcome.count} · {t('dice.sides')}：{outcome.sides}
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
    <MultiPanel<DiceInput, DiceOptions>
      meta={meta}
      initialInput={{ text: '', sides: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={[{ key: 'sides', label: t('dice.extra.sides'), rows: 1 }]}
      renderOutput={renderResult}
      toText={(input, options) => transform(input, options, makeRand(input), t)}
      downloadExt="txt"
    />
  )
}
