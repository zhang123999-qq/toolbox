import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { flip, hashSeed, mulberry32, transform } from './utils'
import type { CoinSide } from './utils'
import type { CoinInput, CoinOptions } from './schema'

/** 示例：抛 1 次硬币 */
const EXAMPLE: CoinInput = { text: '1' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
/** 抛掷序列在页面上最多展示的个数：再多只看统计，避免渲染上万个节点 */
const MAX_VISIBLE_SIDES = 200
/** 翻转动画时长（ms）：纯 CSS keyframes 3D 翻转，不引入动画库 */
const FLIP_DURATION_MS = 1200

export default function Tool() {
  const t = useTranslate()
  // 每次挂载换一个盐：相同参数下「显示 / 复制 / 下载」结果一致
  const [salt] = useState(() => Math.floor(Math.random() * 0x7fffffff))
  // 抛掷序号：点「抛硬币」即 +1，触发新的随机结果与 CSS 翻转动画
  const [nonce, setNonce] = useState(0)

  /** 确定性随机源工厂：相同 (salt, nonce, 输入) 产出相同序列 */
  function makeRand(input: CoinInput) {
    return mulberry32(hashSeed([salt, nonce, input.text].join('|')))
  }

  function sideLabel(side: CoinSide): string {
    return side === 'heads' ? t('coin.heads') : t('coin.tails')
  }

  function renderResult(input: CoinInput, options: CoinOptions) {
    try {
      const outcome = flip(input, options, makeRand(input))
      const lastSide = outcome.sides[outcome.sides.length - 1]
      const visibleSides = outcome.sides.slice(0, MAX_VISIBLE_SIDES)
      return (
        <div className="flex flex-col items-center">
          <style>{`@keyframes coin-flip {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(1800deg); }
}
.coin-flip { animation: coin-flip ${FLIP_DURATION_MS}ms ease-out; transform-style: preserve-3d; }`}</style>
          <button
            type="button"
            data-testid="flip"
            className="mb-4 rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={() => setNonce((n) => n + 1)}
          >
            {t('coin.flip')}
          </button>
          {/* 大硬币：key 随抛掷序号变化而重挂载，翻转动画每次重播；落定显示最后一次结果 */}
          <div style={{ perspective: '600px' }}>
            <div
              key={nonce}
              data-testid="coin-face"
              data-round={nonce}
              className="coin-flip flex h-32 w-32 items-center justify-center rounded-full border-4 border-amber-300 bg-gradient-to-br from-amber-200 to-amber-400 text-4xl font-bold text-amber-900 shadow-lg"
            >
              {sideLabel(lastSide)}
            </div>
          </div>
          <p className="mt-4 text-sm tabular-nums text-slate-600 dark:text-slate-300">
            {t('coin.headsCount', { count: outcome.tally.heads })}，
            {t('coin.tailsCount', { count: outcome.tally.tails })}
          </p>
          {outcome.count > 1 && (
            <div
              data-testid="coin-sequence"
              className="mt-3 flex max-w-full flex-wrap justify-center gap-1.5"
            >
              {visibleSides.map((side, index) => (
                <span
                  key={index}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    side === 'heads'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {sideLabel(side)}
                </span>
              ))}
            </div>
          )}
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
    <MultiPanel<CoinInput, CoinOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={renderResult}
      toText={(input, options) => transform(input, options, makeRand(input), t)}
      downloadExt="txt"
    />
  )
}
